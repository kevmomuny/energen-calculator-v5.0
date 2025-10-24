/**
 * @fileoverview Google Distance Matrix Service
 * @module customer-enrichment/distance-service
 */

import fetch from 'node-fetch';

export class DistanceService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  }

  async calculateDistance(origin, destination) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const params = new URLSearchParams({
        origins: origin,
        destinations: destination,
        units: 'imperial',
        key: this.apiKey
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();

      if (data.rows && data.rows[0]?.elements[0]?.status === 'OK') {
        return data.rows[0].elements[0];
      }

      return null;
    } catch (error) {
      console.error('Distance Matrix API error:', error);
      return null;
    }
  }
}

export const distanceService = new DistanceService();
