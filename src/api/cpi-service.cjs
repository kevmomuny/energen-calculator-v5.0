/**
 * CPI (Consumer Price Index) Service
 * Fetches inflation data from FRED API for automatic CPI adjustment
 * @module cpi-service
 */

const axios = require('axios');

class CPIService {
    constructor(logger = null) {
        // BUG-028 FIX: Accept logger parameter for structured logging
        this.logger = logger || console;

        // FRED API base URL - free tier, no API key required for basic usage
        this.baseUrl = 'https://api.stlouisfed.org/fred/series/observations';
        
        // Series IDs for different regions
        // CPIAUCSL: Consumer Price Index for All Urban Consumers: All Items in U.S. City Average
        this.seriesIds = {
            'US': 'CPIAUCSL',  // National average
            'San Francisco': 'CUURA422SA0',  // San Francisco-Oakland-Hayward
            'Los Angeles': 'CUURA421SA0',    // Los Angeles-Long Beach-Anaheim
            'San Diego': 'CUURA424SA0',      // San Diego-Carlsbad
            'Phoenix': 'CUUSA429SA0',        // Phoenix-Mesa-Scottsdale
            'Seattle': 'CUURA423SA0',        // Seattle-Tacoma-Bellevue
            'Denver': 'CUURA433SA0',         // Denver-Aurora-Lakewood
            'Atlanta': 'CUURA319SA0',        // Atlanta-Sandy Springs-Roswell
            'Chicago': 'CUURA207SA0',        // Chicago-Naperville-Elgin
            'New York': 'CUURA101SA0',       // New York-Newark-Jersey City
            'Boston': 'CUURA103SA0',         // Boston-Cambridge-Newton
            'Dallas': 'CUURA206SA0',         // Dallas-Fort Worth-Arlington
            'Houston': 'CUURA318SA0',        // Houston-The Woodlands-Sugar Land
            'Miami': 'CUURA320SA0',          // Miami-Fort Lauderdale-West Palm Beach
            'Philadelphia': 'CUURA102SA0',   // Philadelphia-Camden-Wilmington
            'Washington': 'CUURA311SA0',     // Washington-Arlington-Alexandria
        };
        
        // Cache for CPI data (to avoid excessive API calls)
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        // ZIP code prefix to metro area mapping
        this.zipToMetro = {
            // California
            '940': 'San Francisco', '941': 'San Francisco', '942': 'San Francisco',
            '943': 'San Francisco', '944': 'San Francisco', '945': 'San Francisco',
            '946': 'San Francisco', '947': 'San Francisco', '948': 'San Francisco',
            '949': 'San Francisco', '950': 'San Francisco', '951': 'San Francisco',
            '952': 'San Francisco', '953': 'San Francisco', '954': 'San Francisco',
            '900': 'Los Angeles', '901': 'Los Angeles', '902': 'Los Angeles',
            '903': 'Los Angeles', '904': 'Los Angeles', '905': 'Los Angeles',
            '906': 'Los Angeles', '907': 'Los Angeles', '908': 'Los Angeles',
            '910': 'Los Angeles', '911': 'Los Angeles', '912': 'Los Angeles',
            '913': 'Los Angeles', '914': 'Los Angeles', '915': 'Los Angeles',
            '916': 'Los Angeles', '917': 'Los Angeles', '918': 'Los Angeles',
            '919': 'San Diego', '920': 'San Diego', '921': 'San Diego',
            // Washington
            '980': 'Seattle', '981': 'Seattle', '982': 'Seattle',
            '983': 'Seattle', '984': 'Seattle', '985': 'Seattle',
            '986': 'Seattle', '987': 'Seattle', '988': 'Seattle',
            '989': 'Seattle', '990': 'Seattle', '991': 'Seattle',
            '992': 'Seattle', '993': 'Seattle', '994': 'Seattle',
            // Arizona
            '850': 'Phoenix', '851': 'Phoenix', '852': 'Phoenix',
            '853': 'Phoenix', '855': 'Phoenix', '856': 'Phoenix',
            '857': 'Phoenix', '859': 'Phoenix', '860': 'Phoenix',
            // Colorado
            '800': 'Denver', '801': 'Denver', '802': 'Denver',
            '803': 'Denver', '804': 'Denver', '805': 'Denver',
            '806': 'Denver', '807': 'Denver', '808': 'Denver',
            '809': 'Denver', '810': 'Denver', '811': 'Denver',
            '812': 'Denver', '813': 'Denver', '814': 'Denver',
            '815': 'Denver', '816': 'Denver',
            // Texas
            '770': 'Houston', '771': 'Houston', '772': 'Houston',
            '773': 'Houston', '774': 'Houston', '775': 'Houston',
            '776': 'Houston', '777': 'Houston', '778': 'Houston',
            '779': 'Houston',
            '750': 'Dallas', '751': 'Dallas', '752': 'Dallas',
            '753': 'Dallas', '754': 'Dallas', '755': 'Dallas',
            '756': 'Dallas', '757': 'Dallas', '758': 'Dallas',
            '759': 'Dallas', '760': 'Dallas', '761': 'Dallas',
            '762': 'Dallas',
            // Illinois
            '600': 'Chicago', '601': 'Chicago', '602': 'Chicago',
            '603': 'Chicago', '604': 'Chicago', '605': 'Chicago',
            '606': 'Chicago', '607': 'Chicago', '608': 'Chicago',
            '609': 'Chicago', '610': 'Chicago', '611': 'Chicago',
            // New York
            '100': 'New York', '101': 'New York', '102': 'New York',
            '103': 'New York', '104': 'New York', '105': 'New York',
            '106': 'New York', '107': 'New York', '108': 'New York',
            '109': 'New York', '110': 'New York', '111': 'New York',
            '112': 'New York', '113': 'New York', '114': 'New York',
            '115': 'New York', '116': 'New York', '117': 'New York',
            '118': 'New York', '119': 'New York',
            // Massachusetts
            '010': 'Boston', '011': 'Boston', '012': 'Boston',
            '013': 'Boston', '014': 'Boston', '015': 'Boston',
            '016': 'Boston', '017': 'Boston', '018': 'Boston',
            '019': 'Boston', '020': 'Boston', '021': 'Boston',
            '022': 'Boston', '023': 'Boston', '024': 'Boston',
            // Pennsylvania
            '190': 'Philadelphia', '191': 'Philadelphia', '192': 'Philadelphia',
            '193': 'Philadelphia', '194': 'Philadelphia',
            // DC Metro
            '200': 'Washington', '201': 'Washington', '202': 'Washington',
            '203': 'Washington', '204': 'Washington', '205': 'Washington',
            '206': 'Washington', '207': 'Washington', '208': 'Washington',
            '209': 'Washington', '210': 'Washington', '211': 'Washington',
            '212': 'Washington',
            // Georgia
            '300': 'Atlanta', '301': 'Atlanta', '302': 'Atlanta',
            '303': 'Atlanta', '304': 'Atlanta', '305': 'Atlanta',
            '306': 'Atlanta', '307': 'Atlanta', '308': 'Atlanta',
            '309': 'Atlanta', '310': 'Atlanta', '311': 'Atlanta',
            '312': 'Atlanta', '313': 'Atlanta',
            // Florida
            '330': 'Miami', '331': 'Miami', '332': 'Miami',
            '333': 'Miami', '334': 'Miami'
        };
    }
    
    /**
     * Get metropolitan area from ZIP code
     * @param {string} zip - ZIP code
     * @returns {string} Metropolitan area or 'US' as default
     */
    getMetroFromZip(zip) {
        if (!zip || zip.length < 3) return 'US';
        
        // Try 3-digit prefix first for more accuracy
        const prefix3 = zip.substring(0, 3);
        if (this.zipToMetro[prefix3]) {
            return this.zipToMetro[prefix3];
        }
        
        // Fallback to 2-digit prefix
        const prefix2 = zip.substring(0, 2);
        const prefix2Map = {
            '94': 'San Francisco', '95': 'San Francisco',
            '90': 'Los Angeles', '91': 'Los Angeles', '92': 'San Diego',
            '98': 'Seattle',
            '85': 'Phoenix',
            '80': 'Denver',
            '77': 'Houston', '75': 'Dallas', '76': 'Dallas',
            '60': 'Chicago', '61': 'Chicago',
            '10': 'New York', '11': 'New York',
            '01': 'Boston', '02': 'Boston',
            '19': 'Philadelphia',
            '20': 'Washington', '21': 'Washington', '22': 'Washington',
            '30': 'Atlanta', '31': 'Atlanta',
            '33': 'Miami'
        };
        
        return prefix2Map[prefix2] || 'US';
    }
    
    /**
     * Get CPI data for a specific location
     * @param {string} location - City name or 'US' for national average
     * @param {string} apiKey - Optional FRED API key for higher rate limits
     * @returns {Object} CPI data with annual inflation rate
     */
    async getCPIData(location = 'US', apiKey = null) {
        try {
            // Check cache first
            const cacheKey = `${location}-${new Date().toDateString()}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    // BUG-028 FIX: Use Winston logger instead of console
                    this.logger.info('CPI cache hit for:', cacheKey);
                    return cached.data;
                }
            }
            
            // Get the series ID for the location
            const seriesId = this.seriesIds[location] || this.seriesIds['US'];
            // BUG-028 FIX: Use Winston logger instead of console
            this.logger.info(`Fetching CPI data for ${location} (series: ${seriesId})`);

            // Build API request parameters
            const params = {
                series_id: seriesId,
                file_type: 'json',
                limit: 24,  // Get last 24 months of data
                sort_order: 'desc',
                observation_start: this.getDateString(24), // 24 months ago
                observation_end: this.getDateString(0),    // Today
            };
            
            // Add API key if provided (allows more requests)
            if (apiKey) {
                params.api_key = apiKey;
            }
            
            // Make the API request
            const response = await axios.get(this.baseUrl, { params });
            
            if (!response.data || !response.data.observations) {
                throw new Error('Invalid response from FRED API');
            }
            
            const observations = response.data.observations;
            
            // Calculate year-over-year inflation
            const currentCPI = parseFloat(observations[0].value);
            const yearAgoCPI = this.findYearAgoValue(observations);
            
            let annualInflation = 0;
            if (yearAgoCPI) {
                annualInflation = ((currentCPI - yearAgoCPI) / yearAgoCPI) * 100;
            }
            
            // Calculate CPI multiplier for multi-year projections
            const cpiMultiplier = 1 + (annualInflation / 100);
            
            const result = {
                location,
                seriesId,
                currentCPI,
                yearAgoCPI,
                annualInflation: Math.round(annualInflation * 100) / 100, // Round to 2 decimals
                cpiMultiplier: Math.round(cpiMultiplier * 1000) / 1000,  // Round to 3 decimals
                lastUpdated: observations[0].date,
                dataSource: 'Federal Reserve Economic Data (FRED)',
                projections: {
                    year1: cpiMultiplier,
                    year2: Math.pow(cpiMultiplier, 2),
                    year3: Math.pow(cpiMultiplier, 3),
                    year4: Math.pow(cpiMultiplier, 4),
                    year5: Math.pow(cpiMultiplier, 5)
                }
            };
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;

        } catch (error) {
            // BUG-028 FIX: Use Winston logger instead of console
            this.logger.error('Error fetching CPI data:', error.message);

            // Return default values if API fails
            return {
                location,
                seriesId: 'N/A',
                currentCPI: null,
                yearAgoCPI: null,
                annualInflation: 3.0,  // Default 3% inflation
                cpiMultiplier: 1.03,
                lastUpdated: new Date().toISOString(),
                dataSource: 'Default (API unavailable)',
                error: error.message,
                projections: {
                    year1: 1.03,
                    year2: 1.0609,
                    year3: 1.0927,
                    year4: 1.1255,
                    year5: 1.1593
                }
            };
        }
    }
    
    /**
     * Get CPI data for multiple locations
     * @param {Array} locations - Array of location names
     * @param {string} apiKey - Optional FRED API key
     * @returns {Object} Map of location to CPI data
     */
    async getMultipleLocationsCPI(locations, apiKey = null) {
        const results = {};
        
        for (const location of locations) {
            results[location] = await this.getCPIData(location, apiKey);
            // Add small delay to avoid rate limiting
            await this.delay(100);
        }
        
        return results;
    }
    
    /**
     * Calculate escalated price based on CPI
     * @param {number} basePrice - Current price
     * @param {number} years - Number of years to project
     * @param {Object} cpiData - CPI data from getCPIData
     * @returns {number} Escalated price
     */
    calculateEscalatedPrice(basePrice, years, cpiData) {
        const multiplier = Math.pow(cpiData.cpiMultiplier, years);
        return Math.round(basePrice * multiplier * 100) / 100;
    }
    
    /**
     * Get available locations
     * @returns {Array} List of available location names
     */
    getAvailableLocations() {
        return Object.keys(this.seriesIds);
    }
    
    /**
     * Helper: Get date string for API request
     * @private
     */
    getDateString(monthsAgo) {
        const date = new Date();
        date.setMonth(date.getMonth() - monthsAgo);
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Helper: Find value from approximately one year ago
     * @private
     */
    findYearAgoValue(observations) {
        // Look for observation approximately 12 months ago
        for (let i = 11; i <= 13; i++) {
            if (observations[i] && observations[i].value) {
                return parseFloat(observations[i].value);
            }
        }
        return null;
    }
    
    /**
     * Helper: Delay function
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get CPI-based escalation for contract pricing
     * @param {string} location - Location for CPI data
     * @param {number} contractYears - Contract duration in years
     * @returns {Object} Escalation data for pricing
     */
    async getContractEscalation(location = 'US', contractYears = 3) {
        const cpiData = await this.getCPIData(location);
        
        const escalation = {
            location: cpiData.location,
            baseInflation: cpiData.annualInflation,
            multiplier: cpiData.cpiMultiplier,
            yearlyEscalation: []
        };
        
        for (let year = 1; year <= contractYears; year++) {
            escalation.yearlyEscalation.push({
                year,
                multiplier: Math.pow(cpiData.cpiMultiplier, year),
                percentIncrease: (Math.pow(cpiData.cpiMultiplier, year) - 1) * 100
            });
        }
        
        return escalation;
    }
}

// Export for use in Node.js
module.exports = CPIService;