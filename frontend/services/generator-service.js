/**
 * Generator Enrichment Service
 * Frontend interface for AI-powered generator enrichment
 */

export class GeneratorService {
  constructor(apiBaseUrl = 'http://localhost:3002') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Enrich generator specifications
   *
   * @param {Object} params - Generator parameters
   * @param {number} params.kw - Generator kW rating (required)
   * @param {string} params.manufacturer - Manufacturer name (optional)
   * @param {string} params.model - Model number (optional)
   * @param {string} params.serialNumber - Serial number (optional)
   * @param {string} params.fuelType - Fuel type (optional)
   * @returns {Promise<Object>} Enrichment result with confidence score
   */
  async enrichGenerator(params) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/enrichment/generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Generator enrichment failed:', error);
      return {
        success: false,
        tier: 'basic',
        confidence: 0,
        error: error.message,
        data: {
          kw: params.kw,
          message: 'Enrichment unavailable - using basic tier'
        }
      };
    }
  }

  /**
   * Format enrichment data for display
   */
  formatEnrichmentDisplay(enrichmentResult) {
    if (!enrichmentResult.success || enrichmentResult.tier === 'basic') {
      return {
        hasEnrichment: false,
        message: 'Add manufacturer and model for AI enrichment',
        confidence: 0
      };
    }

    const { tier, confidence, data } = enrichmentResult;

    return {
      hasEnrichment: true,
      tier,
      confidence: Math.round(confidence * 100),
      engine: data.engine ? {
        make: data.engine.make,
        model: data.engine.model,
        cylinders: data.engine.cylinders,
        displacement: data.engine.displacement ? `${data.engine.displacement}L` : null
      } : null,
      fluids: data.fluids ? {
        oilCapacity: data.fluids.oilCapacity ? `${data.fluids.oilCapacity} gal` : null,
        oilType: data.fluids.oilType,
        coolantCapacity: data.fluids.coolantCapacity ? `${data.fluids.coolantCapacity} gal` : null,
        coolantType: data.fluids.coolantType,
        fuelType: data.fluids.fuelType
      } : null,
      maintenance: data.maintenance,
      warning: data.warning || null
    };
  }

  /**
   * Get confidence color for UI display
   */
  getConfidenceColor(confidence) {
    if (confidence >= 0.90) return '#10b981'; // Green
    if (confidence >= 0.80) return '#3b82f6'; // Blue
    if (confidence >= 0.70) return '#f59e0b'; // Amber
    if (confidence >= 0.60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }

  /**
   * Get confidence label
   */
  getConfidenceLabel(confidence) {
    if (confidence >= 0.90) return 'Verified';
    if (confidence >= 0.80) return 'High Confidence';
    if (confidence >= 0.70) return 'Good Confidence';
    if (confidence >= 0.60) return 'Moderate';
    return 'Low Confidence';
  }

  /**
   * Get tier display name
   */
  getTierDisplayName(tier) {
    const tiers = {
      'basic': 'Basic (kW Only)',
      'ai_enrichment': 'AI Enrichment',
      'full_enrichment': 'Full Enrichment'
    };
    return tiers[tier] || tier;
  }

  /**
   * Check if enrichment data is sufficient for advanced features
   */
  isSufficientForAdvancedFeatures(enrichmentResult) {
    return enrichmentResult.success &&
           enrichmentResult.confidence >= 0.75 &&
           enrichmentResult.tier !== 'basic';
  }

  /**
   * Validate generator input before enrichment
   */
  validateInput(params) {
    const errors = [];

    if (!params.kw || params.kw < 2 || params.kw > 5000) {
      errors.push('kW rating must be between 2-5000');
    }

    // Warnings (not errors)
    const warnings = [];

    if (!params.manufacturer || !params.model) {
      warnings.push('Manufacturer and model recommended for AI enrichment');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get recommended enrichment tier based on available data
   */
  getRecommendedTier(params) {
    if (params.serialNumber && params.model) {
      return {
        tier: 'full_enrichment',
        confidence: '~95%',
        description: 'Serial number + model enables full enrichment'
      };
    }

    if (params.manufacturer && params.model) {
      return {
        tier: 'ai_enrichment',
        confidence: '~80%',
        description: 'Manufacturer + model enables AI enrichment'
      };
    }

    return {
      tier: 'basic',
      confidence: '100%',
      description: 'kW only - suitable for basic pricing'
    };
  }

  /**
   * Create enrichment summary for UI
   */
  createEnrichmentSummary(enrichmentResult) {
    if (!enrichmentResult.success) {
      return {
        status: 'error',
        message: enrichmentResult.error || 'Enrichment failed',
        canCalculate: true // Can still calculate with kW only
      };
    }

    const { tier, confidence, data, sources } = enrichmentResult;

    let summary = '';
    let details = [];

    if (tier === 'basic') {
      summary = 'Basic tier - kW rating only';
      details.push('Add manufacturer and model for AI enrichment');
    } else if (tier === 'ai_enrichment') {
      summary = `AI Enrichment - ${Math.round(confidence * 100)}% confidence`;

      if (data.engine) {
        details.push(`Engine: ${data.engine.make} ${data.engine.model}`);
      }
      if (data.fluids) {
        if (data.fluids.oilCapacity) {
          details.push(`Oil: ${data.fluids.oilCapacity} gal ${data.fluids.oilType}`);
        }
        if (data.fluids.coolantCapacity) {
          details.push(`Coolant: ${data.fluids.coolantCapacity} gal`);
        }
      }

      if (sources && sources.length > 0) {
        details.push(`Sources: ${sources.join(', ')}`);
      }
    } else if (tier === 'full_enrichment') {
      summary = `Full Enrichment - ${Math.round(confidence * 100)}% confidence`;
      details.push('Serial number verified');
      if (data.engine) {
        details.push(`Engine: ${data.engine.make} ${data.engine.model}`);
      }
    }

    return {
      status: 'success',
      tier,
      confidence: Math.round(confidence * 100),
      summary,
      details,
      canCalculate: true,
      hasWarning: !!data.warning,
      warning: data.warning
    };
  }
}

// Create singleton instance
export const generatorService = new GeneratorService();

// Also export as default for backward compatibility
export default generatorService;
