/**
 * map-services-to-energen.cjs - Service Mapping Script
 *
 * Maps extracted RFP services to Energen ServiceA-J categories
 * using the ServiceMappingEngine
 *
 * Features:
 * - Intelligent keyword matching
 * - Frequency-based classification
 * - Confidence scoring
 * - Alternative suggestions
 * - Manual review flagging
 *
 * Usage:
 *   const mapServices = require('./map-services-to-energen.cjs');
 *   const mapping = await mapServices(extractedServices);
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { ServiceMappingEngine } = require('../../../../modules/rfp-processor/ServiceMappingEngine.cjs');

/**
 * Map extracted services to Energen categories
 */
async function mapServicesToEnergen(extractedServices) {
  console.log(`   Mapping ${extractedServices.length} services...`);

  // Initialize mapping engine
  const mapper = new ServiceMappingEngine({
    confidenceThreshold: 0.75,
    minKeywordScore: 0.3,
    debugMode: false
  });

  // Map all services
  const mappedServices = [];
  let highConfidenceCount = 0;
  let needsReviewCount = 0;

  for (let i = 0; i < extractedServices.length; i++) {
    const service = extractedServices[i];

    // Handle various service formats from extraction
    const description = service.description || service.name || service.rawText || '';
    const frequency = service.frequency || '';

    if (!description) {
      console.log(`   ⚠️  Service ${i + 1}: No description, skipping`);
      continue;
    }

    try {
      const mapping = mapper.mapService(description, frequency, service);

      // Track statistics
      if (mapping.confidence >= 0.80) {
        highConfidenceCount++;
      }
      if (mapping.requiresReview) {
        needsReviewCount++;
      }

      // Enhance mapping with original service data
      const enhancedMapping = {
        ...mapping,
        originalData: {
          description: service.description,
          frequency: service.frequency,
          details: service.details,
          quantity: service.quantity,
          rawText: service.rawText
        },
        estimatedLaborHours: estimateLaborHours(mapping.mappedTo, service.quantity),
        frequencyPerYear: parseFrequency(frequency)
      };

      mappedServices.push(enhancedMapping);

      // Log progress
      const status = mapping.requiresReview ? '⚠️' : '✅';
      console.log(`   ${status} ${i + 1}/${extractedServices.length}: ${description.substring(0, 50)}... → ${mapping.mappedTo} (${(mapping.confidence * 100).toFixed(0)}%)`);

    } catch (error) {
      console.log(`   ❌ Service ${i + 1}: Mapping failed - ${error.message}`);
      mappedServices.push({
        originalService: description,
        mappedTo: 'ServiceK',
        mappedName: 'Custom Service',
        confidence: 0,
        requiresReview: true,
        error: error.message
      });
    }
  }

  // Generate summary report
  const summary = {
    totalServices: mappedServices.length,
    highConfidence: highConfidenceCount,
    mediumConfidence: mappedServices.filter(m => m.confidence >= 0.60 && m.confidence < 0.80).length,
    lowConfidence: mappedServices.filter(m => m.confidence < 0.60).length,
    requiresReview: needsReviewCount,
    avgConfidence: mappedServices.reduce((sum, m) => sum + (m.confidence || 0), 0) / mappedServices.length
  };

  // Group by service category
  const byCategory = {};
  mappedServices.forEach(m => {
    if (!byCategory[m.mappedTo]) {
      byCategory[m.mappedTo] = {
        name: m.mappedName,
        count: 0,
        services: [],
        avgConfidence: 0,
        totalLaborHours: 0
      };
    }

    byCategory[m.mappedTo].count++;
    byCategory[m.mappedTo].services.push(m.originalService);
    byCategory[m.mappedTo].totalLaborHours += m.estimatedLaborHours || 0;
  });

  // Calculate average confidence per category
  Object.keys(byCategory).forEach(category => {
    const categoryServices = mappedServices.filter(m => m.mappedTo === category);
    byCategory[category].avgConfidence = categoryServices.reduce((sum, m) => sum + m.confidence, 0) / categoryServices.length;
  });

  // Identify services needing review
  const needsReview = mappedServices.filter(m => m.requiresReview);

  return {
    mappedServices,
    summary,
    byCategory,
    needsReview,
    stats: mapper.getStats()
  };
}

/**
 * Estimate labor hours per service
 */
function estimateLaborHours(serviceCode, quantity = 1) {
  const baseHours = {
    ServiceA: 1.5,   // Comprehensive Inspection
    ServiceB: 2.5,   // Oil & Filter
    ServiceC: 3.0,   // Coolant Service
    ServiceD: 1.0,   // Fluid Analysis
    ServiceE: 4.0,   // Load Bank Testing
    ServiceF: 4.5,   // Diesel Tune-Up
    ServiceG: 4.0,   // Gas Tune-Up
    ServiceH: 6.0,   // Electrical Testing
    ServiceI: 2.0,   // Transfer Switch
    ServiceJ: 1.5,   // Thermal Imaging
    ServiceK: 3.0    // Custom
  };

  const numQuantity = parseInt(quantity) || 1;
  return (baseHours[serviceCode] || 3.0) * numQuantity;
}

/**
 * Parse frequency to annual occurrences
 */
function parseFrequency(frequency) {
  if (!frequency) return null;

  const freqLower = frequency.toLowerCase();

  if (freqLower.includes('weekly')) return 52;
  if (freqLower.includes('biweekly') || freqLower.includes('bi-weekly')) return 26;
  if (freqLower.includes('monthly')) return 12;
  if (freqLower.includes('quarterly')) return 4;
  if (freqLower.includes('semi-annual') || freqLower.includes('twice')) return 2;
  if (freqLower.includes('annual') || freqLower.includes('yearly')) return 1;

  // Look for numeric patterns
  const match = freqLower.match(/(\d+)\s*(times?|x)?\s*(per|\/)\s*(year|annually)/);
  if (match) return parseInt(match[1]);

  return null;
}

/**
 * Calculate estimated annual cost (if pricing data available)
 */
function estimateAnnualCost(mapping, hourlyRate = 125) {
  const hoursPerService = mapping.estimatedLaborHours || 3;
  const frequency = mapping.frequencyPerYear || 1;

  return hoursPerService * frequency * hourlyRate;
}

// CLI execution
if (require.main === module) {
  const servicesPath = process.argv[2];

  if (!servicesPath) {
    console.error('Usage: node map-services-to-energen.cjs <extraction.json>');
    process.exit(1);
  }

  let services = [];

  try {
    const data = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));

    // Handle different input formats
    if (Array.isArray(data)) {
      services = data;
    } else if (data.services && Array.isArray(data.services)) {
      services = data.services;
    } else if (data.extraction?.services) {
      services = data.extraction.services;
    } else {
      throw new Error('Could not find services array in input file');
    }

    if (services.length === 0) {
      throw new Error('No services found in input file');
    }

  } catch (error) {
    console.error('❌ Error reading input file:', error.message);
    process.exit(1);
  }

  mapServicesToEnergen(services)
    .then(mapping => {
      console.log('\n📊 Service Mapping Results:\n');
      console.log(`   Total Services: ${mapping.summary.totalServices}`);
      console.log(`   High Confidence: ${mapping.summary.highConfidence} (≥80%)`);
      console.log(`   Medium Confidence: ${mapping.summary.mediumConfidence} (60-79%)`);
      console.log(`   Low Confidence: ${mapping.summary.lowConfidence} (<60%)`);
      console.log(`   Needs Review: ${mapping.summary.requiresReview}`);
      console.log(`   Avg Confidence: ${(mapping.summary.avgConfidence * 100).toFixed(1)}%\n`);

      console.log('   By Category:');
      Object.entries(mapping.byCategory).forEach(([code, data]) => {
        console.log(`     ${code}: ${data.count} service(s) - ${(data.avgConfidence * 100).toFixed(0)}% confidence`);
      });

      const outputPath = path.join(path.dirname(servicesPath), 'service-mapping.json');
      fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2), 'utf8');
      console.log(`\n✅ Saved to: ${outputPath}`);

      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = mapServicesToEnergen;
