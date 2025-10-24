/**
 * Customer Data Enrichment Pipeline
 * Orchestrates logo fetching, distance calculation, prevailing wage lookup, and Zoho integration
 * @module customer-enrichment
 * @version 1.0.0
 */

const axios = require('axios');
const fetch = require('node-fetch');
const PrevailingWageService = require('./prevailing-wage-service.cjs');
const config = require('./config.cjs');
const { createGooglePlacesNew } = require('./google-places-new.cjs');
const GooglePlacesAdapter = require('./google-places-adapter.cjs');

class CustomerEnrichmentService {
  constructor(zohoIntegration, logger = null) {
    this.logger = logger || console;
    this.zohoIntegration = zohoIntegration;
    this.prevailingWageService = new PrevailingWageService(logger);

    // Energen shop address (from settings or config)
    this.shopAddress = process.env.ENERGEN_SHOP_ADDRESS || '1520 Sheridan Ave, North Highlands, CA 95660';

    // Cache for enrichment results (24 hours TTL)
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

    // Performance metrics
    this.metrics = {
      totalEnrichments: 0,
      successfulEnrichments: 0,
      failedEnrichments: 0,
      avgEnrichmentTime: 0,
      logoFetches: 0,
      distanceCalculations: 0,
      prevailingWageLookups: 0
    };
  }

  /**
   * Main enrichment orchestrator
   * @param {string} accountId - Zoho Account ID
   * @param {string} accountName - Company name
   * @param {Object} address - Address object with street, city, state, zip
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Enriched data object
   */
  async enrichCustomerData(accountId, accountName, address, options = {}) {
    const startTime = Date.now();
    const enrichmentId = `${accountId}-${Date.now()}`;

    this.logger.info('🔍 Starting customer enrichment', {
      accountId,
      accountName,
      address: `${address.city}, ${address.state} ${address.zip}`
    });

    // Check cache first
    const cacheKey = `enrichment-${accountId}`;
    if (this.cache.has(cacheKey) && !options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        this.logger.info('✅ Using cached enrichment data', { accountId });
        return cached.data;
      }
    }

    const enrichedData = {
      accountId,
      accountName,
      enrichmentDate: new Date().toISOString(),
      errors: []
    };

    try {
      // Parallel enrichment tasks for performance
      const enrichmentTasks = [];

      // 1. Google Places Logo + Business Info
      if (options.includeLogo !== false) {
        enrichmentTasks.push(
          this.fetchGooglePlacesData(accountName, address)
            .then(placesData => {
              enrichedData.placesData = placesData;
              this.metrics.logoFetches++;
              return placesData;
            })
            .catch(err => {
              this.logger.error('Logo fetch failed:', err);
              enrichedData.errors.push({ type: 'logo', error: err.message });
              return null;
            })
        );
      }

      // 2. Distance Calculation
      if (options.includeDistance !== false && address.street && address.city) {
        enrichmentTasks.push(
          this.calculateDistance(this.shopAddress, this.formatAddress(address))
            .then(distanceData => {
              enrichedData.distanceData = distanceData;
              this.metrics.distanceCalculations++;
              return distanceData;
            })
            .catch(err => {
              this.logger.error('Distance calculation failed:', err);
              enrichedData.errors.push({ type: 'distance', error: err.message });
              return null;
            })
        );
      }

      // 3. Prevailing Wage Lookup
      if (options.includePrevailingWage !== false && address.zip) {
        enrichmentTasks.push(
          this.lookupPrevailingWage(address.zip, address.state || 'CA', 'generator_maintenance')
            .then(wageData => {
              enrichedData.prevailingWageData = wageData;
              this.metrics.prevailingWageLookups++;
              return wageData;
            })
            .catch(err => {
              this.logger.error('Prevailing wage lookup failed:', err);
              enrichedData.errors.push({ type: 'prevailing_wage', error: err.message });
              return null;
            })
        );
      }

      // Wait for all enrichment tasks to complete
      await Promise.all(enrichmentTasks);

      // 4. Update Zoho Account with enriched data
      if (this.zohoIntegration && options.updateZoho !== false) {
        try {
          await this.updateZohoAccount(accountId, enrichedData);
          this.logger.info('✅ Zoho account updated with enriched data', { accountId });
        } catch (err) {
          this.logger.error('Zoho update failed:', err);
          enrichedData.errors.push({ type: 'zoho_update', error: err.message });
        }
      }

      // Calculate enrichment duration
      enrichedData.enrichmentDuration = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(enrichedData.enrichmentDuration, enrichedData.errors.length === 0);

      // Cache the result
      this.cache.set(cacheKey, {
        data: enrichedData,
        timestamp: Date.now()
      });

      this.logger.info('✅ Customer enrichment complete', {
        accountId,
        duration: enrichedData.enrichmentDuration,
        errors: enrichedData.errors.length
      });

      return enrichedData;

    } catch (error) {
      this.logger.error('❌ Customer enrichment failed:', error);
      this.metrics.failedEnrichments++;

      enrichedData.errors.push({
        type: 'enrichment_failure',
        error: error.message
      });
      enrichedData.enrichmentDuration = Date.now() - startTime;

      return enrichedData;
    }
  }

  /**
   * Fetch Google Places data including logo
   * @param {string} businessName - Business name
   * @param {Object} address - Address object
   * @returns {Promise<Object>} Places data with logo URL
   */
  async fetchGooglePlacesData(businessName, address) {
    const GOOGLE_API_KEY = config.google.mapsApiKey;
    const searchQuery = `${businessName} ${address.city}, ${address.state}`;
    const useNewAPI = config.google.useNewPlacesAPI;

    this.logger.info(`Searching Google Places (${useNewAPI ? 'New API' : 'Legacy API'}):`, searchQuery);

    try {
      // Try New API if enabled
      if (useNewAPI) {
        try {
          return await this._fetchGooglePlacesDataNewAPI(businessName, address, GOOGLE_API_KEY, searchQuery);
        } catch (newAPIError) {
          this.logger.warn('🔄 New Places API failed, falling back to Legacy API', {
            error: newAPIError.message
          });
          // Fall through to Legacy API
        }
      }

      // Legacy API path (or fallback)
      return await this._fetchGooglePlacesDataLegacyAPI(businessName, address, GOOGLE_API_KEY, searchQuery);

    } catch (error) {
      this.logger.error('❌ Google Places lookup failed:', error);
      return {
        found: false,
        logoUrl: this.getDefaultLogoUrl(businessName),
        error: error.message
      };
    }
  }

  /**
   * Fetch Google Places data using New API (v1)
   * @private
   */
  async _fetchGooglePlacesDataNewAPI(businessName, address, apiKey, searchQuery) {
    const placesNew = createGooglePlacesNew(apiKey);

    // Step 1: Text Search to find the place
    const searchResponse = await placesNew.searchText(searchQuery, {
      fields: ['places.id', 'places.displayName', 'places.formattedAddress',
               'places.internationalPhoneNumber', 'places.websiteUri', 'places.photos']
    });

    if (!searchResponse.success || !searchResponse.data.places || searchResponse.data.places.length === 0) {
      this.logger.warn('No Google Places results found (New API):', businessName);
      return {
        found: false,
        logoUrl: this.getDefaultLogoUrl(businessName),
        apiVersion: 'new'
      };
    }

    const place = searchResponse.data.places[0];
    const placeId = place.id;

    // Step 2: Get Place Details with photos
    const detailsResponse = await placesNew.getPlaceDetails(placeId, {
      fields: ['id', 'displayName', 'formattedAddress', 'internationalPhoneNumber',
               'websiteUri', 'photos']
    });

    if (!detailsResponse.success) {
      throw new Error(`New API Details failed: ${detailsResponse.error}`);
    }

    const placeDetails = detailsResponse.data;

    // Step 3: Extract logo/photo (New API uses resource names)
    let logoUrl = null;
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photoName = placeDetails.photos[0].name;
      logoUrl = placesNew.getPhotoUrl(photoName, 400);
    }

    // Fallback to domain-based logo services
    if (!logoUrl && placeDetails.websiteUri) {
      try {
        const domain = new URL(placeDetails.websiteUri).hostname.replace('www.', '');
        logoUrl = `https://cdn.brandfetch.io/${domain}/w/200/h/200`;
      } catch (urlError) {
        this.logger.warn('Invalid website URL:', placeDetails.websiteUri);
      }
    }

    // Ultimate fallback: lettermark
    if (!logoUrl) {
      logoUrl = this.getDefaultLogoUrl(businessName);
    }

    this.logger.info('✅ Places data fetched via New API', { placeId });

    return {
      found: true,
      placeId: placeId,
      name: placeDetails.displayName?.text || businessName,
      formattedAddress: placeDetails.formattedAddress,
      phone: placeDetails.internationalPhoneNumber,
      website: placeDetails.websiteUri,
      logoUrl: logoUrl,
      googlePlacesId: placeId,
      apiVersion: 'new'
    };
  }

  /**
   * Fetch Google Places data using Legacy API
   * @private
   */
  async _fetchGooglePlacesDataLegacyAPI(businessName, address, apiKey, searchQuery) {
    // Step 1: Find Place ID
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    const searchResponse = await axios.get(searchUrl);

    if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
      this.logger.warn('No Google Places results found (Legacy API):', businessName);
      return {
        found: false,
        logoUrl: this.getDefaultLogoUrl(businessName),
        apiVersion: 'legacy'
      };
    }

    const place = searchResponse.data.results[0];
    const placeId = place.place_id;

    // Step 2: Get Place Details including photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,photos,place_id&key=${apiKey}`;
    const detailsResponse = await axios.get(detailsUrl);
    const placeDetails = detailsResponse.data.result;

    // Step 3: Extract logo/photo
    let logoUrl = null;
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photoReference = placeDetails.photos[0].photo_reference;
      logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
    }

    // Fallback to domain-based logo services
    if (!logoUrl && placeDetails.website) {
      try {
        const domain = new URL(placeDetails.website).hostname.replace('www.', '');
        logoUrl = `https://cdn.brandfetch.io/${domain}/w/200/h/200`;
      } catch (urlError) {
        this.logger.warn('Invalid website URL:', placeDetails.website);
      }
    }

    // Ultimate fallback: lettermark
    if (!logoUrl) {
      logoUrl = this.getDefaultLogoUrl(businessName);
    }

    this.logger.info('✅ Places data fetched via Legacy API', { placeId });

    return {
      found: true,
      placeId: placeId,
      name: placeDetails.name,
      formattedAddress: placeDetails.formatted_address,
      phone: placeDetails.formatted_phone_number,
      website: placeDetails.website,
      logoUrl: logoUrl,
      googlePlacesId: placeId,
      apiVersion: 'legacy'
    };
  }

  /**
   * Calculate distance from shop to customer site
   * @param {string} origin - Origin address
   * @param {string} destination - Destination address
   * @returns {Promise<Object>} Distance data
   */
  async calculateDistance(origin, destination) {
    const GOOGLE_API_KEY = config.google.mapsApiKey;

    this.logger.info('Calculating distance:', { origin, destination });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=imperial&mode=driving&key=${GOOGLE_API_KEY}`;

    const response = await axios.get(url);

    if (response.data.status === 'OK' && response.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      const distanceInMiles = Math.round(element.distance.value * 0.000621371); // meters to miles
      const durationMinutes = Math.round(element.duration.value / 60);

      // Try to get traffic duration (weekday morning traffic)
      let trafficDuration = null;
      try {
        const trafficUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=imperial&mode=driving&departure_time=now&traffic_model=best_guess&key=${GOOGLE_API_KEY}`;
        const trafficResponse = await axios.get(trafficUrl);

        if (trafficResponse.data.rows[0]?.elements[0]?.duration_in_traffic) {
          trafficDuration = Math.round(trafficResponse.data.rows[0].elements[0].duration_in_traffic.value / 60);
        }
      } catch (err) {
        this.logger.info('Traffic data not available');
      }

      return {
        distanceMiles: distanceInMiles,
        durationMinutes: durationMinutes,
        trafficDurationMinutes: trafficDuration,
        origin: response.data.origin_addresses[0],
        destination: response.data.destination_addresses[0]
      };
    }

    throw new Error('Unable to calculate distance');
  }

  /**
   * Lookup prevailing wage requirements for location
   * @param {string} zip - ZIP code
   * @param {string} state - State code
   * @param {string} workType - Type of work (default: generator_maintenance)
   * @returns {Promise<Object>} Prevailing wage data
   */
  async lookupPrevailingWage(zip, state = 'CA', workType = 'generator_maintenance') {
    this.logger.info('Looking up prevailing wage:', { zip, state, workType });

    // Use the prevailing wage service
    const wageData = await this.prevailingWageService.getPrevailingWageData(zip, state);

    if (!wageData) {
      return {
        isPrevailingWageRequired: false,
        reason: 'No prevailing wage data available'
      };
    }

    // For generator maintenance, use Operating Engineers Group 8 (Stationary Engineers)
    const classification = 'operatingEngineerGroup8';
    const baseRate = wageData.prevailingWage[classification] || wageData.prevailingWage.operatingEngineerGroup3;
    const totalHourlyRate = wageData.prevailingWage.totalHourly;

    return {
      isPrevailingWageRequired: wageData.isPrevailingWageRequired,
      classification: 'Operating Engineers - Stationary Power Plant (Group 8)',
      baseRate: baseRate,
      totalHourlyRate: totalHourlyRate,
      fringeRate: wageData.breakdown?.healthWelfare || 0,
      county: wageData.location?.county,
      zone: wageData.location?.zone,
      source: wageData.source,
      effectiveDate: wageData.effectiveDate
    };
  }

  /**
   * Update Zoho Account with enriched data
   * @param {string} accountId - Zoho Account ID
   * @param {Object} enrichedData - Enriched customer data
   * @returns {Promise<boolean>} Success status
   */
  async updateZohoAccount(accountId, enrichedData) {
    if (!this.zohoIntegration) {
      this.logger.warn('Zoho integration not available');
      return false;
    }

    const updateData = {
      Enrichment_Date: new Date().toISOString()
    };

    // Add distance data
    if (enrichedData.distanceData) {
      updateData.Distance_Miles = enrichedData.distanceData.distanceMiles;
      updateData.Drive_Time_Minutes = enrichedData.distanceData.durationMinutes;
      if (enrichedData.distanceData.trafficDurationMinutes) {
        updateData.Drive_Time_With_Traffic = enrichedData.distanceData.trafficDurationMinutes;
      }
    }

    // Add prevailing wage data
    if (enrichedData.prevailingWageData) {
      updateData.Requires_Prevailing_Wage = enrichedData.prevailingWageData.isPrevailingWageRequired;
      updateData.Prevailing_Wage_Rate = enrichedData.prevailingWageData.totalHourlyRate;
      updateData.Prevailing_Wage_Classification = enrichedData.prevailingWageData.classification;
      updateData.Prevailing_Wage_County = enrichedData.prevailingWageData.county;
    }

    // Add Google Places data
    if (enrichedData.placesData && enrichedData.placesData.found) {
      updateData.Google_Place_ID = enrichedData.placesData.googlePlacesId;

      // Update website if found and not already set
      if (enrichedData.placesData.website) {
        updateData.Website = enrichedData.placesData.website;
      }

      // Update phone if found and not already set
      if (enrichedData.placesData.phone) {
        updateData.Phone = enrichedData.placesData.phone;
      }
    }

    // Update the Zoho account
    try {
      const response = await this.zohoIntegration.makeApiRequest(
        `/Accounts/${accountId}`,
        'PUT',
        { data: [updateData] }
      );

      this.logger.info('Zoho account updated successfully', { accountId });

      // Upload logo as attachment if available
      if (enrichedData.placesData?.logoUrl) {
        await this.uploadLogoToZoho(accountId, enrichedData.placesData.logoUrl, enrichedData.accountName);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to update Zoho account:', error);
      throw error;
    }
  }

  /**
   * Upload company logo to Zoho as attachment
   * @param {string} accountId - Zoho Account ID
   * @param {string} logoUrl - URL of the logo
   * @param {string} companyName - Company name for filename
   * @returns {Promise<boolean>} Success status
   */
  async uploadLogoToZoho(accountId, logoUrl, companyName) {
    try {
      this.logger.info('Uploading logo to Zoho:', { accountId, logoUrl });

      // Download the logo
      const response = await fetch(logoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status}`);
      }

      const logoBuffer = await response.buffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      const extension = contentType.split('/')[1] || 'png';
      const filename = `${companyName.replace(/[^a-z0-9]/gi, '_')}_logo.${extension}`;

      // Upload to Zoho as attachment
      const token = await this.zohoIntegration.getAccessToken();
      const uploadUrl = `${this.zohoIntegration.apiDomain}/crm/v6/Accounts/${accountId}/Attachments`;

      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', logoBuffer, {
        filename: filename,
        contentType: contentType
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Zoho attachment upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      this.logger.info('✅ Logo uploaded to Zoho successfully', { accountId, filename });
      return true;

    } catch (error) {
      this.logger.error('Failed to upload logo to Zoho:', error);
      // Non-critical error, don't throw
      return false;
    }
  }

  /**
   * Get default lettermark logo URL
   * @param {string} companyName - Company name
   * @returns {string} Logo URL
   */
  getDefaultLogoUrl(companyName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=667eea&color=fff&size=200&bold=true`;
  }

  /**
   * Format address object to string
   * @param {Object} address - Address object
   * @returns {string} Formatted address
   */
  formatAddress(address) {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Update performance metrics
   * @param {number} duration - Enrichment duration in ms
   * @param {boolean} success - Whether enrichment was successful
   */
  updateMetrics(duration, success) {
    this.metrics.totalEnrichments++;

    if (success) {
      this.metrics.successfulEnrichments++;
    } else {
      this.metrics.failedEnrichments++;
    }

    // Update average enrichment time
    const total = this.metrics.totalEnrichments;
    this.metrics.avgEnrichmentTime =
      (this.metrics.avgEnrichmentTime * (total - 1) + duration) / total;
  }

  /**
   * Get enrichment statistics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalEnrichments > 0
        ? ((this.metrics.successfulEnrichments / this.metrics.totalEnrichments) * 100).toFixed(2) + '%'
        : '0%',
      avgEnrichmentTimeSeconds: (this.metrics.avgEnrichmentTime / 1000).toFixed(2)
    };
  }

  /**
   * Clear enrichment cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Enrichment cache cleared');
  }

  /**
   * Batch enrich multiple customers
   * @param {Array} customers - Array of customer objects
   * @param {Object} options - Enrichment options
   * @returns {Promise<Array>} Enriched customer data
   */
  async batchEnrich(customers, options = {}) {
    const batchSize = options.batchSize || 5;
    const results = [];

    this.logger.info(`Starting batch enrichment for ${customers.length} customers`, {
      batchSize
    });

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(customer =>
          this.enrichCustomerData(
            customer.id,
            customer.name,
            customer.address,
            options
          ).catch(error => ({
            accountId: customer.id,
            accountName: customer.name,
            errors: [{ type: 'enrichment_failure', error: error.message }]
          }))
        )
      );

      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < customers.length && options.delayBetweenBatches) {
        await new Promise(resolve =>
          setTimeout(resolve, options.delayBetweenBatches)
        );
      }
    }

    this.logger.info('✅ Batch enrichment complete', {
      total: results.length,
      successful: results.filter(r => r.errors.length === 0).length,
      failed: results.filter(r => r.errors.length > 0).length
    });

    return results;
  }
}

module.exports = CustomerEnrichmentService;
