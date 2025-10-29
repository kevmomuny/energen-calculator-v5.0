/**
 * @fileoverview Customer Enrichment Module - Phase 3
 * Handles customer data enrichment via Google Places API
 * Manages prevailing wage calculations and location-based pricing
 *
 * @module frontend/modules/customer-enrichment
 * @author Energen Team
 * @version 5.0.0
 */

// Import dependencies
import { updateStatus, showNotification, calculateHaversineDistance } from '../js/utilities.js';

/**
 * Enrich customer data using Google Places API
 * Fetches business information, address, contact details, and logo
 * @param {Object} state - Application state
 * @returns {Promise<void>}
 */
export async function enrichCustomer(state) {
    const companyName = document.getElementById('companyName').value;
    const address = document.getElementById('address').value;
    if (!companyName) return;

    // Show loading state
    const enrichmentContainer = document.querySelector('.customer-section');

    try {
        // Add visual loading indicator to customer section
        if (enrichmentContainer) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'enrichment-loading';
            loadingIndicator.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; padding: 12px; color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); border-radius: 6px; margin: 8px 0;">
                    <span class="loading-spinner" style="margin-right: 8px;"></span>
                    Enriching customer data...
                </div>
            `;
            enrichmentContainer.appendChild(loadingIndicator);
        }

        updateStatus('Enriching customer data...');

        // Call the Google Places enrichment API directly
        // CRITICAL: Include placeId if we have one from autocomplete selection
        const enrichmentPayload = {
            query: companyName,
            address: address,
            placeId: state.selectedPlaceId
        };

        // Alert if no placeId when we expect one
        if (!state.selectedPlaceId && state.selectedPrediction) {
            console.error('⚠️ WARNING: Have prediction but no placeId!');
        }

        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
        const response = await fetch(`${API_BASE}/api/enrichment/google-places`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enrichmentPayload)
        });

        if (!response.ok) {
            console.error('Enrichment failed:', response.statusText);
            updateStatus('Failed to enrich customer data', 'error');
            return;
        }

        const result = await response.json();

        console.log('[ENRICHMENT] Raw API response:', result);

        // CRITICAL BUG CHECK
        if (result.data?.formatted_address?.includes('1515 Clay') &&
            result.data?.formatted_address?.includes('Oakland') &&
            state.selectedPlaceId) {
            console.error('🚨🚨🚨 BUG DETECTED: Got Oakland address when placeId was:', state.selectedPlaceId);
            console.error('🚨 This means the server is NOT using the placeId!');
            alert('BUG: Server returned Oakland instead of Sacramento. Check console.');
        }

        // Extract the actual enrichment data
        const enriched = result.data || result;
        console.log('[ENRICHMENT] Extracted enriched data:', enriched);
        console.log('[ENRICHMENT] Has formatted_address?', !!enriched.formatted_address);
        state.enrichmentData = enriched;

        // Update UI with business type and industry
        updateBusinessTypeAndIndustry(enriched, companyName);

        // Update ALL address fields from Google's formatted address
        parseAndUpdateAddress(enriched);

        // Set phone and website fields
        updateContactFields(enriched);

        // Update company logo
        await updateCompanyLogo(enriched, companyName, state);

        // Calculate distance if location is available
        if (enriched.location && enriched.location.lat && enriched.location.lng) {
            await calculateAndUpdateDistance(enriched.location);
        }

        // Enrichment complete
        updateStatus('Customer data enriched successfully');
        showNotification('Customer data enriched successfully', 'success', 3000);

    } catch (error) {
        console.error('Enrichment error:', error);
        updateStatus('Failed to enrich customer data', 'error');
        showNotification(`Enrichment failed: ${error.message}`, 'error');
    } finally {
        // Always clean up loading indicator
        const loadingIndicator = document.querySelector('.enrichment-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}

/**
 * Update business type and industry based on enriched data
 * @param {Object} enriched - Enriched data from Google Places
 * @param {string} companyName - Company name for fallback detection
 */
function updateBusinessTypeAndIndustry(enriched, companyName) {
    const companyNameLower = companyName.toLowerCase();
    let businessType = 'Organization';

    // Parse Google Places types if available
    if (enriched.types && Array.isArray(enriched.types)) {
        const typeMap = {
            'restaurant': 'Restaurant',
            'store': 'Retail Store',
            'school': 'Educational Institution',
            'university': 'University',
            'hospital': 'Healthcare Facility',
            'bank': 'Financial Institution',
            'lodging': 'Hotel/Lodging',
            'gas_station': 'Gas Station',
            'car_dealer': 'Car Dealership',
            'pharmacy': 'Pharmacy',
            'doctor': 'Medical Practice',
            'lawyer': 'Law Firm',
            'accounting': 'Accounting Firm',
            'real_estate_agency': 'Real Estate Agency',
            'insurance_agency': 'Insurance Agency',
            'gym': 'Fitness Center',
            'shopping_mall': 'Shopping Mall',
            'convenience_store': 'Convenience Store',
            'supermarket': 'Supermarket',
            'government': 'Government Agency',
            'fire_station': 'Fire Department',
            'police': 'Police Department',
            'post_office': 'Post Office'
        };

        for (const type of enriched.types) {
            if (typeMap[type]) {
                businessType = typeMap[type];
                break;
            }
        }

        // If no specific type found, use the first non-generic type
        if (businessType === 'Organization' && enriched.types.length > 0) {
            const firstType = enriched.types[0];
            if (firstType !== 'point_of_interest' && firstType !== 'establishment') {
                businessType = firstType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
    }

    // Override generic types with better detection based on company name
    if (businessType === 'Establishment' || businessType === 'Point of Interest' || businessType === 'Business') {
        if (companyNameLower.includes('fire') || companyNameLower.includes('cal fire')) {
            businessType = 'Fire Department';
        } else if (companyNameLower.includes('university') || companyNameLower.includes('college')) {
            businessType = 'Educational Institution';
        } else if (companyNameLower.includes('hospital') || companyNameLower.includes('medical')) {
            businessType = 'Healthcare Facility';
        } else if (companyNameLower.includes('police') || companyNameLower.includes('sheriff')) {
            businessType = 'Law Enforcement';
        } else if (companyNameLower.includes('city of') || companyNameLower.includes('county')) {
            businessType = 'Government Agency';
        }
    }

    // Set business type
    const businessTypeEl = document.getElementById('businessType');
    if (businessTypeEl) {
        businessTypeEl.value = businessType;
    }

    // Set industry based on business type
    setIndustryFromBusinessType(businessType);
}

/**
 * Map business type to industry
 * @param {string} businessType - Business type string
 */
function setIndustryFromBusinessType(businessType) {
    const industryEl = document.getElementById('industry');
    if (!industryEl) return;

    const businessTypeStr = businessType.toLowerCase();
    let industry = 'General Business';

    const industryMap = {
        'education': ['university', 'school', 'college', 'academy', 'education'],
        'Government/Public Service': ['government', 'fire', 'police', 'post office', 'city', 'county', 'federal'],
        'Healthcare': ['hospital', 'medical', 'healthcare', 'doctor', 'clinic', 'pharmacy', 'dentist', 'health'],
        'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial'],
        'Technology': ['tech', 'software', 'computer', 'it', 'data', 'internet'],
        'Retail': ['store', 'shop', 'retail', 'market', 'mall'],
        'Food Service': ['restaurant', 'cafe', 'food', 'bakery', 'bar'],
        'Financial Services': ['bank', 'insurance', 'accounting', 'finance', 'investment'],
        'Real Estate': ['real estate', 'property', 'realty'],
        'Automotive': ['car', 'auto', 'vehicle', 'dealership', 'gas station'],
        'Hospitality': ['hotel', 'motel', 'lodging', 'resort', 'inn'],
        'Professional Services': ['law', 'lawyer', 'legal', 'consulting', 'agency']
    };

    // Find matching industry
    for (const [ind, keywords] of Object.entries(industryMap)) {
        if (keywords.some(keyword => businessTypeStr.includes(keyword))) {
            industry = ind;
            break;
        }
    }

    industryEl.value = industry;
}

/**
 * Parse formatted address and update individual fields
 * @param {Object} enriched - Enriched data with formatted_address
 */
function parseAndUpdateAddress(enriched) {
    const formattedAddress = enriched.formatted_address || enriched.formattedAddress;
    console.log('[PARSE ADDRESS] Input formatted_address:', formattedAddress);

    if (!formattedAddress) {
        console.warn('[PARSE ADDRESS] No formatted_address found in enriched data!');
        return;
    }

    const parts = formattedAddress.split(',').map(p => p.trim()).filter(p => p && p !== 'USA');
    console.log('[PARSE ADDRESS] Parsed parts:', parts);

    // Clear fields first to avoid stale data
    document.getElementById('address').value = '';
    document.getElementById('city').value = '';
    document.getElementById('state').value = '';
    document.getElementById('zip').value = '';

    // Parse based on number of parts
    if (parts.length >= 3) {
        // Standard format: "Street, City, State ZIP"
        document.getElementById('address').value = parts[0];
        document.getElementById('city').value = parts[1];

        // Parse state and ZIP from third part
        const stateZipPart = parts[2];
        const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s*(\d{5})/);
        if (stateZipMatch) {
            document.getElementById('state').value = stateZipMatch[1];
            document.getElementById('zip').value = stateZipMatch[2];
        } else {
            const stateMatch = stateZipPart.match(/([A-Z]{2})/);
            if (stateMatch) {
                document.getElementById('state').value = stateMatch[1];
            }
        }
    } else if (parts.length === 2) {
        // Might be "City, State ZIP" without street
        const stateZipMatch = parts[1].match(/([A-Z]{2})\s*(\d{5})/);
        if (stateZipMatch) {
            document.getElementById('city').value = parts[0];
            document.getElementById('state').value = stateZipMatch[1];
            document.getElementById('zip').value = stateZipMatch[2];
        } else {
            document.getElementById('address').value = parts[0];
            document.getElementById('city').value = parts[1];
        }
    }

    console.log('Parsed address fields:', {
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zip: document.getElementById('zip').value
    });
}

/**
 * Update contact fields (phone, website)
 * @param {Object} enriched - Enriched data
 */
function updateContactFields(enriched) {
    if (enriched.formatted_phone_number || enriched.phone) {
        document.getElementById('phone').value = enriched.formatted_phone_number || enriched.phone || '';
    }
    if (enriched.website) {
        document.getElementById('website').value = enriched.website || '';
    }
}

/**
 * Update company logo
 * @param {Object} enriched - Enriched data
 * @param {string} companyName - Company name for fallback
 * @param {Object} state - Application state
 */
async function updateCompanyLogo(enriched, companyName, state) {
    const logoUrl = enriched.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=667eea&color=fff&size=128`;
    state.enrichmentData.logo = logoUrl;

    const companyLogoEl = document.getElementById('companyLogo');
    const logoPlaceholder = document.getElementById('logoPlaceholder');

    if (companyLogoEl && logoUrl) {
        companyLogoEl.src = logoUrl;
        companyLogoEl.style.display = 'block';
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
    } else if (companyLogoEl) {
        companyLogoEl.style.display = 'none';
        if (logoPlaceholder) logoPlaceholder.style.display = 'flex';
    }
}

/**
 * Calculate and update distance from shop to customer
 * @param {Object} location - Customer location with lat/lng
 */
async function calculateAndUpdateDistance(location) {
    const shopLat = 37.9779;
    const shopLng = -122.0311;
    const distance = calculateHaversineDistance(shopLat, shopLng, location.lat, location.lng);
    document.getElementById('distance').value = Math.round(distance);
}

// calculateHaversineDistance imported from utilities.js

/**
 * Handle prevailing wage checkbox change
 * Toggles prevailing wage display and recalculates units
 * @param {Object} state - Application state
 */
export async function handlePrevailingWageChange(state) {
    const checkbox = document.getElementById('prevailingWageRequired');
    const details = document.getElementById('prevailingWageDetails');

    if (checkbox.checked) {
        details.style.display = 'block';
        await fetchPrevailingWageData(state);
    } else {
        details.style.display = 'none';
    }

    // Store the preference
    state.prevailingWageRequired = checkbox.checked;

    // Update labor rate display
    updateLaborRateDisplay(state);

    // Recalculate all units if any exist
    if (state.units && state.units.length > 0) {
        state.units.forEach(unit => {
            if (unit.kw && unit.services.length > 0 && window.recalculateUnit) {
                window.recalculateUnit(unit.id);
            }
        });
    }
}

/**
 * Fetch prevailing wage data based on ZIP code
 * @param {Object} state - Application state
 */
export async function fetchPrevailingWageData(state) {
    const zip = document.getElementById('zip').value;
    const stateCode = document.getElementById('state').value || 'CA';

    if (!zip) {
        // Use default California rates
        updatePrevailingWageDisplay({
            location: { zip: '94520', zone: 1, county: 'Contra Costa' },
            prevailingWage: {
                electricianJourneyman: 85.50,
                totalHourly: 117.50
            },
            perDiem: {
                total: 213
            }
        }, state);
        return;
    }

    try {
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;

        // Call the API to get prevailing wage data
        const response = await fetch(`${API_BASE}/api/prevailing-wage/${zip}?state=${stateCode}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        // Also fetch per diem data
        const perDiemResponse = await fetch(`${API_BASE}/api/per-diem/${zip}?state=${stateCode}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const result = await response.json();
            const wageData = result.data || result;

            // Merge per diem data if available
            if (perDiemResponse.ok) {
                const perDiemResult = await perDiemResponse.json();
                const perDiemData = perDiemResult.data || perDiemResult;
                wageData.perDiem = perDiemData.rates;
            }

            updatePrevailingWageDisplay(wageData, state);
        } else {
            // Use default rates if API fails
            updatePrevailingWageDisplay({
                location: { zip: zip, zone: 3, county: 'Unknown' },
                prevailingWage: {
                    electricianJourneyman: 85.50,
                    totalHourly: 117.50
                },
                perDiem: {
                    total: 166
                }
            }, state);
        }
    } catch (error) {
        console.error('Error fetching prevailing wage:', error);
        // Use defaults on error
        updatePrevailingWageDisplay({
            location: { zip: zip, zone: 3, county: 'Unknown' },
            prevailingWage: {
                electricianJourneyman: 85.50,
                totalHourly: 117.50
            },
            perDiem: {
                total: 166
            }
        }, state);
    }
}

/**
 * Update prevailing wage display elements
 * @param {Object} data - Prevailing wage data
 * @param {Object} state - Application state
 */
function updatePrevailingWageDisplay(data, state) {
    // Update main UI display
    document.getElementById('pwZip').textContent = data.location?.zip || '';
    document.getElementById('pwJourneyman').textContent = `$${data.prevailingWage?.electricianJourneyman?.toFixed(2) || '85.50'}/hr`;
    document.getElementById('pwTotal').textContent = `$${data.prevailingWage?.totalHourly?.toFixed(2) || '117.50'}/hr`;
    document.getElementById('pwPerDiem').textContent = `$${data.perDiem?.total || '166'}/day`;
    document.getElementById('pwZone').textContent = `Zone ${data.location?.zone || '3'}`;

    // Store the data for later use
    state.prevailingWageData = data;

    // Update labor rate display
    updateLaborRateDisplay(state);
}

/**
 * Update labor rate display in quote summary
 * @param {Object} state - Application state
 */
export function updateLaborRateDisplay(state) {
    // FIXED: Get settings from state.activeSettings (correct source)
    const settings = state.activeSettings || window.state?.activeSettings || {};
    let effectiveLaborRate = settings.laborRate || 180.00;
    let effectiveMobilizationRate = settings.mobilizationRate || effectiveLaborRate;
    const checkbox = document.getElementById('prevailingWageRequired');

    if (checkbox && checkbox.checked && state.prevailingWageData) {
        // Use prevailing wage rate if public works is checked
        effectiveLaborRate = state.prevailingWageData.prevailingWage?.totalHourly ||
                           state.prevailingWageData.prevailingWage?.electricianJourneyman ||
                           effectiveLaborRate;
        effectiveMobilizationRate = effectiveLaborRate; // Mobilization uses same rate as labor
    }

    // Update the labor rate display
    const laborRateElement = document.getElementById('summary-labor-rate');
    if (laborRateElement) {
        laborRateElement.textContent = `$${effectiveLaborRate.toFixed(2)}/hr`;

        // Add visual indicator if using prevailing wage
        if (checkbox && checkbox.checked) {
            laborRateElement.style.color = 'var(--accent-green)';
            laborRateElement.title = 'Prevailing Wage Rate';
        } else {
            laborRateElement.style.color = '';
            laborRateElement.title = 'Standard Rate';
        }
    }

    // FIXED: Update the mobilization rate display (was missing)
    const mobilizationRateElement = document.getElementById('summary-mobilization-rate');
    if (mobilizationRateElement) {
        mobilizationRateElement.textContent = `$${effectiveMobilizationRate.toFixed(2)}/hr`;

        // Add visual indicator if using prevailing wage
        if (checkbox && checkbox.checked) {
            mobilizationRateElement.style.color = 'var(--accent-green)';
            mobilizationRateElement.title = 'Prevailing Wage Rate';
        } else {
            mobilizationRateElement.style.color = '';
            mobilizationRateElement.title = 'Standard Rate';
        }
    }
}

// Helper functions imported from utilities.js

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.customerEnrichment = {
        enrichCustomer,
        handlePrevailingWageChange,
        fetchPrevailingWageData,
        updateLaborRateDisplay
    };
}
