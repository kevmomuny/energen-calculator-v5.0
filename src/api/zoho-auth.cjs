/**
 * Zoho OAuth Authentication Module
 * Centralized token management for all Zoho API integrations
 */

const axios = require('axios');
require('dotenv').config();

class ZohoAuth {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
     * Get valid Zoho access token (cached or refreshed)
     * @returns {Promise<string>} Valid access token
     */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Refresh token
    try {
      const response = await axios.post(
        `${process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com'}/oauth/v2/token`,
        new URLSearchParams({
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: 'refresh_token'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      this.accessToken = response.data.access_token;
      // Tokens typically valid for 1 hour, cache for 55 minutes to be safe
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to refresh Zoho access token: ${error.message}`);
    }
  }

  /**
     * Clear cached token (force refresh on next call)
     */
  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

// Export singleton instance
module.exports = new ZohoAuth();
