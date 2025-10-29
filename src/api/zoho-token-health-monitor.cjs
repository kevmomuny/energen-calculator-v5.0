/**
 * Zoho OAuth Token Health Monitor
 * Checks refresh token validity and provides easy renewal workflow
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ZohoTokenHealthMonitor {
  constructor() {
    this.lastCheck = null;
    this.tokenStatus = null;
  }

  /**
     * Test if current refresh token is valid
     * @returns {Object} Health status with details
     */
  async checkTokenHealth() {
    try {
      console.log('🔍 Checking Zoho OAuth token health...');

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

      this.tokenStatus = {
        healthy: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        lastChecked: new Date().toISOString()
      };

      console.log('✅ OAuth tokens are healthy');
      this.lastCheck = Date.now();
      return this.tokenStatus;

    } catch (error) {
      const errorCode = error.response?.data?.error || error.message;

      this.tokenStatus = {
        healthy: false,
        error: errorCode,
        message: this.getErrorMessage(errorCode),
        lastChecked: new Date().toISOString()
      };

      console.warn('⚠️ OAuth token health check failed:', errorCode);
      this.lastCheck = Date.now();
      return this.tokenStatus;
    }
  }

  /**
     * Get user-friendly error message
     */
  getErrorMessage(errorCode) {
    const messages = {
      'invalid_code': 'Refresh token has expired (90-day limit reached). Click to renew authorization.',
      'invalid_client': 'Client credentials are invalid. Check ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET.',
      'invalid_grant': 'Refresh token is no longer valid. Authorization renewal required.'
    };

    return messages[errorCode] || `OAuth error: ${errorCode}`;
  }

  /**
     * Generate authorization URL for easy renewal
     */
  getAuthorizationUrl() {
    const scopes = [
      'ZohoCRM.modules.ALL',
      'ZohoCRM.settings.ALL',
      'ZohoCRM.users.READ'
    ].join(',');

    const params = new URLSearchParams({
      scope: scopes,
      client_id: process.env.ZOHO_CLIENT_ID,
      response_type: 'code',
      access_type: 'offline',
      redirect_uri: 'http://localhost:3002/api/zoho/oauth/callback'
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  /**
     * Exchange authorization code for new refresh token
     */
  async exchangeCodeForToken(authCode) {
    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          redirect_uri: 'http://localhost:3002/api/zoho/oauth/callback',
          code: authCode
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      return {
        success: true,
        refresh_token: response.data.refresh_token,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
     * Update .env file with new refresh token
     */
  async updateEnvFile(newRefreshToken) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');

      // Update or add refresh token
      if (envContent.includes('ZOHO_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /ZOHO_REFRESH_TOKEN=.*/,
          `ZOHO_REFRESH_TOKEN=${newRefreshToken}`
        );
      } else {
        if (!envContent.endsWith('\n')) envContent += '\n';
        envContent += `ZOHO_REFRESH_TOKEN=${newRefreshToken}\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');

      // Update process.env for current session
      process.env.ZOHO_REFRESH_TOKEN = newRefreshToken;

      console.log('✅ .env file updated with new refresh token');
      return true;

    } catch (error) {
      console.error('❌ Failed to update .env file:', error.message);
      return false;
    }
  }

  /**
     * Get current status for display
     */
  getStatus() {
    return this.tokenStatus || { healthy: null, message: 'Not yet checked' };
  }
}

// Export singleton
module.exports = new ZohoTokenHealthMonitor();
