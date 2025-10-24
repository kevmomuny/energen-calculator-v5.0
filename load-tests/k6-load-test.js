/**
 * K6 Load Testing Script for Energen Calculator v5.0
 * 
 * Installation:
 * 1. Install K6: https://k6.io/docs/get-started/installation/
 * 2. Run: k6 run load-tests/k6-load-test.js
 * 
 * Test Scenarios:
 * - Smoke test: Verify basic functionality
 * - Load test: Normal expected load
 * - Stress test: Push beyond normal capacity
 * - Spike test: Sudden traffic increase
 * - Soak test: Extended duration testing
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const calculationDuration = new Trend('calculation_duration')
const cacheHitRate = new Rate('cache_hits')

// Test configuration
export const options = {
  scenarios: {
    // Smoke test: 1 user for 1 minute
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' }
    },
    
    // Load test: Ramp up to 50 users over 5 minutes
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'load' }
    },
    
    // Stress test: Push to 100 users
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' }
    },
    
    // Spike test: Sudden jump to 100 users
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 }
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'spike' }
    }
  },
  
  thresholds: {
    http_req_failed: ['rate<0.1'], // Error rate < 10%
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    errors: ['rate<0.1'], // Custom error rate < 10%
    calculation_duration: ['p(95)<1500'] // 95% calculations < 1.5s
  }
}

// Test data generator
function generateTestData() {
  const services = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const selectedServices = services.slice(0, Math.floor(Math.random() * 3) + 1)
  
  return {
    kw: 50 + Math.floor(Math.random() * 450), // 50-500 kW
    distance: Math.floor(Math.random() * 100), // 0-100 miles
    services: selectedServices,
    customerInfo: {
      name: `Test Company ${Math.floor(Math.random() * 1000)}`,
      address: '123 Test Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94115'
    },
    generators: [{
      kw: 150,
      quantity: 1
    }],
    contractLength: 12,
    taxRate: 0.0875
  }
}

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002'

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`)
  check(healthRes, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check returns valid JSON': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === 'healthy'
      } catch (e) {
        return false
      }
    }
  })
  
  // Main calculation test
  const payload = JSON.stringify(generateTestData())
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
    tags: {
      name: 'calculate_quote'
    }
  }
  
  const startTime = new Date()
  const calcRes = http.post(`${BASE_URL}/api/calculate`, payload, params)
  const duration = new Date() - startTime
  
  calculationDuration.add(duration)
  
  // Check response
  const success = check(calcRes, {
    'Calculation status is 200': (r) => r.status === 200,
    'Calculation returns success': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success === true
      } catch (e) {
        return false
      }
    },
    'Calculation returns total': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.total > 0
      } catch (e) {
        return false
      }
    },
    'Response time < 2s': (r) => r.timings.duration < 2000
  })
  
  // Track errors
  errorRate.add(!success)
  
  // Check if response was from cache
  if (calcRes.headers['X-Cache-Hit'] === 'true') {
    cacheHitRate.add(1)
  } else {
    cacheHitRate.add(0)
  }
  
  // Test tax rate endpoint
  const taxRes = http.get(`${BASE_URL}/api/tax-rate?zip=94115&city=San Francisco`)
  check(taxRes, {
    'Tax rate status is 200': (r) => r.status === 200
  })
  
  // Random sleep between requests (0.5-2 seconds)
  sleep(0.5 + Math.random() * 1.5)
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  }
}

function textSummary(data, options) {
  return `
Load Test Results Summary
=========================
Total Requests: ${data.metrics.http_reqs.values.count}
Success Rate: ${(100 - (data.metrics.http_req_failed.values.rate * 100)).toFixed(2)}%
Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%
Cache Hit Rate: ${(data.metrics.cache_hits.values.rate * 100).toFixed(2)}%

Response Times:
- Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

Calculation Performance:
- Average: ${data.metrics.calculation_duration.values.avg.toFixed(2)}ms
- P95: ${data.metrics.calculation_duration.values['p(95)'].toFixed(2)}ms
`
}