/**
 * AI Unit Search Service
 * Uses web search to find generator specifications and maintenance data
 * Implements 100% confidence filtering - bad info is worse than no info
 * @version 5.0.0
 */

/**
 * Confidence levels for AI-sourced data
 */
const CONFIDENCE_LEVELS = {
    HIGH: 'high',        // Verified from manufacturer website or spec sheet
    MEDIUM: 'medium',    // Found in multiple sources with agreement
    LOW: 'low',          // Single source or conflicting data
    NONE: 'none'         // No reliable data found
};

/**
 * Minimum confidence threshold - only HIGH confidence data is accepted
 */
const MIN_CONFIDENCE = CONFIDENCE_LEVELS.HIGH;

/**
 * Data source patterns that indicate high confidence
 */
const TRUSTED_SOURCES = [
    /cummins\.com/i,
    /caterpillar\.com/i,
    /cat\.com/i,
    /kohler\.com/i,
    /generac\.com/i,
    /\.pdf$/i,          // PDF spec sheets
    /manual/i,
    /specification/i,
    /datasheet/i
];

/**
 * AI Unit Search Service Class
 */
class AIUnitSearchService {
    constructor() {
        this.searchHistory = [];
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Search for unit specifications
     * @param {Object} unitData - Unit information
     * @param {string} unitData.kw - kW rating
     * @param {string} unitData.brand - Manufacturer brand
     * @param {string} unitData.model - Model number (can be "TBD")
     * @param {string} unitData.serial - Serial number (can be "TBD")
     * @returns {Promise<Object>} Maintenance datasheet with confidence scores
     */
    async searchUnitSpecs(unitData) {
        const { kw, brand, model, serial } = unitData;

        // Build cache key
        const cacheKey = `${kw}-${brand}-${model || 'TBD'}-${serial || 'TBD'}`;

        // Check in-memory cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('✓ Returning cached unit specs for:', cacheKey);
                return cached.data;
            }
        }

        // Check localStorage cache (for imported verified units)
        const storageKey = `aiUnitCache_${cacheKey}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
                    console.log('✓ Returning verified unit data from localStorage:', cacheKey);
                    // Also populate in-memory cache for faster subsequent access
                    this.cache.set(cacheKey, {
                        data: parsed.data,
                        timestamp: parsed.timestamp
                    });
                    return parsed.data;
                }
            } catch (e) {
                console.warn('Failed to parse localStorage cache:', e);
            }
        }

        console.log('🔍 Starting AI web search for unit specs:', unitData);

        try {
            // Build search query
            const searchQuery = this.buildSearchQuery(unitData);
            console.log('Search query:', searchQuery);

            // Perform web search (this would use the WebSearch MCP tool via backend)
            const searchResults = await this.performWebSearch(searchQuery);

            // Parse results and extract maintenance data
            const maintenanceData = await this.parseSearchResults(searchResults, unitData);

            // Apply confidence filtering
            const filteredData = this.filterByConfidence(maintenanceData);

            // Cache the results
            this.cache.set(cacheKey, {
                data: filteredData,
                timestamp: Date.now()
            });

            // Store in search history
            this.searchHistory.push({
                timestamp: new Date().toISOString(),
                query: searchQuery,
                results: filteredData,
                confidence: filteredData.confidence
            });

            return filteredData;

        } catch (error) {
            console.error('❌ AI unit search failed:', error);
            return this.getEmptyDatasheet('Search failed: ' + error.message);
        }
    }

    /**
     * Build search query from unit data
     * @param {Object} unitData - Unit information
     * @returns {string} Search query string
     */
    buildSearchQuery(unitData) {
        const { kw, brand, model, serial } = unitData;

        const parts = [kw + 'kW'];

        if (brand && brand !== '') {
            parts.push(brand);
        }

        if (model && model !== 'TBD' && model !== '') {
            parts.push(model);
        }

        if (serial && serial !== 'TBD' && serial !== '') {
            parts.push(serial);
        }

        // Add specification keywords
        parts.push('specifications maintenance oil coolant filter capacity');

        return parts.join(' ');
    }

    /**
     * Perform web search (calls backend API that uses WebSearch tool)
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async performWebSearch(query) {
        try {
            const response = await fetch('/api/ai-search-unit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`Search API failed: ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];

        } catch (error) {
            console.error('Web search failed:', error);
            throw error;
        }
    }

    /**
     * Parse search results and extract maintenance data
     * @param {Array} results - Web search results
     * @param {Object} unitData - Original unit data
     * @returns {Promise<Object>} Extracted maintenance data
     */
    async parseSearchResults(results, unitData) {
        const datasheet = this.getEmptyDatasheet();
        const evidence = {
            fluids: {},
            consumables: {},
            intervals: {}
        };

        console.log(`Parsing ${results.length} search results...`);

        for (const result of results) {
            const { title, snippet, url } = result;
            const combinedText = `${title} ${snippet}`.toLowerCase();

            // Check if source is trusted
            const isTrustedSource = TRUSTED_SOURCES.some(pattern =>
                pattern.test(url) || pattern.test(title)
            );

            // Extract oil information
            const oilMatch = this.extractOilType(combinedText);
            if (oilMatch) {
                this.addEvidence(evidence.fluids, 'oilType', oilMatch, isTrustedSource, url);
            }

            const oilCapacity = this.extractOilCapacity(combinedText);
            if (oilCapacity) {
                this.addEvidence(evidence.fluids, 'oilCapacity', oilCapacity, isTrustedSource, url);
            }

            // Extract coolant information
            const coolantType = this.extractCoolantType(combinedText);
            if (coolantType) {
                this.addEvidence(evidence.fluids, 'coolantType', coolantType, isTrustedSource, url);
            }

            const coolantCapacity = this.extractCoolantCapacity(combinedText);
            if (coolantCapacity) {
                this.addEvidence(evidence.fluids, 'coolantCapacity', coolantCapacity, isTrustedSource, url);
            }

            // Extract filter part numbers
            const oilFilter = this.extractOilFilter(combinedText);
            if (oilFilter) {
                this.addEvidence(evidence.consumables, 'oilFilter', oilFilter, isTrustedSource, url);
            }

            const airFilter = this.extractAirFilter(combinedText);
            if (airFilter) {
                this.addEvidence(evidence.consumables, 'airFilter', airFilter, isTrustedSource, url);
            }

            const fuelFilter = this.extractFuelFilter(combinedText);
            if (fuelFilter) {
                this.addEvidence(evidence.consumables, 'fuelFilter', fuelFilter, isTrustedSource, url);
            }

            // Extract service intervals
            const oilInterval = this.extractOilChangeInterval(combinedText);
            if (oilInterval) {
                this.addEvidence(evidence.intervals, 'oilChange', oilInterval, isTrustedSource, url);
            }

            const airInterval = this.extractAirFilterInterval(combinedText);
            if (airInterval) {
                this.addEvidence(evidence.intervals, 'airFilter', airInterval, isTrustedSource, url);
            }
        }

        // Apply confidence scoring and populate datasheet
        datasheet.fluids = this.applyConfidenceScoring(evidence.fluids);
        datasheet.consumables = this.applyConfidenceScoring(evidence.consumables);
        datasheet.intervals = this.applyConfidenceScoring(evidence.intervals);

        // Determine overall confidence
        datasheet.confidence = this.calculateOverallConfidence(datasheet);
        datasheet.source = this.determineSource(evidence);

        return datasheet;
    }

    /**
     * Add evidence for a data field
     * @param {Object} evidenceObj - Evidence object to update
     * @param {string} field - Field name
     * @param {string} value - Extracted value
     * @param {boolean} trusted - Whether source is trusted
     * @param {string} url - Source URL
     */
    addEvidence(evidenceObj, field, value, trusted, url) {
        if (!evidenceObj[field]) {
            evidenceObj[field] = [];
        }

        evidenceObj[field].push({
            value,
            trusted,
            url,
            timestamp: Date.now()
        });
    }

    /**
     * Apply confidence scoring to evidence
     * @param {Object} evidence - Evidence object
     * @returns {Object} Scored data with confidence
     */
    applyConfidenceScoring(evidence) {
        const result = {};

        for (const [field, entries] of Object.entries(evidence)) {
            // Check if multiple sources agree
            const valueCounts = {};
            let trustedCount = 0;

            for (const entry of entries) {
                const val = entry.value;
                valueCounts[val] = (valueCounts[val] || 0) + 1;
                if (entry.trusted) trustedCount++;
            }

            // Find most common value
            const mostCommon = Object.entries(valueCounts)
                .sort((a, b) => b[1] - a[1])[0];

            if (!mostCommon) continue;

            const [value, count] = mostCommon;

            // Determine confidence
            let confidence = CONFIDENCE_LEVELS.NONE;

            if (trustedCount > 0 && count >= 1) {
                confidence = CONFIDENCE_LEVELS.HIGH;
            } else if (count >= 2) {
                confidence = CONFIDENCE_LEVELS.MEDIUM;
            } else if (count === 1) {
                confidence = CONFIDENCE_LEVELS.LOW;
            }

            result[field] = {
                value,
                confidence,
                sources: entries.filter(e => e.value === value).map(e => e.url)
            };
        }

        return result;
    }

    /**
     * Filter data by confidence threshold
     * @param {Object} maintenanceData - Unfiltered maintenance data
     * @returns {Object} Filtered data with only high-confidence fields
     */
    filterByConfidence(maintenanceData) {
        const filtered = this.getEmptyDatasheet();
        filtered.confidence = maintenanceData.confidence;
        filtered.source = maintenanceData.source;

        // Filter fluids
        for (const [key, data] of Object.entries(maintenanceData.fluids)) {
            if (data.confidence === MIN_CONFIDENCE) {
                filtered.fluids[key] = data.value;
            }
        }

        // Filter consumables
        for (const [key, data] of Object.entries(maintenanceData.consumables)) {
            if (data.confidence === MIN_CONFIDENCE) {
                filtered.consumables[key] = data.value;
            }
        }

        // Filter intervals
        for (const [key, data] of Object.entries(maintenanceData.intervals)) {
            if (data.confidence === MIN_CONFIDENCE) {
                filtered.intervals[key] = data.value;
            }
        }

        return filtered;
    }

    /**
     * Calculate overall confidence level
     * @param {Object} datasheet - Maintenance datasheet
     * @returns {string} Overall confidence level
     */
    calculateOverallConfidence(datasheet) {
        const allFields = [
            ...Object.values(datasheet.fluids),
            ...Object.values(datasheet.consumables),
            ...Object.values(datasheet.intervals)
        ];

        const highConfidenceCount = allFields.filter(f =>
            f && f.confidence === CONFIDENCE_LEVELS.HIGH
        ).length;

        if (highConfidenceCount >= 4) return CONFIDENCE_LEVELS.HIGH;
        if (highConfidenceCount >= 2) return CONFIDENCE_LEVELS.MEDIUM;
        if (highConfidenceCount >= 1) return CONFIDENCE_LEVELS.LOW;
        return CONFIDENCE_LEVELS.NONE;
    }

    /**
     * Determine primary source
     * @param {Object} evidence - All evidence collected
     * @returns {string} Source description
     */
    determineSource(evidence) {
        const allEntries = [
            ...Object.values(evidence.fluids || {}).flat(),
            ...Object.values(evidence.consumables || {}).flat(),
            ...Object.values(evidence.intervals || {}).flat()
        ];

        const trustedEntry = allEntries.find(e => e.trusted);
        if (trustedEntry) {
            const url = trustedEntry.url;
            if (url.includes('cummins')) return 'Cummins manufacturer specs';
            if (url.includes('cat')) return 'Caterpillar manufacturer specs';
            if (url.includes('kohler')) return 'Kohler manufacturer specs';
            if (url.includes('generac')) return 'Generac manufacturer specs';
            if (url.includes('.pdf')) return 'Manufacturer spec sheet';
            return 'Trusted source';
        }

        return 'Multiple sources';
    }

    /**
     * Get empty maintenance datasheet structure
     * @param {string} reason - Optional reason for empty datasheet
     * @returns {Object} Empty datasheet
     */
    getEmptyDatasheet(reason = null) {
        return {
            fluids: {
                oilType: '',
                oilCapacity: '',
                coolantType: '',
                coolantCapacity: ''
            },
            consumables: {
                oilFilter: '',
                airFilter: '',
                fuelFilter: '',
                belts: []
            },
            intervals: {
                oilChange: '',
                airFilter: ''
            },
            source: reason || 'No data found',
            confidence: CONFIDENCE_LEVELS.NONE,
            searchedAt: new Date().toISOString()
        };
    }

    // ========== EXTRACTION METHODS ==========

    extractOilType(text) {
        const patterns = [
            /(\d+w[-\s]?\d+)\s*(?:diesel|synthetic|motor|engine)\s*oil/i,
            /(?:oil\s*type|engine\s*oil)[\s:]*(\d+w[-\s]?\d+)/i,
            /(15w[-\s]?40|10w[-\s]?30|5w[-\s]?40|5w[-\s]?30)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1].toUpperCase().replace(/\s/g, '-');
        }
        return null;
    }

    extractOilCapacity(text) {
        const patterns = [
            /oil\s*capacity[\s:]*(\d+\.?\d*)\s*(quarts?|qt|gallons?|gal|liters?|l)/i,
            /(\d+\.?\d*)\s*(quarts?|qt|gallons?|gal)\s*(?:of\s*)?oil/i,
            /crankcase\s*capacity[\s:]*(\d+\.?\d*)\s*(quarts?|qt|gallons?|gal|liters?)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return `${match[1]} ${match[2]}`;
        }
        return null;
    }

    extractCoolantType(text) {
        const patterns = [
            /(ethylene\s*glycol|propylene\s*glycol|extended\s*life\s*coolant|elc)/i,
            /coolant\s*type[\s:]*([a-z\s]+?)(?:\.|,|;|\n)/i,
            /(50\/50|60\/40)\s*(?:mix\s*)?(?:ethylene|propylene)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }
        return null;
    }

    extractCoolantCapacity(text) {
        const patterns = [
            /coolant\s*capacity[\s:]*(\d+\.?\d*)\s*(quarts?|qt|gallons?|gal|liters?)/i,
            /cooling\s*system[\s:]*(\d+\.?\d*)\s*(quarts?|qt|gallons?|gal|liters?)/i,
            /(\d+\.?\d*)\s*(gallons?|gal|liters?)\s*(?:of\s*)?coolant/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return `${match[1]} ${match[2]}`;
        }
        return null;
    }

    extractOilFilter(text) {
        const patterns = [
            /oil\s*filter[\s:]*([a-z0-9\-]+)/i,
            /filter[\s,]*oil[\s:]*([a-z0-9\-]+)/i,
            /p\s*\/?\s*n[\s:]*([a-z0-9\-]+)[\s,]*oil/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1].length <= 15) return match[1].toUpperCase();
        }
        return null;
    }

    extractAirFilter(text) {
        const patterns = [
            /air\s*filter[\s:]*([a-z0-9\-]+)/i,
            /filter[\s,]*air[\s:]*([a-z0-9\-]+)/i,
            /p\s*\/?\s*n[\s:]*([a-z0-9\-]+)[\s,]*air/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1].length <= 15) return match[1].toUpperCase();
        }
        return null;
    }

    extractFuelFilter(text) {
        const patterns = [
            /fuel\s*filter[\s:]*([a-z0-9\-]+)/i,
            /filter[\s,]*fuel[\s:]*([a-z0-9\-]+)/i,
            /p\s*\/?\s*n[\s:]*([a-z0-9\-]+)[\s,]*fuel/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1].length <= 15) return match[1].toUpperCase();
        }
        return null;
    }

    extractOilChangeInterval(text) {
        const patterns = [
            /oil\s*change[\s:]*(?:every\s*)?(\d+)\s*(hours?|hrs)/i,
            /maintenance\s*interval[\s:]*(\d+)\s*(hours?|hrs)/i,
            /service\s*every\s*(\d+)\s*(hours?|hrs)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return `${match[1]} ${match[2]}`;
        }
        return null;
    }

    extractAirFilterInterval(text) {
        const patterns = [
            /air\s*filter[\s:]*(?:every\s*)?(\d+)\s*(hours?|hrs)/i,
            /filter\s*replacement[\s:]*(\d+)\s*(hours?|hrs)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return `${match[1]} ${match[2]}`;
        }
        return null;
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.cache.clear();
        console.log('✓ AI search cache cleared');
    }

    /**
     * Get search history
     * @returns {Array} Search history
     */
    getSearchHistory() {
        return this.searchHistory;
    }
}

// Create singleton instance
const aiUnitSearch = new AIUnitSearchService();

// Export for ES6 modules
export default aiUnitSearch;
export { AIUnitSearchService, CONFIDENCE_LEVELS, MIN_CONFIDENCE };

// Make available globally for debugging
window.aiUnitSearch = aiUnitSearch;
