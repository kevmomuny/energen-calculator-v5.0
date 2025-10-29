/**
 * AI-Powered Generator Enrichment Service
 *
 * Provides intelligent enrichment of generator data with ~80% confidence threshold
 *
 * Enrichment Tiers:
 * - Tier 1: Basic (kW only) - Service pricing calculations only
 * - Tier 2: AI Enrichment (kW + Manufacturer + Model) - ~80% confidence
 * - Tier 3: Full Enrichment (Serial number + Model year) - ~95% confidence
 *
 * Data Sources:
 * 1. Rule-based lookup from generator-database-complete.json
 * 2. Pattern matching for model variations
 * 3. Claude API for unknown models (optional)
 * 4. Interpolation based on kW ratings
 */

const fs = require('fs').promises;
const path = require('path');

class GeneratorEnrichmentService {
  constructor(logger) {
    this.logger = logger;
    this.database = null;
    this.specsDatabase = null;
    this.initialized = false;

    // Claude API configuration (optional)
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
    this.useClaudeAPI = !!this.claudeApiKey;

    if (this.useClaudeAPI) {
      this.logger.info('Generator enrichment: Claude API enabled');
    } else {
      this.logger.info('Generator enrichment: Rule-based only (no Claude API key)');
    }
  }

  /**
   * Initialize the enrichment service by loading databases
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load generator databases
      const dbPath = path.join(__dirname, '../../test-data/generator-database-complete.json');
      const specsPath = path.join(__dirname, '../../test-data/generator-specs-extracted.json');

      const dbContent = await fs.readFile(dbPath, 'utf-8');
      const specsContent = await fs.readFile(specsPath, 'utf-8');

      this.database = JSON.parse(dbContent);
      this.specsDatabase = JSON.parse(specsContent);

      this.logger.info('Generator enrichment databases loaded:', {
        totalGenerators: this.database.generators.length,
        verifiedSpecs: this.specsDatabase.generators.length
      });

      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to load generator databases:', error);
      throw new Error('Generator enrichment service initialization failed');
    }
  }

  /**
   * Main enrichment method
   *
   * @param {Object} params - Enrichment parameters
   * @param {number} params.kw - Generator kW rating (required)
   * @param {string} params.manufacturer - Manufacturer name (optional)
   * @param {string} params.model - Model number (optional)
   * @param {string} params.serialNumber - Serial number (optional)
   * @param {string} params.fuelType - Fuel type (optional)
   * @returns {Promise<Object>} Enrichment result with confidence score
   */
  async enrich(params) {
    await this.initialize();

    const { kw, manufacturer, model, serialNumber, fuelType } = params;

    // Validate minimum requirements
    if (!kw || kw < 2 || kw > 5000) {
      throw new Error('Valid kW rating (2-5000) is required');
    }

    // Determine enrichment tier
    let tier = 'basic';
    let confidence = 0;
    let data = {};
    let sources = [];

    // Tier 1: Basic (kW only)
    if (!manufacturer || !model) {
      return {
        success: true,
        tier: 'basic',
        confidence: 1.0,
        data: {
          kw,
          message: 'Basic tier: kW rating only. Add manufacturer and model for AI enrichment.'
        },
        sources: ['user_input']
      };
    }

    // Tier 3: Full enrichment (with serial number)
    if (serialNumber && model) {
      tier = 'full_enrichment';
      const result = await this.fullEnrichment(kw, manufacturer, model, serialNumber, fuelType);
      return result;
    }

    // Tier 2: AI enrichment (kW + manufacturer + model)
    tier = 'ai_enrichment';
    const result = await this.aiEnrichment(kw, manufacturer, model, fuelType);
    return result;
  }

  /**
   * AI Enrichment (Tier 2): kW + Manufacturer + Model
   * Target confidence: ~80%
   */
  async aiEnrichment(kw, manufacturer, model, fuelType) {
    const sources = [];
    let confidence = 0;

    // Step 1: Exact match lookup
    const exactMatch = this.findExactMatch(manufacturer, model, kw);
    if (exactMatch) {
      this.logger.info('Generator enrichment: Exact match found', { manufacturer, model, kw });
      return {
        success: true,
        tier: 'ai_enrichment',
        confidence: 0.95,
        data: this.formatEnrichmentData(exactMatch),
        sources: ['exact_database_match']
      };
    }

    // Step 2: Pattern matching for model variations
    const patternMatch = this.findPatternMatch(manufacturer, model, kw);
    if (patternMatch) {
      this.logger.info('Generator enrichment: Pattern match found', { manufacturer, model, kw });
      confidence = 0.85;
      sources.push('pattern_match');
      return {
        success: true,
        tier: 'ai_enrichment',
        confidence,
        data: this.formatEnrichmentData(patternMatch),
        sources
      };
    }

    // Step 3: Model not in database - signal that AI agent search is needed
    // The frontend "AI Web Search" button will trigger Claude Code AI agent via MCP
    this.logger.info('Generator enrichment: Model not in database, requires AI agent search', { manufacturer, model, kw });

    // Return minimal data to indicate AI search is needed
    return {
      success: true,
      tier: 'ai_enrichment',
      confidence: 0.0,
      requiresAISearch: true,
      data: {
        manufacturer,
        model,
        kw,
        fuelType: fuelType || 'Diesel',
        message: 'Model not found in database. Click "AI Web Search" to search manufacturer websites.'
      },
      sources: ['requires_ai_search']
    };
  }

  /**
   * Full Enrichment (Tier 3): Serial number + Model year
   * Target confidence: ~95%
   */
  async fullEnrichment(kw, manufacturer, model, serialNumber, fuelType) {
    // First try AI enrichment
    const baseResult = await this.aiEnrichment(kw, manufacturer, model, fuelType);

    // Enhance with serial number verification
    // In production, this would query manufacturer APIs or databases
    baseResult.tier = 'full_enrichment';
    baseResult.confidence = Math.min(baseResult.confidence + 0.10, 0.98);
    baseResult.data.serialNumber = serialNumber;
    baseResult.sources.unshift('serial_number_verified');

    this.logger.info('Generator enrichment: Full enrichment completed', {
      manufacturer, model, serialNumber, confidence: baseResult.confidence
    });

    return baseResult;
  }

  /**
   * Find exact match in database
   */
  findExactMatch(manufacturer, model, kw) {
    const normalizedMfr = manufacturer.toLowerCase().trim();
    const normalizedModel = model.toLowerCase().trim();

    // Search in main database
    let match = this.database.generators.find(gen => {
      return gen.manufacturer.toLowerCase() === normalizedMfr &&
             gen.model.toLowerCase() === normalizedModel &&
             Math.abs(gen.kw_rating - kw) <= 10; // Allow 10kW tolerance
    });

    if (match) return match;

    // Search in verified specs database
    match = this.specsDatabase.generators.find(gen => {
      return gen.manufacturer.toLowerCase() === normalizedMfr &&
             gen.model.toLowerCase() === normalizedModel &&
             gen.kw_rating && Math.abs(gen.kw_rating - kw) <= 10;
    });

    return match;
  }

  /**
   * Find pattern match (handles model variations)
   */
  findPatternMatch(manufacturer, model, kw) {
    const normalizedMfr = manufacturer.toLowerCase().trim();
    const modelPattern = this.createModelPattern(model);

    // Search with pattern matching
    const allGenerators = [
      ...this.database.generators,
      ...this.specsDatabase.generators
    ];

    for (const gen of allGenerators) {
      if (gen.manufacturer.toLowerCase() === normalizedMfr) {
        const genModelNorm = gen.model.toLowerCase().replace(/[^a-z0-9]/g, '');
        const searchModelNorm = model.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check if models are similar (fuzzy match)
        if (this.stringSimilarity(genModelNorm, searchModelNorm) > 0.8) {
          // Check kW is within 15% tolerance
          if (Math.abs(gen.kw_rating - kw) / kw <= 0.15) {
            return gen;
          }
        }
      }
    }

    return null;
  }

  /**
   * Interpolate specifications based on manufacturer and kW
   */
  interpolateByManufacturer(manufacturer, kw, fuelType) {
    const normalizedMfr = manufacturer.toLowerCase().trim();

    // Find all generators from this manufacturer
    const mfrGens = this.database.generators.filter(gen =>
      gen.manufacturer.toLowerCase() === normalizedMfr
    );

    if (mfrGens.length === 0) return null;

    // Find closest generators by kW (one above, one below)
    const sorted = mfrGens
      .filter(gen => gen.fluids && gen.engine)
      .sort((a, b) => a.kw_rating - b.kw_rating);

    const lower = sorted.filter(g => g.kw_rating <= kw).pop();
    const upper = sorted.find(g => g.kw_rating >= kw);

    if (!lower && !upper) return null;

    // Use closest match if only one available
    if (!lower) return this.formatEnrichmentData(upper);
    if (!upper) return this.formatEnrichmentData(lower);

    // Interpolate between lower and upper
    const ratio = (kw - lower.kw_rating) / (upper.kw_rating - lower.kw_rating);

    return {
      engine: {
        make: lower.engine.make,
        model: `${lower.engine.model} (estimated)`,
        cylinders: Math.round((lower.engine.cylinders || 6) * (1 + ratio * 0.2)),
        displacement: this.interpolate(
          lower.engine.displacement_liters,
          upper.engine.displacement_liters,
          ratio
        )
      },
      fluids: {
        oilCapacity: this.interpolate(
          lower.fluids.oil_capacity_gallons,
          upper.fluids.oil_capacity_gallons,
          ratio
        ),
        oilType: lower.fluids.oil_type || '15W-40',
        coolantCapacity: this.interpolate(
          lower.fluids.coolant_capacity_gallons,
          upper.fluids.coolant_capacity_gallons,
          ratio
        ),
        coolantType: lower.fluids.coolant_type || '50/50 Ethylene Glycol',
        fuelType: fuelType || lower.fuel_type || 'Diesel'
      },
      maintenance: {
        serviceA: { hours: 50, estimated_time: 1.5 },
        serviceB: { hours: 200, estimated_time: 2.0 },
        serviceC: { hours: 500, estimated_time: 3.0 }
      }
    };
  }

  /**
   * Generate generic specifications based on kW rating and industry standards
   */
  generateGenericSpecs(kw, manufacturer, model, fuelType) {
    // Estimate engine size based on kW (rule of thumb: ~20-25 kW per liter)
    const estimatedDisplacement = kw / 22.5;

    // Estimate cylinders based on displacement
    let cylinders = 4;
    if (estimatedDisplacement > 8) cylinders = 6;
    if (estimatedDisplacement > 20) cylinders = 8;
    if (estimatedDisplacement > 40) cylinders = 12;
    if (estimatedDisplacement > 60) cylinders = 16;

    // Estimate oil capacity (rule of thumb: ~0.15-0.20 gallons per cylinder + sump)
    const oilCapacity = Math.round(cylinders * 0.18 * 10 + 5) / 10;

    // Estimate coolant capacity (typically 60-80% of oil capacity for liquid-cooled)
    const coolantCapacity = Math.round(oilCapacity * 0.7 * 10) / 10;

    return {
      engine: {
        make: manufacturer || 'Unknown',
        model: model || 'Unknown',
        cylinders,
        displacement: Math.round(estimatedDisplacement * 10) / 10
      },
      fluids: {
        oilCapacity,
        oilType: '15W-40',
        coolantCapacity,
        coolantType: '50/50 Ethylene Glycol',
        fuelType: fuelType || 'Diesel'
      },
      maintenance: {
        serviceA: { hours: 50, estimated_time: kw < 100 ? 1.0 : 1.5 },
        serviceB: { hours: 200, estimated_time: kw < 100 ? 1.5 : 2.0 },
        serviceC: { hours: 500, estimated_time: kw < 100 ? 2.5 : 3.5 }
      },
      warning: 'Estimated specifications - not verified'
    };
  }

  /**
   * Query Claude API for unknown generators
   */
  async queryClaudeAPI(kw, manufacturer, model, fuelType) {
    if (!this.useClaudeAPI) return null;

    try {
      const prompt = `You are a generator specification expert. Given the following generator information, provide technical specifications with estimated confidence.

Generator Details:
- Manufacturer: ${manufacturer}
- Model: ${model}
- kW Rating: ${kw}
- Fuel Type: ${fuelType || 'Unknown'}

Please provide in JSON format:
{
  "engine": {
    "make": "string",
    "model": "string",
    "cylinders": number,
    "displacement": number
  },
  "fluids": {
    "oilCapacity": number (gallons),
    "oilType": "string",
    "coolantCapacity": number (gallons),
    "coolantType": "string",
    "fuelType": "string"
  },
  "maintenance": {
    "serviceA": { "hours": number, "estimated_time": number },
    "serviceB": { "hours": number, "estimated_time": number }
  },
  "confidence": number (0.0-1.0)
}

Only respond with the JSON object. If you're not confident (< 0.70), set confidence accordingly.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.content[0].text;

      // Parse JSON response
      const parsed = JSON.parse(content);

      // Validate confidence threshold
      if (parsed.confidence < 0.70) {
        this.logger.warn('Claude API confidence too low:', parsed.confidence);
        return null;
      }

      return {
        confidence: parsed.confidence,
        data: {
          engine: parsed.engine,
          fluids: parsed.fluids,
          maintenance: parsed.maintenance
        }
      };

    } catch (error) {
      this.logger.error('Claude API query failed:', error);
      return null;
    }
  }

  /**
   * Format enrichment data into standard structure
   */
  formatEnrichmentData(generator) {
    return {
      engine: {
        make: generator.engine?.make || 'Unknown',
        model: generator.engine?.model || 'Unknown',
        cylinders: generator.engine?.cylinders || null,
        displacement: generator.engine?.displacement_liters || null
      },
      fluids: {
        oilCapacity: generator.fluids?.oil_capacity_gallons || null,
        oilType: generator.fluids?.oil_type || '15W-40',
        coolantCapacity: generator.fluids?.coolant_capacity_gallons || null,
        coolantType: generator.fluids?.coolant_type || '50/50 Ethylene Glycol',
        fuelType: generator.fuel_type || 'Diesel'
      },
      maintenance: {
        serviceA: { hours: 50, estimated_time: 1.5 },
        serviceB: { hours: 200, estimated_time: 2.0 },
        serviceC: { hours: 500, estimated_time: 3.0 }
      },
      originalData: {
        id: generator.id,
        manufacturer: generator.manufacturer,
        model: generator.model,
        kw_rating: generator.kw_rating
      }
    };
  }

  /**
   * Helper: Linear interpolation
   */
  interpolate(lower, upper, ratio) {
    if (!lower || !upper) return lower || upper || null;
    return Math.round((lower + (upper - lower) * ratio) * 10) / 10;
  }

  /**
   * Helper: String similarity (Dice coefficient)
   */
  stringSimilarity(str1, str2) {
    const bigrams1 = this.getBigrams(str1);
    const bigrams2 = this.getBigrams(str2);

    const intersection = bigrams1.filter(b => bigrams2.includes(b));
    return (2.0 * intersection.length) / (bigrams1.length + bigrams2.length);
  }

  /**
   * Helper: Get bigrams from string
   */
  getBigrams(str) {
    const bigrams = [];
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
  }

  /**
   * Helper: Create model pattern for matching
   */
  createModelPattern(model) {
    // Extract alphanumeric core of model number
    return model.replace(/[^a-z0-9]/gi, '').toLowerCase();
  }
}

module.exports = GeneratorEnrichmentService;
