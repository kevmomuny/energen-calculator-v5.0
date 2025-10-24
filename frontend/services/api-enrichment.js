/**
 * Enrichment API Connector
 * Handles customer data enrichment API calls (Google Places, logos, tax rates, distance)
 * Dependencies: utilities.js
 */

import { updateStatus } from '../js/utilities.js';

/**
 * Format business type for display
 * @param {Array<string>} types - Business types from Google Places
 * @returns {string} Formatted business type
 */
function formatBusinessType(types) {
    if (!types || types.length === 0) return 'Business';
    // Prioritize meaningful types
    const priorityTypes = ['university', 'school', 'hospital', 'restaurant', 'store', 'bank', 'hotel'];
    const primaryType = types.find(t => priorityTypes.includes(t));
    if (primaryType) {
        return primaryType.charAt(0).toUpperCase() + primaryType.slice(1);
    }
    // Format the first type nicely
    return types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format price level for display
 * @param {number|null} level - Price level (1-4)
 * @returns {string} Formatted price level ($, $$, $$$, $$$$, or N/A)
 */
function formatPriceLevel(level) {
    if (!level) return 'N/A';
    return '$'.repeat(level);
}

/**
 * Create Enrichment API Connector
 * @returns {Object} API connector with enrichment methods
 */
export function createEnrichmentAPIConnector() {
    return {
        /**
         * Enhance customer data using Google Places API
         * @param {string} companyName - Company name
         * @param {string} address - Company address
         * @returns {Promise<Object>} Enriched customer data
         */
        enhance: async function(companyName, address) {
            updateStatus('Enriching customer data...');

            // BUG-022 FIX: Add timeout to prevent hung requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                const response = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/enrichment/google-places', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        companyName: companyName,
                        address: address || ''
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                return await this._handleResponse(response);
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - enrichment service took too long. Please try again.');
                }
                throw error;
            }
        },

        /**
         * Handle fetch response
         * @private
         */
        _handleResponse: async function(response) {

            if (!response.ok) {
                throw new Error(`Google Places API failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error('Google Places API returned unsuccessful response');
            }

            updateStatus('Enrichment complete', 'success');

            // Map ONLY REAL API data - no estimates
            return {
                // Real data from APIs
                businessType: formatBusinessType(data.data.types),
                entityType: data.data.entity_type,
                rating: data.data.rating,
                reviewCount: data.data.user_ratings_total,
                priceLevel: formatPriceLevel(data.data.price_level),
                operatingHours: data.data.opening_hours?.weekday_text?.[0] || 'Hours not available',
                businessStatus: data.data.business_status,
                website: data.data.website,
                phone: data.data.formatted_phone_number,
                placeId: data.data.place_id,
                aiSummary: data.data.ai_summary,
                entityDescription: data.data.entity_description,
                editorialSummary: data.data.editorial_summary,
                // Service attributes
                wheelchairAccessible: data.data.wheelchair_accessible,
                delivery: data.data.delivery,
                takeout: data.data.takeout,
                dineIn: data.data.dine_in,
                reservable: data.data.reservable,
                // Location
                lat: data.data.geometry?.location?.lat,
                lng: data.data.geometry?.location?.lng,
                formattedAddress: data.data.formatted_address,
                noEnrichment: data.data.no_enrichment
            };
        },

        /**
         * Get company logo URL
         * @param {string} companyName - Company name
         * @param {string} website - Company website
         * @returns {Promise<string>} Logo URL
         */
        getLogo: async function(companyName, website) {
            // NO TRY/CATCH - FAIL IMMEDIATELY
            const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
            const response = await fetch(`${API_BASE}/api/enrichment/logo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: companyName,
                    domain: website
                })
            });

            if (!response.ok) {
                throw new Error(`Logo API failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.logoUrl) {
                throw new Error('No logo URL returned from API');
            }
            return data.logoUrl;
        },

        /**
         * Get tax rate for location
         * @param {string} address - Street address
         * @param {string} city - City name
         * @param {string} zip - ZIP code
         * @returns {Promise<number>} Tax rate (decimal)
         */
        getTaxRate: async function(address, city, zip) {
            // NO TRY/CATCH - FAIL IMMEDIATELY
            const response = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/enrichment/tax-rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: address,
                    city: city,
                    zip: zip,
                    state: 'CA'
                })
            });

            if (!response.ok) {
                throw new Error(`Tax rate API failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.taxRate) {
                throw new Error('No tax rate returned from API');
            }
            return data.taxRate;
        },

        /**
         * Calculate distance between two addresses
         * @param {string} fromAddress - Origin address
         * @param {string} toAddress - Destination address
         * @returns {Promise<number>} Distance in miles
         */
        calculateDistance: async function(fromAddress, toAddress) {
            // NO TRY/CATCH - FAIL IMMEDIATELY
            const response = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/enrichment/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: fromAddress,
                    destination: toAddress
                })
            });

            if (!response.ok) {
                throw new Error(`Distance API failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (typeof data.distance !== 'number') {
                throw new Error('Invalid distance returned from API');
            }
            return data.distance;
        }
    };
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.createEnrichmentAPIConnector = createEnrichmentAPIConnector;
}
