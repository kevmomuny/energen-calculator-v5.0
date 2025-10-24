/**
 * Dual-Source Enrichment Endpoint
 * Queries both Zoho CRM and Google Places simultaneously for autocomplete
 *
 * Priority: Zoho results show FIRST if matches exist
 * Fallback: Google Places results show automatically if no Zoho matches
 */

const axios = require('axios');
const config = require('./config.cjs');

class DualSourceEnrichment {
  constructor(zohoIntegration, logger) {
    this.zohoIntegration = zohoIntegration;
    this.logger = logger;
  }

  /**
   * Search both Zoho CRM and Google Places simultaneously
   * @param {string} query - Search query (company name + optional address)
   * @param {Object} options - Search options
   * @returns {Promise<{success: boolean, sources: {zoho: Array, googlePlaces: Array}}>}
   */
  async dualSearch(query, options = {}) {
    const { limit = 10, minChars = 3 } = options;

    // Validate input
    if (!query || query.trim().length < minChars) {
      return {
        success: true,
        sources: {
          zoho: [],
          googlePlaces: []
        },
        message: `Query must be at least ${minChars} characters`
      };
    }

    this.logger.info('Dual-source search:', { query, limit });

    // Execute both searches in parallel
    const [zohoResults, googleResults] = await Promise.allSettled([
      this.searchZoho(query, limit),
      this.searchGooglePlaces(query, limit)
    ]);

    // Process results
    const zohoData = zohoResults.status === 'fulfilled' ? zohoResults.value : [];
    const googleData = googleResults.status === 'fulfilled' ? googleResults.value : [];

    // Log any errors but don't fail the request
    if (zohoResults.status === 'rejected') {
      this.logger.warn('Zoho search failed:', zohoResults.reason.message);
    }
    if (googleResults.status === 'rejected') {
      this.logger.warn('Google Places search failed:', googleResults.reason.message);
    }

    return {
      success: true,
      sources: {
        zoho: zohoData,
        googlePlaces: googleData
      },
      stats: {
        zohoCount: zohoData.length,
        googleCount: googleData.length,
        totalResults: zohoData.length + googleData.length
      }
    };
  }

  /**
   * Search Zoho CRM accounts
   * @private
   */
  async searchZoho(query, limit) {
    try {
      const customers = await this.zohoIntegration.searchAccounts(query, { limit });

      // Format for consistent response
      return customers.map(customer => ({
        id: customer.id,
        name: customer.name || customer.Account_Name,
        address: customer.address || this.formatZohoAddress(customer),
        phone: customer.phone || customer.Phone,
        website: customer.website || customer.Website,
        email: customer.email || customer.Email,
        city: customer.city || customer.Billing_City,
        state: customer.state || customer.Billing_State,
        zip: customer.zip || customer.Billing_Code,
        type: customer.type || 'Customer',
        source: 'zoho',
        sourceIcon: 'business',
        sourceLabel: 'Zoho CRM',
        sourceColor: '#FF6F00' // Orange for Zoho
      }));
    } catch (error) {
      this.logger.error('Zoho search error:', error);
      throw error;
    }
  }

  /**
   * Search Google Places API
   * @private
   */
  async searchGooglePlaces(query, limit) {
    try {
      const apiKey = config.google.placesApiKey;
      if (!apiKey) {
        this.logger.warn('Google Places API key not configured');
        return [];
      }

      // Use Autocomplete API (New) for better results
      const url = 'https://places.googleapis.com/v1/places:autocomplete';

      const response = await axios.post(
        url,
        {
          input: query,
          includedPrimaryTypes: ['establishment', 'business'],
          languageCode: 'en'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.place,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
          },
          timeout: 5000
        }
      );

      const suggestions = response.data.suggestions || [];

      // Take first 'limit' results
      return suggestions
        .slice(0, limit)
        .map(suggestion => {
          const prediction = suggestion.placePrediction;
          const placeId = prediction.place?.replace('places/', '');

          return {
            placeId: placeId,
            name: prediction.structuredFormat?.mainText?.text || prediction.text?.text,
            address: prediction.structuredFormat?.secondaryText?.text || '',
            source: 'googlePlaces',
            sourceIcon: 'location_on',
            sourceLabel: 'Google Places',
            sourceColor: '#4285F4', // Blue for Google
            // Additional metadata for enrichment
            fullText: prediction.text?.text
          };
        });
    } catch (error) {
      this.logger.error('Google Places search error:', error);
      throw error;
    }
  }

  /**
   * Format Zoho address from components
   * @private
   */
  formatZohoAddress(customer) {
    const parts = [];
    if (customer.Billing_Street) parts.push(customer.Billing_Street);
    if (customer.Billing_City) parts.push(customer.Billing_City);
    if (customer.Billing_State) {
      const state = customer.Billing_State;
      const zip = customer.Billing_Code;
      parts.push(zip ? `${state} ${zip}` : state);
    } else if (customer.Billing_Code) {
      parts.push(customer.Billing_Code);
    }
    return parts.join(', ');
  }

  /**
   * Merge and enrich selected customer data
   * @param {Object} selection - Selected item from autocomplete
   * @param {string} selection.source - 'zoho' or 'googlePlaces'
   * @param {string} selection.id - Zoho account ID or Google place ID
   * @returns {Promise<Object>} Enriched customer data
   */
  async mergeCustomerData(selection) {
    const { source, id, placeId, name } = selection;

    if (source === 'zoho') {
      // Zoho selection - fetch full account data
      this.logger.info('Fetching Zoho account details:', id);

      try {
        const accountData = await this.zohoIntegration.getAccountById(id);

        return {
          success: true,
          source: 'zoho',
          data: {
            zohoAccountId: id,
            name: accountData.Account_Name || accountData.name,
            phone: accountData.Phone || accountData.phone,
            email: accountData.Email || accountData.email,
            website: accountData.Website || accountData.website,
            address: accountData.Billing_Street,
            city: accountData.Billing_City,
            state: accountData.Billing_State,
            zip: accountData.Billing_Code,
            country: accountData.Billing_Country || 'USA',
            industry: accountData.Industry,
            type: accountData.Type || 'Customer',
            // Include raw data for debugging
            rawData: accountData
          }
        };
      } catch (error) {
        this.logger.error('Failed to fetch Zoho account:', error);
        throw error;
      }
    } else if (source === 'googlePlaces') {
      // Google Places selection - enrich with Place Details API
      this.logger.info('Enriching Google Places selection:', placeId || name);

      try {
        const apiKey = config.google.placesApiKey;
        if (!apiKey) {
          throw new Error('Google Places API key not configured');
        }

        // Get place details using new API
        const url = `https://places.googleapis.com/v1/places/${placeId}`;

        const response = await axios.get(url, {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,phoneNumber,websiteUri,types,location'
          },
          timeout: 5000
        });

        const place = response.data;

        // Parse address components
        const addressComponents = this.parseAddressComponents(place.addressComponents || []);

        return {
          success: true,
          source: 'googlePlaces',
          data: {
            placeId: place.id,
            name: place.displayName?.text || name,
            phone: place.phoneNumber?.replace(/\D/g, '').replace(/^1/, ''), // Normalize phone
            website: place.websiteUri,
            address: addressComponents.street,
            city: addressComponents.city,
            state: addressComponents.state,
            zip: addressComponents.zip,
            country: addressComponents.country || 'USA',
            formattedAddress: place.formattedAddress,
            types: place.types || [],
            location: place.location,
            // Mark as new (not in Zoho)
            isNew: true
          }
        };
      } catch (error) {
        this.logger.error('Failed to enrich Google Places:', error);
        throw error;
      }
    } else {
      throw new Error('Invalid source: ' + source);
    }
  }

  /**
   * Parse Google Places address components
   * @private
   */
  parseAddressComponents(components) {
    const result = {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    };

    let streetNumber = '';
    let route = '';

    for (const component of components) {
      const types = component.types || [];
      const longName = component.longText || '';
      const shortName = component.shortText || '';

      if (types.includes('street_number')) {
        streetNumber = longName;
      } else if (types.includes('route')) {
        route = longName;
      } else if (types.includes('locality') || types.includes('sublocality')) {
        result.city = longName;
      } else if (types.includes('administrative_area_level_1')) {
        result.state = shortName; // Use short name for state abbreviation
      } else if (types.includes('postal_code')) {
        result.zip = longName;
      } else if (types.includes('country')) {
        result.country = longName;
      }
    }

    // Combine street number and route
    if (streetNumber && route) {
      result.street = `${streetNumber} ${route}`;
    } else if (route) {
      result.street = route;
    }

    return result;
  }
}

module.exports = DualSourceEnrichment;
