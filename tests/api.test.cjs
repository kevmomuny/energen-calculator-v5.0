/**
 * Integration tests for API endpoints
 */

const request = require('supertest')
const { app, server } = require('../src/api/server-secure.cjs')

describe('API Endpoints', () => {

  afterAll((done) => {
    server.close(done)
  })
  
  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      expect(response.body.status).toBe('healthy')
      expect(response.body.version).toBe('5.0.0')
      expect(response.body.timestamp).toBeDefined()
      expect(response.body.services).toBeDefined()
    })
  })
  
  describe('POST /api/calculate', () => {
    test('should calculate quote with valid input', async () => {
      const validInput = {
        services: ['A'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }
      
      const response = await request(app)
        .post('/api/calculate')
        .send(validInput)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(parseFloat(response.body.calculation.total)).toBeGreaterThan(0)
      expect(response.body.calculation.serviceBreakdown).toBeDefined()
    })
    
    test('should reject invalid input', async () => {
      const invalidInput = {
        kw: -100, // Invalid negative kW
        services: [] // Empty services array
      }
      
      const response = await request(app)
        .post('/api/calculate')
        .send(invalidInput)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })
    
    test('should enforce rate limiting', async () => {
      const validInput = {
        kw: 150,
        distance: 30,
        services: ['A'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }
      
      // Make multiple requests to trigger rate limit
      const requests = []
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/calculate')
            .send(validInput)
        )
      }
      
      const responses = await Promise.all(requests)
      
      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429)
      expect(rateLimited).toBe(true)
    }, 20000) // Extended timeout for rate limit test
  })
  
  describe('GET /api/tax-rate', () => {
    test('should validate ZIP code format', async () => {
      const response = await request(app)
        .get('/api/tax-rate')
        .query({ zip: 'invalid' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('ZIP')
    })

    test('should return tax rate for valid ZIP', async () => {
      const response = await request(app)
        .get('/api/tax-rate')
        .query({
          address: '123 Main St',
          city: 'San Francisco',
          zip: '94115'
        })

      expect(response.status).toBeLessThan(500)
      if (response.status === 200) {
        expect(response.body.success).toBe(true)
        expect(response.body.rate).toBeDefined()
        expect(response.body.ratePercent).toBeGreaterThan(0)
      }
    })
  })
  
  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
      
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['x-xss-protection']).toBe('0')
      expect(response.headers['strict-transport-security']).toBeDefined()
    })
  })
  
  describe('CORS', () => {
    test('should allow requests from whitelisted origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5176')
      
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5176')
    })
    
    test('should reject requests from non-whitelisted origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
      
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })
  })
  
  describe('404 Handler', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404)
      
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('not found')
    })
  })
})