/**
 * @fileoverview Google Places Service
 * @module customer-enrichment/places-service
 */

import fetch from 'node-fetch';

export class PlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  async enrichFromAddress(name, address) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      // Find place from text
      const searchUrl = `${this.baseUrl}/findplacefromtext/json`;
      const params = new URLSearchParams({
        input: `${name} ${address}`,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,business_status,types,website,formatted_phone_number',
        key: this.apiKey
      });

      const response = await fetch(`${searchUrl}?${params}`);
      const data = await response.json();

      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0];
      }

      return null;
    } catch (error) {
      console.error('Places API error:', error);
      return null;
    }
  }
}

export const placesService = new PlacesService();
