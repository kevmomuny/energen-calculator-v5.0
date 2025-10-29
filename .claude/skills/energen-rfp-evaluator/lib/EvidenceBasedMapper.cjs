/**
 * EvidenceBasedMapper.cjs - Evidence-Based Service Mapping with Validation
 *
 * Maps RFP service requirements to Energen services with:
 * - Service definition comparison
 * - Source text validation
 * - Frequency sanity checks
 * - Pricing reasonableness validation
 * - Evidence preservation
 *
 * @version 2.0.0
 */

const path = require('path');

// Energen service definitions for comparison
const SERVICE_CATALOG = {
  'A': {
    code: 'A',
    name: 'Comprehensive Inspection',
    description: 'Visual inspection, gauges check, battery test, wiring check, equipment mounting, coolant/oil level check. No fluid changes.',
    keywords: ['inspection', 'check', 'visual', 'gauges', 'battery test', 'wiring', 'NFPA 110'],
    typicalFrequency: 4, // Quarterly
    typicalLaborHours: 2,
    excludes: ['oil change', 'filter change', 'coolant flush', 'load test']
  },
  'B': {
    code: 'B',
    name: 'Oil & Filter Service',
    description: 'Drain crankcase oil, replace with new oil, replace oil filters, oil sampling for analysis',
    keywords: ['oil change', 'oil filter', 'drain oil', 'replace oil', 'oil service', 'filter replacement'],
    typicalFrequency: 1, // Annual
    typicalLaborHours: 4,
    includes: ['oil', 'filter']
  },
  'C': {
    code: 'C',
    name: 'Coolant Service',
    description: 'Coolant flush/replacement, test coolant condition, hose/belt inspection and replacement',
    keywords: ['coolant', 'antifreeze', 'hoses', 'belts', 'coolant service', 'flush coolant'],
    typicalFrequency: 1, // Annual
    typicalLaborHours: 3,
    includes: ['coolant', 'hoses', 'belts']
  },
  'D': {
    code: 'D',
    name: 'Oil, Fuel & Coolant Analysis',
    description: 'Laboratory testing of oil, fuel, and coolant samples for wear, contamination, and condition',
    keywords: ['analysis', 'sample', 'testing', 'laboratory', 'fluid analysis', 'oil analysis', 'fuel analysis'],
    typicalFrequency: 4, // Quarterly
    typicalLaborHours: 0.5,
    includes: ['sample', 'analysis']
  },
  'E': {
    code: 'E',
    name: 'Load Bank Testing',
    description: 'Full load test with resistive load bank at 100% rated load for 2+ hours',
    keywords: ['load bank', 'load test', 'full load', '100% load', 'resistive load', 'two hour'],
    typicalFrequency: 1, // Annual
    typicalLaborHours: 6,
    includes: ['load bank', 'load test']
  },
  'F': {
    code: 'F',
    name: 'Engine Tune-Up (Diesel)',
    description: 'Diesel engine tune-up, fuel injector service, air filter replacement, valve adjustment',
    keywords: ['tune-up', 'tune up', 'injector', 'valve adjustment', 'diesel tune'],
    typicalFrequency: 1,
    typicalLaborHours: 8,
    includes: ['injector', 'valve']
  },
  'G': {
    code: 'G',
    name: 'Gas Engine Tune-Up',
    description: 'Gas engine tune-up, spark plug replacement, air filter, fuel system service',
    keywords: ['spark plug', 'gas tune', 'tune-up', 'tune up', 'gas engine'],
    typicalFrequency: 1,
    typicalLaborHours: 6,
    includes: ['spark plug']
  },
  'H': {
    code: 'H',
    name: 'Generator Electrical Testing',
    description: 'Electrical testing including insulation resistance, exciter testing, AVR testing',
    keywords: ['electrical test', 'insulation', 'resistance', 'exciter', 'AVR', 'megger'],
    typicalFrequency: 0.2, // Every 5 years
    typicalLaborHours: 4,
    includes: ['electrical', 'insulation', 'resistance']
  },
  'I': {
    code: 'I',
    name: 'Transfer Switch Service',
    description: 'Transfer switch inspection, testing, contact cleaning, timing verification',
    keywords: ['transfer switch', 'ATS', 'automatic transfer', 'switch service', 'transfer test'],
    typicalFrequency: 1,
    typicalLaborHours: 3,
    includes: ['transfer switch', 'ATS']
  },
  'J': {
    code: 'J',
    name: 'Thermal Imaging Scan',
    description: 'Infrared thermal imaging of electrical connections and components',
    keywords: ['thermal', 'infrared', 'imaging', 'IR scan', 'thermography'],
    typicalFrequency: 1,
    typicalLaborHours: 2,
    includes: ['thermal', 'infrared']
  }
};

class EvidenceBasedMapper {
  constructor(config = {}) {
    this.config = {
      strictMode: config.strictMode !== false, // Require evidence by default
      confidenceThreshold: config.confidenceThreshold || 0.70,
      ...config
    };
    this.warnings = [];
    this.evidence = [];
  }

  /**
   * Map RFP services with evidence validation
   */
  mapServices(rfpServices, rfpFullText = '') {
    const results = {
      mappings: [],
      warnings: [],
      evidence: [],
      sanityChecks: {},
      overallConfidence: 0
    };

    for (const rfpService of rfpServices) {
      const mapping = this._mapSingleService(rfpService, rfpFullText);
      results.mappings.push(mapping);
      results.evidence.push(...mapping.evidence);
      results.warnings.push(...mapping.warnings);
    }

    // Run sanity checks on complete mapping
    results.sanityChecks = this._runSanityChecks(results.mappings);
    results.warnings.push(...results.sanityChecks.warnings);

    // Calculate overall confidence
    results.overallConfidence = this._calculateOverallConfidence(results.mappings);

    return results;
  }

  /**
   * Map single RFP service to Energen service
   */
  _mapSingleService(rfpService, fullText) {
    const result = {
      rfpService: rfpService.description || rfpService.rawText,
      mappedServices: [],
      frequency: rfpService.frequency,
      frequencyQuote: rfpService.frequencyQuote || null,
      sourcePage: rfpService.sourcePage || null,
      evidence: [],
      warnings: [],
      confidence: 0
    };

    // Validate source citation
    if (this.config.strictMode && !rfpService.sourcePage) {
      result.warnings.push({
        level: 'HIGH',
        type: 'missing_citation',
        message: 'No source page provided for service requirement'
      });
    }

    // Validate frequency extraction
    if (rfpService.frequency && !rfpService.frequencyQuote) {
      result.warnings.push({
        level: 'HIGH',
        type: 'missing_frequency_quote',
        message: `Frequency "${rfpService.frequency}" provided without source quote`
      });
    }

    // Validate frequency quote exists in text
    if (this.config.strictMode && rfpService.frequencyQuote && fullText) {
      if (!fullText.toLowerCase().includes(rfpService.frequencyQuote.toLowerCase())) {
        result.warnings.push({
          level: 'CRITICAL',
          type: 'hallucinated_frequency',
          message: `Frequency quote "${rfpService.frequencyQuote}" not found in RFP text`,
          recommendation: 'Manual review required - may be AI hallucination'
        });
      }
    }

    // Map to Energen services by keyword matching
    const description = (rfpService.description || rfpService.rawText || '').toLowerCase();
    const matched = [];

    for (const [code, service] of Object.entries(SERVICE_CATALOG)) {
      const score = this._calculateMatchScore(description, service);

      if (score > 0.3) {
        matched.push({
          code,
          service,
          score,
          evidence: this._generateEvidence(rfpService, service, score)
        });
      }
    }

    // Sort by score
    matched.sort((a, b) => b.score - a.score);

    if (matched.length > 0) {
      // Take best match
      const best = matched[0];
      result.mappedServices.push({
        code: best.code,
        name: best.service.name,
        matchScore: best.score
      });
      result.evidence.push(best.evidence);
      result.confidence = best.score;

      // Check frequency reasonableness
      const freqCheck = this._validateFrequency(rfpService, best.service);
      if (!freqCheck.reasonable) {
        result.warnings.push(freqCheck.warning);
      }
    } else {
      result.warnings.push({
        level: 'MEDIUM',
        type: 'no_match',
        message: `No Energen service matches "${rfpService.description}"`,
        recommendation: 'May require custom service (K) or manual review'
      });
    }

    return result;
  }

  /**
   * Calculate match score between RFP description and service
   */
  _calculateMatchScore(description, service) {
    let score = 0;
    let matchCount = 0;

    // Keyword matching
    for (const keyword of service.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        score += 0.15;
        matchCount++;
      }
    }

    // Check includes
    if (service.includes) {
      for (const include of service.includes) {
        if (description.includes(include.toLowerCase())) {
          score += 0.10;
        }
      }
    }

    // Check excludes (negative scoring)
    if (service.excludes) {
      for (const exclude of service.excludes) {
        if (description.includes(exclude.toLowerCase())) {
          score -= 0.20;
        }
      }
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate evidence for mapping
   */
  _generateEvidence(rfpService, energenService, score) {
    return {
      rfpText: rfpService.description || rfpService.rawText,
      mappedTo: energenService.code + ' - ' + energenService.name,
      matchScore: score,
      sourcePage: rfpService.sourcePage,
      sourceSection: rfpService.sourceSection,
      keywords: energenService.keywords.filter(kw =>
        (rfpService.description || rfpService.rawText || '').toLowerCase().includes(kw.toLowerCase())
      )
    };
  }

  /**
   * Validate frequency reasonableness
   */
  _validateFrequency(rfpService, energenService) {
    const rfpFreq = this._parseFrequency(rfpService.frequency);
    const typicalFreq = energenService.typicalFrequency;

    if (rfpFreq === null) {
      return { reasonable: true }; // Not specified, can't validate
    }

    if (rfpFreq > typicalFreq * 2) {
      return {
        reasonable: false,
        warning: {
          level: 'HIGH',
          type: 'unusual_frequency',
          message: `Service ${energenService.code} typically ${typicalFreq}x/year, RFP requests ${rfpFreq}x/year`,
          recommendation: 'Verify RFP requirement - may be describing comprehensive visit with multiple tasks'
        }
      };
    }

    return { reasonable: true };
  }

  /**
   * Parse frequency string to number per year
   */
  _parseFrequency(frequency) {
    if (!frequency) return null;

    const freq = frequency.toString().toLowerCase();

    if (freq.includes('quarter') || freq === '4') return 4;
    if (freq.includes('semi') || freq.includes('twice') || freq === '2') return 2;
    if (freq.includes('annual') || freq.includes('yearly') || freq === '1') return 1;
    if (freq.includes('month') || freq === '12') return 12;
    if (freq.includes('week') || freq === '52') return 52;

    // Try to parse as number
    const num = parseInt(freq);
    if (!isNaN(num)) return num;

    return null;
  }

  /**
   * Run sanity checks on complete mapping
   */
  _runSanityChecks(mappings) {
    const checks = {
      warnings: [],
      totalVisits: 0,
      estimatedCostPerGenerator: 0
    };

    // Calculate total annual visits
    for (const mapping of mappings) {
      const freq = this._parseFrequency(mapping.frequency);
      if (freq) {
        checks.totalVisits += freq;
      }
    }

    // Check for unusually high visit count
    if (checks.totalVisits > 6) {
      checks.warnings.push({
        level: 'CRITICAL',
        type: 'high_visit_count',
        message: `Total ${checks.totalVisits} visits/year is unusually high for generator PM`,
        recommendation: 'REVIEW REQUIRED: RFP may describe ONE comprehensive visit with multiple tasks, not separate visits'
      });
    }

    // Estimate cost (rough)
    let estimatedLabor = 0;
    for (const mapping of mappings) {
      if (mapping.mappedServices.length > 0) {
        const code = mapping.mappedServices[0].code;
        const service = SERVICE_CATALOG[code];
        const freq = this._parseFrequency(mapping.frequency) || 1;

        if (service) {
          estimatedLabor += service.typicalLaborHours * freq;
        }
      }
    }

    const avgLaborRate = 180; // Approximate
    const avgMaterialsCost = 500; // Approximate per visit
    checks.estimatedCostPerGenerator = (estimatedLabor * avgLaborRate) + (checks.totalVisits * avgMaterialsCost);

    if (checks.estimatedCostPerGenerator > 15000) {
      checks.warnings.push({
        level: 'CRITICAL',
        type: 'high_cost_estimate',
        message: `Estimated $${checks.estimatedCostPerGenerator.toFixed(0)}/generator is 3x typical annual PM cost`,
        recommendation: 'PRICING REVIEW REQUIRED: Verify service frequencies before bidding'
      });
    }

    return checks;
  }

  /**
   * Calculate overall mapping confidence
   */
  _calculateOverallConfidence(mappings) {
    if (mappings.length === 0) return 0;

    const totalConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0);
    return totalConfidence / mappings.length;
  }
}

module.exports = { EvidenceBasedMapper, SERVICE_CATALOG };
