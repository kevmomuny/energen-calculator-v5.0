/**
 * Prevailing Wage Service
 * Fetches Davis-Bacon prevailing wage rates and per diem rates based on location
 * @module prevailing-wage-service
 */

const axios = require('axios');

class PrevailingWageService {
  constructor(logger = null) {
    // BUG-019 FIX: Add logger parameter with console fallback
    this.logger = logger || console;
    // SAM.gov API for Davis-Bacon wage determinations
    this.samApiUrl = 'https://api.sam.gov/prod/opportunities/v2/wages';

    // GSA Per Diem API
    this.perDiemApiUrl = 'https://api.gsa.gov/travel/perdiem/v2/rates';

    // Cache for wage data
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

    // California prevailing wage rates (fallback data)
    // Source: DIR (Department of Industrial Relations)
    // Updated: 2025-01-25 with 2025 DIR rates
    this.californiaRates = {
      'operatingEngineer': {
        // Operating Engineers Classifications per California DIR 2025
        group1: 72.00,  // Basic mobile equipment operation
        group2: 78.00,  // Advanced mobile equipment operation
        group3: 85.50,  // Heavy mobile equipment (cranes, dozers)
        group8: 92.73,  // STATIONARY ENGINEERS - Power Plant/Generator Operation (UPDATED 2025)
        foreman: 105.00, // Group 8 foreman rate
        generalForeman: 110.00, // Group 8 general foreman
        apprentice1: 46.36,  // 50% of group8
        apprentice2: 55.64,  // 60% of group8
        apprentice3: 64.91,  // 70% of group8
        apprentice4: 74.18   // 80% of group8
      },
      'electrician': {
        journeyman: 121.50,  // UPDATED 2025 - Electrician Inside Wireman (Alameda County)
        foreman: 135.00,
        generalForeman: 145.00,
        apprentice1: 60.75,  // 50% of journeyman
        apprentice2: 72.90,  // 60% of journeyman
        apprentice3: 85.05,  // 70% of journeyman
        apprentice4: 97.20   // 80% of journeyman
      },
      'laborer': {
        skilled: 55.00,
        unskilled: 35.00
      },
      'operator': {
        crane: 78.00,
        forklift: 45.00,
        equipment: 65.00
      },
      'fringe': {
        healthWelfare: 19.41,   // UPDATED 2025 DIR
        pension: 22.97,          // UPDATED 2025 DIR
        vacation: 3.50,
        training: 2.30,          // UPDATED 2025 DIR
        other: 1.42             // UPDATED 2025 DIR
      }
    };

    // County to prevailing wage zone mapping for California
    // Updated: 2025-01-25 based on DIR determinations
    // Zone 1: Bay Area (Alameda, SF, etc.) - 15% higher
    // Zone 2: LA/SD - 10% higher
    // Zone 3: Central Valley - base rate
    // Zone 4: Rural - 10% lower
    this.countyToZone = {
      // Northern California - Zone 1 (Higher rates)
      'Alameda': 1, 'Contra Costa': 1, 'Marin': 1, 'Napa': 1,
      'San Francisco': 1, 'San Mateo': 1, 'Santa Clara': 1,
      'Solano': 1, 'Sonoma': 1,

      // Southern California - Zone 2 (Higher rates)
      'Los Angeles': 2, 'Orange': 2, 'San Diego': 2,
      'Santa Barbara': 2, 'Ventura': 2,

      // Central Valley - Zone 3 (Standard rates)
      'Fresno': 3, 'Kern': 3, 'Kings': 3, 'Madera': 3,
      'Merced': 3, 'Sacramento': 3, 'San Joaquin': 3,
      'Stanislaus': 3, 'Tulare': 3,

      // Rural - Zone 4 (Lower rates)
      'Butte': 4, 'El Dorado': 4, 'Glenn': 4, 'Imperial': 4,
      'Inyo': 4, 'Lake': 4, 'Lassen': 4, 'Modoc': 4,
      'Mono': 4, 'Nevada': 4, 'Plumas': 4, 'Riverside': 4,
      'San Bernardino': 4, 'Shasta': 4, 'Sierra': 4,
      'Siskiyou': 4, 'Tehama': 4, 'Yolo': 4, 'Yuba': 4
    };

    // Zone multipliers
    this.zoneMultipliers = {
      1: 1.15,  // Bay Area - 15% higher
      2: 1.10,  // LA/SD - 10% higher
      3: 1.00,  // Central Valley - base rate
      4: 0.90   // Rural - 10% lower
    };
  }

  /**
     * Get county from ZIP code (simplified mapping)
     * @param {string} zip - ZIP code
     * @returns {string} County name
     */
  getCountyFromZip(zip) {
    if (!zip) return null;

    const zipPrefix = parseInt(zip.substring(0, 3));

    // Simplified California ZIP to County mapping
    const zipToCounty = {
      // Bay Area
      940: 'San Francisco', 941: 'San Francisco',
      943: 'Contra Costa', 944: 'San Mateo',
      945: 'Alameda', 946: 'Alameda', 947: 'Alameda',
      948: 'Marin', 949: 'Marin',
      950: 'Santa Clara', 951: 'Santa Clara',
      953: 'Napa', 954: 'Sonoma', 955: 'Solano',

      // Los Angeles Area
      900: 'Los Angeles', 901: 'Los Angeles', 902: 'Los Angeles',
      903: 'Los Angeles', 904: 'Los Angeles', 905: 'Los Angeles',
      906: 'Los Angeles', 907: 'Los Angeles', 908: 'Los Angeles',
      910: 'Los Angeles', 911: 'Los Angeles', 912: 'Los Angeles',
      913: 'Los Angeles', 914: 'Los Angeles', 915: 'Los Angeles',
      916: 'Los Angeles', 917: 'Los Angeles', 918: 'Los Angeles',

      // San Diego
      919: 'San Diego', 920: 'San Diego', 921: 'San Diego',

      // Orange County
      926: 'Orange', 927: 'Orange', 928: 'Orange',

      // Ventura/Santa Barbara
      930: 'Ventura', 931: 'Santa Barbara', 932: 'Ventura',

      // Central Valley
      932: 'Fresno', 936: 'Fresno', 937: 'Fresno',
      933: 'Kern', 935: 'Kern',
      942: 'Sacramento', 956: 'Sacramento', 957: 'Sacramento',
      958: 'Sacramento', 959: 'Yolo',
      952: 'San Joaquin', 953: 'Stanislaus', 954: 'Merced',

      // Rural/Mountain
      959: 'Nevada', 960: 'Shasta', 961: 'Plumas',
      935: 'Mono', 939: 'El Dorado'
    };

    return zipToCounty[zipPrefix] || null;
  }

  /**
     * Get prevailing wage data for a location
     * @param {string} zip - ZIP code
     * @param {string} state - State code
     * @returns {Object} Prevailing wage data
     */
  async getPrevailingWageData(zip, state = 'CA') {
    try {
      // Check cache first
      const cacheKey = `wage-${zip}-${new Date().toDateString()}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // For California, use our local data
      if (state === 'CA' && zip) {
        const county = this.getCountyFromZip(zip);
        const zone = county ? this.countyToZone[county] : 3;
        const multiplier = this.zoneMultipliers[zone] || 1.0;

        // Calculate adjusted rates based on zone
        // CRITICAL: Use Operating Engineers Group 8 (Stationary Engineers) for generator maintenance
        const operatingEngineerRate = this.californiaRates.operatingEngineer.group8 * multiplier;
        const foremanRate = this.californiaRates.operatingEngineer.foreman * multiplier;
        const totalFringe = Object.values(this.californiaRates.fringe).reduce((a, b) => a + b, 0);

        const wageData = {
          location: {
            zip,
            state,
            county: county || 'Unknown',
            zone: zone || 3,
            craft: 'Operating Engineers - Stationary Power Plant (Group 8)'
          },
          prevailingWage: {
            operatingEngineerGroup8: operatingEngineerRate,  // Primary rate for stationary engineers
            operatingEngineerGroup3: this.californiaRates.operatingEngineer.group3 * multiplier, // Keep for reference
            operatingEngineerForeman: foremanRate,
            // Keep electrician rates for reference but not primary
            electricianJourneyman: this.californiaRates.electrician.journeyman * multiplier,
            electricianForeman: this.californiaRates.electrician.foreman * multiplier,
            laborer: this.californiaRates.laborer.skilled * multiplier,
            totalHourly: operatingEngineerRate + totalFringe,
            baseRate: operatingEngineerRate,
            fringeRate: totalFringe
          },
          breakdown: {
            base: operatingEngineerRate,
            healthWelfare: this.californiaRates.fringe.healthWelfare,
            pension: this.californiaRates.fringe.pension,
            vacation: this.californiaRates.fringe.vacation,
            training: this.californiaRates.fringe.training,
            total: operatingEngineerRate + totalFringe
          },
          isPrevailingWageRequired: this.isPrevailingWageArea(county, state),
          source: 'California DIR',
          effectiveDate: new Date().toISOString()
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: wageData,
          timestamp: Date.now()
        });

        return wageData;
      }

      // For other states, return default data
      return {
        location: { zip, state },
        prevailingWage: {
          electricianJourneyman: 65.00,
          electricianForeman: 72.00,
          laborer: 45.00,
          totalHourly: 85.00,
          baseRate: 65.00,
          fringeRate: 20.00
        },
        isPrevailingWageRequired: false,
        source: 'Default',
        effectiveDate: new Date().toISOString()
      };

    } catch (error) {
      // BUG-019 FIX: Use logger instead of console
      this.logger.error('Error fetching prevailing wage data:', error);
      return null;
    }
  }

  /**
     * Get per diem rates for a location
     * @param {string} zip - ZIP code
     * @param {string} state - State code
     * @param {number} fiscalYear - Fiscal year (optional)
     * @returns {Object} Per diem rates
     */
  async getPerDiemRates(zip, state = 'CA', fiscalYear = null) {
    try {
      const year = fiscalYear || new Date().getFullYear();

      // Check cache
      const cacheKey = `perdiem-${zip}-${year}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // California per diem rates (2024)
      const californiaPerDiem = {
        // High cost areas
        'San Francisco': { lodging: 304, meals: 79, total: 383 },
        'Los Angeles': { lodging: 195, meals: 74, total: 269 },
        'San Diego': { lodging: 181, meals: 74, total: 255 },
        'Santa Clara': { lodging: 214, meals: 74, total: 288 },
        'Orange': { lodging: 154, meals: 69, total: 223 },
        'Alameda': { lodging: 184, meals: 74, total: 258 },
        'San Mateo': { lodging: 204, meals: 74, total: 278 },

        // Medium cost areas
        'Sacramento': { lodging: 134, meals: 64, total: 198 },
        'Contra Costa': { lodging: 144, meals: 69, total: 213 },
        'Ventura': { lodging: 139, meals: 69, total: 208 },
        'Santa Barbara': { lodging: 219, meals: 74, total: 293 },
        'Monterey': { lodging: 179, meals: 69, total: 248 },

        // Standard areas (default)
        'default': { lodging: 107, meals: 59, total: 166 }
      };

      const county = this.getCountyFromZip(zip);
      const perDiem = californiaPerDiem[county] || californiaPerDiem.default;

      const perDiemData = {
        location: {
          zip,
          state,
          county: county || 'Standard',
          fiscalYear: year
        },
        rates: {
          lodging: perDiem.lodging,
          meals: perDiem.meals,
          incidentals: 5,
          total: perDiem.total
        },
        mileage: {
          rate: 0.67,  // 2024 IRS rate
          unit: 'per mile'
        },
        source: 'GSA Per Diem Rates',
        effectiveDate: `${year}-10-01` // Fiscal year starts Oct 1
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: perDiemData,
        timestamp: Date.now()
      });

      return perDiemData;

    } catch (error) {
      // BUG-019 FIX: Use logger instead of console
      this.logger.error('Error fetching per diem rates:', error);
      return null;
    }
  }

  /**
     * Check if location requires prevailing wage
     * @param {string} county - County name
     * @param {string} state - State code
     * @returns {boolean} Whether prevailing wage is required
     */
  isPrevailingWageArea(county, state) {
    // Public works projects typically require prevailing wage
    // This is a simplified check - actual requirements are complex

    if (state === 'CA') {
      // California has strong prevailing wage laws
      // All public works over $1,000 require prevailing wage
      return true;
    }

    // Federal projects (Davis-Bacon Act) over $2,000
    // State projects vary by state
    const prevailingWageStates = [
      'CA', 'NY', 'IL', 'PA', 'OH', 'MI', 'NJ', 'MA', 'WA', 'OR'
    ];

    return prevailingWageStates.includes(state);
  }

  /**
     * Calculate labor cost with prevailing wage
     * @param {number} standardRate - Standard labor rate
     * @param {Object} prevailingWageData - Prevailing wage data
     * @param {string} classification - Worker classification
     * @returns {number} Adjusted labor rate
     */
  calculatePrevailingWageRate(standardRate, prevailingWageData, classification = 'operatingEngineerGroup8') {
    if (!prevailingWageData || !prevailingWageData.prevailingWage) {
      return standardRate;
    }

    const prevailingRate = prevailingWageData.prevailingWage[classification] ||
                               prevailingWageData.prevailingWage.operatingEngineerGroup8 ||
                               prevailingWageData.prevailingWage.operatingEngineerGroup3 ||
                               prevailingWageData.prevailingWage.electricianJourneyman;

    // Use the higher of standard rate or prevailing wage
    return Math.max(standardRate, prevailingRate);
  }
}

module.exports = PrevailingWageService;
