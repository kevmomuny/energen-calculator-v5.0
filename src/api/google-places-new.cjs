/**
 * Google Places API (New) Service
 * Implements the new Places API with Place Details, Text Search, and Autocomplete
 * Documentation: https://developers.google.com/maps/documentation/places/web-service/op-overview
 */

const axios = require('axios');

class GooglePlacesNew {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('❌ CRITICAL: Google Places API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://places.googleapis.com/v1';
    this.timeout = 5000;
  }

  /**
     * Get standard headers for API requests
     * @returns {Object} Headers with API key and content type
     */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': '' // Will be set per request
    };
  }

  /**
     * Autocomplete - Get place predictions based on user input
     * @param {string} input - The text input from the user
     * @param {Object} options - Optional parameters
     * @param {Array<string>} options.types - Place types to filter (e.g., ['establishment'])
     * @param {Object} options.locationBias - Bias results to a specific location
     * @param {string} options.languageCode - Language for results (default: 'en')
     * @returns {Promise<Object>} Autocomplete response with suggestions
     */
  async autocomplete(input, options = {}) {
    try {
      if (!input || typeof input !== 'string') {
        throw new Error('Input text is required for autocomplete');
      }

      const url = `${this.baseUrl}/places:autocomplete`;

      const body = {
        input: input,
        languageCode: options.languageCode || 'en'
      };

      // Add optional parameters
      if (options.types && Array.isArray(options.types)) {
        body.includedPrimaryTypes = options.types;
      } else {
        // Default to establishment type for business searches
        body.includedPrimaryTypes = ['establishment'];
      }

      if (options.locationBias) {
        body.locationBias = options.locationBias;
      }

      if (options.locationRestriction) {
        body.locationRestriction = options.locationRestriction;
      }

      if (options.includeQueryPredictions !== undefined) {
        body.includeQueryPredictions = options.includeQueryPredictions;
      }

      console.log(`🔍 [Google Places New] Autocomplete request: "${input}"`);

      const response = await axios.post(url, body, {
        headers: this.getHeaders(),
        timeout: this.timeout
      });

      console.log(`✅ [Google Places New] Autocomplete success: ${response.data.suggestions?.length || 0} suggestions`);

      return {
        success: true,
        data: response.data,
        method: 'places_api_new'
      };

    } catch (error) {
      console.error('❌ [Google Places New] Autocomplete error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
     * Text Search - Search for places using text query
     * @param {string} query - The search query (e.g., "pizza restaurants in New York")
     * @param {Object} options - Optional parameters
     * @param {Array<string>} options.includedTypes - Place types to include
     * @param {Object} options.locationBias - Bias results to a specific location
     * @param {number} options.maxResultCount - Maximum number of results (max: 20)
     * @param {string} options.languageCode - Language for results (default: 'en')
     * @returns {Promise<Object>} Search results with places
     */
  async searchText(query, options = {}) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Query text is required for text search');
      }

      const url = `${this.baseUrl}/places:searchText`;

      const body = {
        textQuery: query,
        languageCode: options.languageCode || 'en',
        maxResultCount: options.maxResultCount || 10
      };

      // Add optional parameters
      if (options.includedTypes && Array.isArray(options.includedTypes)) {
        body.includedTypes = options.includedTypes;
      }

      if (options.excludedTypes && Array.isArray(options.excludedTypes)) {
        body.excludedTypes = options.excludedTypes;
      }

      if (options.locationBias) {
        body.locationBias = options.locationBias;
      }

      if (options.locationRestriction) {
        body.locationRestriction = options.locationRestriction;
      }

      if (options.rankPreference) {
        body.rankPreference = options.rankPreference;
      }

      console.log(`🔍 [Google Places New] Text search request: "${query}"`);

      const headers = this.getHeaders();
      // Add field mask for text search
      headers['X-Goog-FieldMask'] = this.getDetailedFields();

      const response = await axios.post(url, body, {
        headers: headers,
        timeout: this.timeout
      });

      console.log(`✅ [Google Places New] Text search success: ${response.data.places?.length || 0} places found`);

      return {
        success: true,
        data: response.data,
        method: 'places_api_new'
      };

    } catch (error) {
      console.error('❌ [Google Places New] Text search error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
     * Get Place Details - Retrieve detailed information about a specific place
     * @param {string} placeId - The place ID from autocomplete or search
     * @param {Array<string>} fields - Optional specific fields to retrieve
     * @returns {Promise<Object>} Place details
     */
  async getPlaceDetails(placeId, fields = null) {
    try {
      if (!placeId || typeof placeId !== 'string') {
        throw new Error('Place ID is required for place details');
      }

      const url = `${this.baseUrl}/places/${placeId}`;

      console.log(`🔍 [Google Places New] Place details request: ${placeId}`);

      const headers = this.getHeaders();
      // Set field mask - use provided fields or default to detailed fields
      headers['X-Goog-FieldMask'] = fields ? fields.join(',') : this.getDetailedFields();

      const response = await axios.get(url, {
        headers: headers,
        timeout: this.timeout
      });

      console.log(`✅ [Google Places New] Place details success: ${response.data.displayName?.text || 'Unknown place'}`);

      return {
        success: true,
        data: response.data,
        method: 'places_api_new'
      };

    } catch (error) {
      console.error('❌ [Google Places New] Place details error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
     * Get Photo URL - Generate a photo URL for a place photo
     * @param {string} photoName - The photo resource name (e.g., "places/ChIJ.../photos/...")
     * @param {number} maxWidth - Maximum width in pixels (max: 4800)
     * @param {number} maxHeight - Maximum height in pixels (max: 4800)
     * @returns {string} Photo URL
     */
  getPhotoUrl(photoName, maxWidth = 400, maxHeight = 400) {
    if (!photoName) {
      throw new Error('Photo name is required');
    }

    // Ensure maxWidth and maxHeight are within limits
    const width = Math.min(maxWidth, 4800);
    const height = Math.min(maxHeight, 4800);

    // New API uses a different URL format
    return `${this.baseUrl}/${photoName}/media?maxHeightPx=${height}&maxWidthPx=${width}&key=${this.apiKey}`;
  }

  /**
     * Get autocomplete field mask
     * Returns minimal fields needed for autocomplete suggestions
     * @returns {string} Field mask string
     */
  getAutocompleteFields() {
    return [
      'suggestions.placePrediction.placeId',
      'suggestions.placePrediction.text',
      'suggestions.placePrediction.structuredFormat',
      'suggestions.placePrediction.types'
    ].join(',');
  }

  /**
     * Get basic place fields
     * Returns essential business information fields
     * @returns {string} Field mask string
     */
  getBasicFields() {
    return [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'businessStatus',
      'userRatingCount',
      'rating',
      'googleMapsUri'
    ].join(',');
  }

  /**
     * Get detailed place fields
     * Returns comprehensive place information
     * @returns {string} Field mask string
     */
  getDetailedFields() {
    return [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'viewport',
      'types',
      'primaryType',
      'businessStatus',
      'userRatingCount',
      'rating',
      'googleMapsUri',
      'websiteUri',
      'internationalPhoneNumber',
      'nationalPhoneNumber',
      'addressComponents',
      'photos',
      'reviews',
      'regularOpeningHours',
      'currentOpeningHours',
      'utcOffsetMinutes',
      'priceLevel',
      'attributions'
    ].join(',');
  }

  /**
     * Get all available fields
     * Returns maximum possible fields (use sparingly due to quota)
     * @returns {string} Field mask string
     */
  getAllFields() {
    return '*';
  }
}

/**
 * Factory function to create a new GooglePlacesNew instance
 * @param {string} apiKey - Google Places API key
 * @returns {GooglePlacesNew} New instance
 */
function createGooglePlacesNew(apiKey) {
  return new GooglePlacesNew(apiKey);
}

module.exports = {
  GooglePlacesNew,
  createGooglePlacesNew
};
