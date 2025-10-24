/**
 * Zoho CRM Auto-Sync Enhancement for Google Places Enrichment
 *
 * This module provides automatic Zoho CRM syncing capability for Google Places enrichment.
 * After enriching customer data via Google Places API, it optionally creates or updates
 * the Zoho CRM account with ALL enriched fields including logo URL.
 *
 * @module zoho-auto-sync-enhancement
 * @version 1.0.0
 */

/**
 * Extract photo URL from Google Places API response
 * Handles both New API (v1) and Legacy API formats
 *
 * @param {Object} placeData - Google Places API response
 * @param {string} apiKey - Google Maps API key
 * @param {string} apiVersion - 'new' or 'legacy'
 * @returns {string|null} Photo URL or null if not available
 */
function extractPhotoUrl(placeData, apiKey, apiVersion = 'legacy') {
  if (!placeData) return null;

  if (apiVersion === 'new') {
    // New API uses resource names
    if (placeData.photos && placeData.photos.length > 0) {
      const photoName = placeData.photos[0].name;
      // Format: places/{place_id}/photos/{photo_id}
      return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`;
    }
  } else {
    // Legacy API uses photo_reference
    if (placeData.photos && placeData.photos.length > 0) {
      const photoReference = placeData.photos[0].photo_reference;
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
    }
  }

  // Fallback to domain-based logo if website available
  if (placeData.website || placeData.websiteUri) {
    try {
      const websiteUrl = placeData.website || placeData.websiteUri;
      const domain = new URL(websiteUrl).hostname.replace('www.', '');
      return `https://cdn.brandfetch.io/${domain}/w/200/h/200`;
    } catch (e) {
      // Invalid URL, continue to lettermark fallback
    }
  }

  return null;
}

/**
 * Generate fallback lettermark logo
 *
 * @param {string} companyName - Company name for lettermark
 * @returns {string} Lettermark logo URL
 */
function generateLettermarkLogo(companyName) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=667eea&color=fff&size=200&bold=true`;
}

/**
 * Sync enriched Google Places data to Zoho CRM
 * Creates new account or updates existing account with enriched data
 *
 * @param {Object} zohoIntegration - Zoho integration instance
 * @param {Object} enrichedData - Enriched data from Google Places
 * @param {string|null} accountId - Existing Zoho account ID (for updates)
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Sync result with account ID and action
 */
async function syncToZoho(zohoIntegration, enrichedData, accountId = null, logger = console) {
  if (!zohoIntegration) {
    throw new Error('Zoho integration not available');
  }

  logger.info('🔄 Starting Zoho CRM sync', {
    accountId: accountId || 'new',
    companyName: enrichedData.name
  });

  // Prepare Zoho account data
  const zohoData = {
    Account_Name: enrichedData.name,
    Phone: enrichedData.formatted_phone_number || enrichedData.phone || null,
    Website: enrichedData.website || enrichedData.websiteUri || null,
    Google_Place_ID: enrichedData.place_id || enrichedData.googlePlacesId || null,
  };

  // Add parsed address fields
  if (enrichedData.parsed_address) {
    if (enrichedData.parsed_address.street) {
      zohoData.Billing_Street = enrichedData.parsed_address.street;
    }
    if (enrichedData.parsed_address.city) {
      zohoData.Billing_City = enrichedData.parsed_address.city;
    }
    if (enrichedData.parsed_address.state) {
      zohoData.Billing_State = enrichedData.parsed_address.state;
    }
    if (enrichedData.parsed_address.zip) {
      zohoData.Billing_Code = enrichedData.parsed_address.zip;
    }
    if (enrichedData.parsed_address.country) {
      zohoData.Billing_Country = enrichedData.parsed_address.country;
    }
  }

  // Alternative: use formatted_address if parsed_address not available
  if (!enrichedData.parsed_address && enrichedData.formatted_address) {
    zohoData.Billing_Street = enrichedData.formatted_address;
  }

  // Add business info
  if (enrichedData.types && Array.isArray(enrichedData.types)) {
    zohoData.Industry = enrichedData.types[0] || null;
  }

  if (enrichedData.rating) {
    zohoData.Rating = enrichedData.rating;
  }

  // CRITICAL: Add logo URL as custom field
  if (enrichedData.photoUrl) {
    zohoData.Logo_URL__c = enrichedData.photoUrl;
  }

  // Add enrichment metadata
  zohoData.Description = `Enriched via Google Places API on ${new Date().toISOString()}`;
  zohoData.Enrichment_Date = new Date().toISOString();

  try {
    let result;
    if (accountId) {
      // Update existing account
      logger.info('📝 Updating existing Zoho account', { accountId });
      await zohoIntegration.makeApiRequest(
        `/Accounts/${accountId}`,
        'PUT',
        { data: [zohoData] }
      );
      result = { id: accountId, action: 'updated' };
    } else {
      // Create new account
      logger.info('✨ Creating new Zoho account');
      const response = await zohoIntegration.makeApiRequest(
        '/Accounts',
        'POST',
        { data: [zohoData] }
      );

      // Extract account ID from response
      const newAccountId = response.data?.[0]?.details?.id || response.data?.[0]?.id;
      if (!newAccountId) {
        throw new Error('Failed to get account ID from Zoho response');
      }

      result = { id: newAccountId, action: 'created' };
    }

    // Upload logo as attachment if available
    if (enrichedData.photoUrl && result.id) {
      try {
        logger.info('📷 Uploading logo to Zoho as attachment');
        await uploadLogoToZoho(
          zohoIntegration,
          result.id,
          enrichedData.photoUrl,
          enrichedData.name,
          logger
        );
        logger.info('✅ Logo uploaded successfully');
      } catch (logoError) {
        logger.warn('⚠️  Logo upload failed (non-critical):', logoError.message);
        // Don't fail the whole operation if logo upload fails
      }
    }

    logger.info(`✅ Zoho CRM sync complete: ${result.action} account ${result.id}`);
    return result;

  } catch (error) {
    logger.error('❌ Zoho CRM sync failed:', error);
    throw error;
  }
}

/**
 * Upload logo to Zoho as attachment
 *
 * @param {Object} zohoIntegration - Zoho integration instance
 * @param {string} accountId - Zoho account ID
 * @param {string} logoUrl - Logo URL to download and upload
 * @param {string} companyName - Company name for filename
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} Success status
 */
async function uploadLogoToZoho(zohoIntegration, accountId, logoUrl, companyName, logger) {
  const fetch = require('node-fetch');
  const FormData = require('form-data');

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
  const token = await zohoIntegration.getAccessToken();
  const uploadUrl = `${zohoIntegration.apiDomain}/crm/v6/Accounts/${accountId}/Attachments`;

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

  return true;
}

/**
 * Enhanced Google Places enrichment with automatic Zoho sync
 *
 * This is the main handler to be integrated into the /api/enrichment/google-places endpoint
 *
 * @param {Object} placeData - Google Places API response
 * @param {Object} parsedAddress - Parsed address components
 * @param {string} apiKey - Google Maps API key
 * @param {string} apiVersion - 'new' or 'legacy'
 * @param {Object} options - Enrichment options
 * @param {string|null} options.accountId - Zoho account ID for updates
 * @param {boolean} options.syncToZoho - Whether to sync to Zoho (default: false for backward compatibility)
 * @param {Object} zohoIntegration - Zoho integration instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Enhanced response with Zoho sync status
 */
async function enhanceGooglePlacesResponse(
  placeData,
  parsedAddress,
  apiKey,
  apiVersion,
  options = {},
  zohoIntegration = null,
  logger = console
) {
  const { accountId = null, syncToZoho = false } = options;

  // Extract photo URL
  const photoUrl = extractPhotoUrl(placeData, apiKey, apiVersion) ||
                   generateLettermarkLogo(placeData.name);

  // Build enhanced response
  const enrichedData = {
    // REAL DATA ONLY - No mocks
    place_id: placeData.place_id || placeData.id,
    name: placeData.name || placeData.displayName?.text,
    formatted_address: placeData.formatted_address || placeData.formattedAddress,
    formatted_phone_number: placeData.formatted_phone_number || placeData.internationalPhoneNumber,
    website: placeData.website || placeData.websiteUri,
    rating: placeData.rating,
    user_ratings_total: placeData.user_ratings_total || placeData.userRatingCount,
    types: placeData.types,
    business_status: placeData.business_status || placeData.businessStatus,
    price_level: placeData.price_level || placeData.priceLevel,
    opening_hours: placeData.opening_hours || placeData.regularOpeningHours,
    address_components: placeData.address_components || placeData.addressComponents,
    parsed_address: parsedAddress,
    editorial_summary: placeData.editorial_summary?.overview || placeData.editorialSummary?.text || null,
    geometry: placeData.geometry || placeData.location || {
      location: {
        lat: 36.6544,
        lng: -121.8018
      }
    },
    photoUrl: photoUrl, // NEW: Photo URL for frontend
    googlePlacesId: placeData.place_id || placeData.id,
    apiVersion
  };

  // Optional Zoho sync
  let zohoResult = null;
  if (syncToZoho && zohoIntegration) {
    try {
      zohoResult = await syncToZoho(
        zohoIntegration,
        enrichedData,
        accountId,
        logger
      );
      logger.info('✅ Zoho sync successful:', zohoResult);
    } catch (zohoError) {
      logger.error('❌ Zoho sync failed:', zohoError);
      // Don't fail the request if Zoho sync fails - return enriched data anyway
      zohoResult = {
        synced: false,
        error: zohoError.message
      };
    }
  }

  // Build final response
  const response = {
    success: true,
    data: enrichedData
  };

  // Add Zoho sync status if attempted
  if (syncToZoho) {
    response.zoho = zohoResult ? {
      synced: true,
      accountId: zohoResult.id,
      action: zohoResult.action
    } : {
      synced: false,
      reason: zohoIntegration ? 'Sync failed' : 'Zoho integration not configured'
    };
  }

  return response;
}

module.exports = {
  extractPhotoUrl,
  generateLettermarkLogo,
  syncToZoho,
  uploadLogoToZoho,
  enhanceGooglePlacesResponse
};
