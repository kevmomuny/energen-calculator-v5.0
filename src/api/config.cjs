/**
 * API Configuration Module
 * Loads and validates environment variables
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Google Services
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY,
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY,
    useNewPlacesAPI: process.env.USE_NEW_PLACES_API === 'true',
    placesAPIVersion: process.env.USE_NEW_PLACES_API === 'true' ? 'new' : 'legacy'
  },

  // Zoho Configuration
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    redirectUri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3333/oauth/callback',
    accountsUrl: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com',
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
    apiVersion: process.env.ZOHO_CRM_API_VERSION || 'v3'
  },

  // Logo.dev API
  logodev: {
    publicKey: process.env.VITE_LOGODEV_API_KEY,
    secretKey: process.env.LOGODEV_SECRET_KEY
  },

  // Brandfetch API (replaces Clearbit, shutting down Dec 1, 2025)
  brandfetch: {
    clientId: process.env.BRANDFETCH_CLIENT_ID
  },

  // Tax Service
  tax: {
    cdtfaUrl: process.env.VITE_TAX_API_URL || 'https://services.maps.cdtfa.ca.gov/api/taxrate'
  },

  // Shop Location
  shop: {
    lat: parseFloat(process.env.VITE_SHOP_LAT) || 37.9774,
    lng: parseFloat(process.env.VITE_SHOP_LNG) || -122.0311,
    address: process.env.VITE_SHOP_ADDRESS || '150 Mason Circle, Concord, CA 94520'
  },

  // Feature Flags
  features: {
    pdfGeneration: process.env.VITE_ENABLE_PDF_GENERATION === 'true',
    batchProcessing: process.env.VITE_ENABLE_BATCH_PROCESSING === 'true',
    googlePlaces: process.env.VITE_ENABLE_GOOGLE_PLACES === 'true',
    taxLookup: process.env.VITE_ENABLE_TAX_LOOKUP === 'true',
    debugMode: process.env.VITE_ENABLE_DEBUG_MODE === 'true',
    zohoSync: process.env.VITE_ENABLE_ZOHO_SYNC === 'true'
  },

  // PDF
  pdf: {
    outputDir: process.env.PDF_OUTPUT_DIR || './test-output'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:5176', 'http://127.0.0.1:8081']
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};

// Validate critical configurations
function validateConfig() {
  const errors = [];

  if (!config.google.mapsApiKey || config.google.mapsApiKey.includes('YOUR_API_KEY')) {
    errors.push('❌ CRITICAL: Google Maps API key not configured in environment variables');
    errors.push('   Set GOOGLE_MAPS_API_KEY in .env file');
    errors.push('   See GOOGLE_API_CONFIGURATION.md for setup instructions');
  }

  if (!config.zoho.clientId) {
    console.warn('⚠️ Zoho OAuth not configured - sync features will be limited');
  }

  if (config.features.debugMode) {

  }

  return errors.length === 0;
}

// Validate on module load
validateConfig();

module.exports = config;
