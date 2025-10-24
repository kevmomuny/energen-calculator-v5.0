/**
 * @fileoverview Customer Enrichment Service Integration
 * @module customer-enrichment
 * @version 2.0.0
 * @date 2025-01-09
 * 
 * Integrates logo fetching with Google Places enrichment
 * Provides unified customer data enrichment interface
 */

import { logoService } from './logo-service.js';
import { placesService } from './places-service.js';
import { distanceService } from './distance-service.js';

/**
 * Main Customer Enrichment Service
 */
export class CustomerEnrichmentService {
  constructor() {
    this.logo = logoService;
    this.places = placesService;
    this.distance = distanceService;
    
    // Track enrichment performance
    this.stats = {
      totalEnrichments: 0,
      successfulEnrichments: 0,
      failedEnrichments: 0,
      avgEnrichmentTime: 0
    };
  }

  /**
   * Enrich customer data with logos, places, and distance
   * @param {Object} customer - Customer data object
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Enriched customer data
   */
  async enrichCustomerData(customer, options = {}) {
    const startTime = Date.now();
    const enriched = { ...customer };
    const errors = [];

    try {
      // Extract domain for logo fetching
      const domain = this.extractDomain(customer.email || customer.website);
      
      // Parallel enrichment tasks
      const enrichmentTasks = [];

      // Logo enrichment
      if (domain && options.includeLogo !== false) {
        enrichmentTasks.push(
          this.enrichLogos(domain, enriched).catch(err => {
            errors.push({ type: 'logo', error: err.message });
            return null;
          })
        );
      }

      // Places enrichment
      if (customer.address && options.includePlaces !== false) {
        enrichmentTasks.push(
          this.enrichPlaces(customer, enriched).catch(err => {
            errors.push({ type: 'places', error: err.message });
            return null;
          })
        );
      }

      // Distance calculation
      if (customer.address && options.includeDistance !== false) {
        enrichmentTasks.push(
          this.enrichDistance(customer.address, enriched).catch(err => {
            errors.push({ type: 'distance', error: err.message });
            return null;
          })
        );
      }

      // Wait for all enrichment tasks
      await Promise.all(enrichmentTasks);

      // Add metadata
      enriched.enrichment = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
        sources: this.getEnrichmentSources(enriched)
      };

      // Update stats
      this.updateStats(Date.now() - startTime, errors.length === 0);

      return enriched;

    } catch (error) {
      console.error('Customer enrichment error:', error);
      this.stats.failedEnrichments++;
      
      return {
        ...customer,
        enrichment: {
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: error.message,
          failed: true
        }
      };
    }
  }

  /**
   * Enrich with logo variations
   */
  async enrichLogos(domain, enriched) {
    const logos = await this.logo.getLogoVariations(domain);
    const brandColors = await this.logo.getBrandColors(domain);
    
    enriched.branding = {
      domain,
      logos,
      colors: brandColors,
      hasCustomLogo: !logos.lightLogo?.isFallback
    };
    
    return enriched;
  }

  /**
   * Enrich with Google Places data
   */
  async enrichPlaces(customer, enriched) {
    const placeData = await this.places.enrichFromAddress(
      customer.name,
      customer.address
    );
    
    if (placeData) {
      enriched.place = {
        id: placeData.place_id,
        name: placeData.name,
        formattedAddress: placeData.formatted_address,
        coordinates: placeData.geometry?.location,
        rating: placeData.rating,
        totalRatings: placeData.user_ratings_total,
        businessStatus: placeData.business_status,
        types: placeData.types,
        website: placeData.website,
        phone: placeData.formatted_phone_number
      };
    }
    
    return enriched;
  }

  /**
   * Enrich with distance calculation
   */
  async enrichDistance(customerAddress, enriched) {
    const origin = process.env.ENERGEN_OFFICE_ADDRESS || 
                   '1520 Sheridan Ave, North Highlands, CA 95660';
    
    const distanceData = await this.distance.calculateDistance(
      origin,
      customerAddress
    );
    
    if (distanceData) {
      enriched.distance = {
        miles: distanceData.distance?.value 
          ? Math.round(distanceData.distance.value * 0.000621371 * 10) / 10 
          : null,
        kilometers: distanceData.distance?.value 
          ? Math.round(distanceData.distance.value / 1000 * 10) / 10 
          : null,
        duration: {
          minutes: distanceData.duration?.value 
            ? Math.round(distanceData.duration.value / 60) 
            : null,
          text: distanceData.duration?.text
        },
        origin,
        destination: customerAddress
      };
    }
    
    return enriched;
  }

  /**
   * Batch enrich multiple customers
   */
  async batchEnrich(customers, options = {}) {
    const batchSize = options.batchSize || 5;
    const results = [];
    
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(customer => 
          this.enrichCustomerData(customer, options)
            .catch(error => ({
              ...customer,
              enrichment: { error: error.message, failed: true }
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
    
    return results;
  }

  /**
   * Get enrichment statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalEnrichments > 0
        ? (this.stats.successfulEnrichments / this.stats.totalEnrichments * 100).toFixed(2) + '%'
        : '0%',
      logoMetrics: this.logo.getMetrics(),
      placesMetrics: this.places?.getMetrics?.() || {},
      distanceMetrics: this.distance?.getMetrics?.() || {}
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.logo.clearCache();
    this.places?.clearCache?.();
    this.distance?.clearCache?.();

  }

  // Helper methods

  extractDomain(input) {
    if (!input) return null;
    
    const emailMatch = input.match(/@(.+)/);
    if (emailMatch) return emailMatch[1];
    
    const urlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return urlMatch ? urlMatch[1] : input;
  }

  getEnrichmentSources(enriched) {
    const sources = [];
    
    if (enriched.branding?.logos) {
      sources.push(enriched.branding.logos.lightLogo?.provider || 'fallback');
    }
    
    if (enriched.place) {
      sources.push('google_places');
    }
    
    if (enriched.distance) {
      sources.push('google_distance_matrix');
    }
    
    return sources;
  }

  updateStats(duration, success) {
    this.stats.totalEnrichments++;
    
    if (success) {
      this.stats.successfulEnrichments++;
    } else {
      this.stats.failedEnrichments++;
    }
    
    // Update average enrichment time
    const total = this.stats.totalEnrichments;
    this.stats.avgEnrichmentTime = 
      (this.stats.avgEnrichmentTime * (total - 1) + duration) / total;
  }
}

// Export singleton instance
export const customerEnrichment = new CustomerEnrichmentService();

// Export for testing
export default CustomerEnrichmentService;
