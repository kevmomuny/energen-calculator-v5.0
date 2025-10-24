/**
 * Google Places API Adapter
 * Normalizes responses between Legacy API and New API formats
 * Ensures backward compatibility when migrating from Legacy to New API
 */

const { createLogger } = require('../utils/logger.cjs');
const logger = createLogger('GooglePlacesAdapter');

/**
 * Adapt New API autocomplete response to Legacy format
 * @param {Object} newResponse - Response from New API autocomplete
 * @returns {Object} Legacy format autocomplete response
 */
function adaptAutocompleteResponse(newResponse) {
    try {
        // Handle error responses
        if (!newResponse.success || !newResponse.data) {
            logger.warn('Failed autocomplete response:', newResponse.error);
            return {
                predictions: [],
                status: 'ZERO_RESULTS',
                error: newResponse.error
            };
        }

        const suggestions = newResponse.data.suggestions || [];

        // Transform each suggestion to legacy prediction format
        const predictions = suggestions
            .filter(suggestion => suggestion.placePrediction) // Only process place predictions
            .map(suggestion => {
                const pred = suggestion.placePrediction;

                return {
                    description: pred.text?.text || '',
                    place_id: pred.placeId || '',
                    structured_formatting: {
                        main_text: pred.structuredFormat?.mainText?.text || pred.text?.text || '',
                        secondary_text: pred.structuredFormat?.secondaryText?.text || '',
                        main_text_matched_substrings: pred.structuredFormat?.mainText?.matches || []
                    },
                    types: pred.types || [],
                    reference: pred.placeId || '' // Legacy field
                };
            });

        logger.debug(`Autocomplete adapted: ${predictions.length} predictions`);

        return {
            predictions: predictions,
            status: predictions.length > 0 ? 'OK' : 'ZERO_RESULTS'
        };

    } catch (error) {
        logger.error('Autocomplete adaptation error:', error.message);
        return {
            predictions: [],
            status: 'ERROR',
            error: error.message
        };
    }
}

/**
 * Adapt New API place details response to Legacy format
 * @param {Object} newResponse - Response from New API getPlaceDetails
 * @returns {Object} Legacy format place details response
 */
function adaptPlaceDetailsResponse(newResponse) {
    try {
        // Handle error responses
        if (!newResponse.success || !newResponse.data) {
            logger.warn('Failed place details response:', newResponse.error);
            return {
                result: null,
                status: 'NOT_FOUND',
                error: newResponse.error
            };
        }

        const place = newResponse.data;

        // Transform to legacy result format
        const result = {
            place_id: place.id || '',
            name: place.displayName?.text || '',
            formatted_address: place.formattedAddress || '',
            formatted_phone_number: place.internationalPhoneNumber || '',
            international_phone_number: place.internationalPhoneNumber || '',
            website: place.websiteUri || '',
            url: place.googleMapsUri || '',
            rating: place.rating || null,
            user_ratings_total: place.userRatingCount || 0,
            price_level: place.priceLevel || null,
            business_status: place.businessStatus || 'OPERATIONAL',
            types: place.types || [],

            // Geometry (location)
            geometry: {
                location: place.location ? {
                    lat: place.location.latitude,
                    lng: place.location.longitude
                } : null,
                viewport: place.viewport ? {
                    northeast: {
                        lat: place.viewport.high?.latitude,
                        lng: place.viewport.high?.longitude
                    },
                    southwest: {
                        lat: place.viewport.low?.latitude,
                        lng: place.viewport.low?.longitude
                    }
                } : null
            },

            // Address components
            address_components: adaptAddressComponents(place.addressComponents),

            // Photos
            photos: adaptPhotos(place.photos),

            // Reviews
            reviews: adaptReviews(place.reviews),

            // Opening hours
            opening_hours: adaptOpeningHours(place.regularOpeningHours || place.currentOpeningHours),

            // UTC offset
            utc_offset: place.utcOffsetMinutes || null
        };

        logger.debug(`Place details adapted: ${result.name}`);

        return {
            result: result,
            status: 'OK'
        };

    } catch (error) {
        logger.error('Place details adaptation error:', error.message);
        return {
            result: null,
            status: 'ERROR',
            error: error.message
        };
    }
}

/**
 * Adapt New API text search response to Legacy format
 * @param {Object} newResponse - Response from New API searchText
 * @returns {Object} Legacy format search results
 */
function adaptTextSearchResponse(newResponse) {
    try {
        // Handle error responses
        if (!newResponse.success || !newResponse.data) {
            logger.warn('Failed text search response:', newResponse.error);
            return {
                results: [],
                status: 'ZERO_RESULTS',
                error: newResponse.error
            };
        }

        const places = newResponse.data.places || [];

        // Transform each place to legacy result format
        const results = places.map(place => ({
            place_id: place.id || '',
            name: place.displayName?.text || '',
            formatted_address: place.formattedAddress || '',
            rating: place.rating || null,
            user_ratings_total: place.userRatingCount || 0,
            price_level: place.priceLevel || null,
            business_status: place.businessStatus || 'OPERATIONAL',
            types: place.types || [],

            geometry: {
                location: place.location ? {
                    lat: place.location.latitude,
                    lng: place.location.longitude
                } : null,
                viewport: place.viewport ? {
                    northeast: {
                        lat: place.viewport.high?.latitude,
                        lng: place.viewport.high?.longitude
                    },
                    southwest: {
                        lat: place.viewport.low?.latitude,
                        lng: place.viewport.low?.longitude
                    }
                } : null
            },

            photos: adaptPhotos(place.photos),
            opening_hours: place.regularOpeningHours ? {
                open_now: place.regularOpeningHours.openNow || false
            } : null
        }));

        logger.debug(`Text search adapted: ${results.length} results`);

        return {
            results: results,
            status: results.length > 0 ? 'OK' : 'ZERO_RESULTS'
        };

    } catch (error) {
        logger.error('Text search adaptation error:', error.message);
        return {
            results: [],
            status: 'ERROR',
            error: error.message
        };
    }
}

/**
 * Helper: Adapt address components from New to Legacy format
 * @param {Array} newComponents - New API address components
 * @returns {Array} Legacy format address components
 */
function adaptAddressComponents(newComponents) {
    if (!Array.isArray(newComponents)) {
        return [];
    }

    return newComponents.map(component => ({
        long_name: component.longText || '',
        short_name: component.shortText || '',
        types: component.types || []
    }));
}

/**
 * Helper: Adapt photos from New to Legacy format
 * @param {Array} newPhotos - New API photos array
 * @returns {Array} Legacy format photos
 */
function adaptPhotos(newPhotos) {
    if (!Array.isArray(newPhotos)) {
        return [];
    }

    return newPhotos.map(photo => ({
        photo_reference: photo.name || '', // New API uses resource name instead
        height: photo.heightPx || 0,
        width: photo.widthPx || 0,
        html_attributions: photo.authorAttributions?.map(attr =>
            `<a href="${attr.uri || ''}">${attr.displayName || ''}</a>`
        ) || []
    }));
}

/**
 * Helper: Adapt reviews from New to Legacy format
 * @param {Array} newReviews - New API reviews array
 * @returns {Array} Legacy format reviews
 */
function adaptReviews(newReviews) {
    if (!Array.isArray(newReviews)) {
        return [];
    }

    return newReviews.map(review => ({
        author_name: review.authorAttribution?.displayName || 'Anonymous',
        author_url: review.authorAttribution?.uri || '',
        profile_photo_url: review.authorAttribution?.photoUri || '',
        rating: review.rating || 0,
        relative_time_description: review.relativePublishTimeDescription || '',
        text: review.text?.text || review.originalText?.text || '',
        time: review.publishTime ? new Date(review.publishTime).getTime() / 1000 : 0
    }));
}

/**
 * Helper: Adapt opening hours from New to Legacy format
 * @param {Object} newHours - New API opening hours object
 * @returns {Object} Legacy format opening hours
 */
function adaptOpeningHours(newHours) {
    if (!newHours) {
        return null;
    }

    return {
        open_now: newHours.openNow || false,
        periods: newHours.periods?.map(period => ({
            open: {
                day: period.open?.day || 0,
                time: period.open?.hour * 100 + period.open?.minute || 0
            },
            close: period.close ? {
                day: period.close.day || 0,
                time: period.close.hour * 100 + period.close.minute || 0
            } : undefined
        })) || [],
        weekday_text: newHours.weekdayDescriptions || []
    };
}

/**
 * Detect if a response is from New API format
 * @param {Object} response - API response to check
 * @returns {boolean} True if New API format detected
 */
function isNewAPIFormat(response) {
    // Check for New API specific fields
    if (response.suggestions && Array.isArray(response.suggestions)) {
        return true; // Autocomplete New API
    }
    if (response.places && Array.isArray(response.places)) {
        return true; // Text Search New API
    }
    if (response.displayName || response.formattedAddress) {
        return true; // Place Details New API
    }
    return false;
}

/**
 * Detect if a response is from Legacy API format
 * @param {Object} response - API response to check
 * @returns {boolean} True if Legacy API format detected
 */
function isLegacyAPIFormat(response) {
    // Check for Legacy API specific fields
    if (response.predictions && Array.isArray(response.predictions)) {
        return true; // Autocomplete Legacy API
    }
    if (response.results && Array.isArray(response.results)) {
        return true; // Search Legacy API
    }
    if (response.result && response.result.name) {
        return true; // Place Details Legacy API
    }
    return false;
}

/**
 * Auto-detect and adapt response format
 * @param {Object} response - Raw API response
 * @param {string} apiType - Type of API call ('autocomplete', 'details', 'search')
 * @returns {Object} Normalized response in Legacy format
 */
function autoAdapt(response, apiType) {
    // If already in Legacy format, return as-is
    if (isLegacyAPIFormat(response)) {
        logger.debug(`Response already in Legacy format (${apiType})`);
        return response;
    }

    // If in New format, adapt to Legacy
    if (isNewAPIFormat(response)) {
        logger.debug(`Adapting New API format to Legacy (${apiType})`);

        switch (apiType) {
            case 'autocomplete':
                return adaptAutocompleteResponse({ success: true, data: response });
            case 'details':
                return adaptPlaceDetailsResponse({ success: true, data: response });
            case 'search':
                return adaptTextSearchResponse({ success: true, data: response });
            default:
                logger.warn(`Unknown API type: ${apiType}`);
                return response;
        }
    }

    // Unknown format, return as-is with warning
    logger.warn(`Unknown response format for ${apiType}`);
    return response;
}

module.exports = {
    adaptAutocompleteResponse,
    adaptPlaceDetailsResponse,
    adaptTextSearchResponse,
    isNewAPIFormat,
    isLegacyAPIFormat,
    autoAdapt
};
