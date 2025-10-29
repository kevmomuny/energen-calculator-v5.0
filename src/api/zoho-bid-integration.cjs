/**
 * Zoho Bid Integration Module
 * Orchestrates automatic Zoho CRM sync when creating bids
 *
 * This module handles:
 * 1. Account creation/update with enriched data
 * 2. Contact creation/update
 * 3. Quote creation with line items
 * 4. Logo upload as attachment
 * 5. Estimate number generation
 *
 * @module zoho-bid-integration
 * @version 1.0.0
 */

const axios = require('axios');
const FormData = require('form-data');
const ZohoGeneratorAssetAPI = require('./zoho-generator-asset-api.cjs');

/**
 * Create or update Zoho account with enriched customer data
 * @param {Object} zohoConfig - Zoho configuration with accessToken and apiUrl
 * @param {Object} customerData - Customer data from quote
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Account result with id and action
 */
async function createOrUpdateAccount(zohoConfig, customerData, logger) {
  // Handle both snake_case and camelCase field names
  const companyName = customerData.companyName || customerData.company_name || 'Unknown Company';

  logger.info('🏢 Creating/updating Zoho account', { companyName });

  try {
    // Search for existing account first
    const searchResponse = await axios.get(
      `${zohoConfig.apiUrl}/crm/v2/Accounts/search`,
      {
        params: {
          word: companyName,
          per_page: 5
        },
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`
        }
      }
    );

    const existingAccounts = searchResponse.data?.data || [];

    // Prepare account data - support both snake_case and camelCase
    const accountData = {
      Account_Name: companyName,
      Phone: customerData.phone || null,
      Website: customerData.website || null,
      Billing_Street: customerData.address || customerData.streetAddress || null,
      Billing_City: customerData.city || null,
      Billing_State: customerData.state || null,
      Billing_Code: customerData.zipCode || customerData.zip || null,
      Billing_Country: 'USA',
      Description: `Energen Generator Service Customer - Created ${new Date().toISOString()}`,
      Logo_URL__c: customerData.logoUrl || customerData.logo_url || null,
      Account_Type: 'Customer'
    };

    // Remove null values
    Object.keys(accountData).forEach(key => {
      if (accountData[key] === null) delete accountData[key];
    });

    let accountId;
    let action;

    if (existingAccounts.length > 0) {
      // Update existing account
      accountId = existingAccounts[0].id;
      action = 'updated';

      logger.info('📝 Updating existing account', { accountId });

      await axios.put(
        `${zohoConfig.apiUrl}/crm/v2/Accounts/${accountId}`,
        { data: [accountData] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // Create new account
      action = 'created';

      logger.info('✨ Creating new account');

      const createResponse = await axios.post(
        `${zohoConfig.apiUrl}/crm/v2/Accounts`,
        { data: [accountData] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      accountId = createResponse.data?.data?.[0]?.details?.id;

      if (!accountId) {
        throw new Error('Failed to get account ID from Zoho response');
      }
    }

    // Upload logo as attachment if available
    if (customerData.logoUrl && accountId) {
      try {
        await uploadLogoAttachment(zohoConfig, accountId, customerData.logoUrl, customerData.companyName, logger);
      } catch (logoError) {
        logger.warn('⚠️  Logo upload failed (non-critical):', logoError.message);
      }
    }

    logger.info(`✅ Account ${action}: ${accountId}`);

    return {
      id: accountId,
      action,
      accountName: customerData.companyName
    };

  } catch (error) {
    logger.error('❌ Account creation/update failed:', error.message);
    throw new Error(`Zoho account sync failed: ${error.message}`);
  }
}

/**
 * Create or update Zoho contact
 * @param {Object} zohoConfig - Zoho configuration
 * @param {string} accountId - Zoho account ID
 * @param {Object} contactData - Contact data from quote
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Contact result with id and action
 */
async function createOrUpdateContact(zohoConfig, accountId, contactData, logger) {
  logger.info('👤 Creating/updating Zoho contact', { accountId });

  try {
    // Handle both snake_case and camelCase field names
    const contactName = contactData.name || contactData.contact_name || 'Contact Person';
    const contactEmail = contactData.email || null;
    const contactPhone = contactData.phone || null;

    // Extract first name and last name
    const nameParts = contactName.trim().split(' ');
    const firstName = nameParts[0] || 'Contact';
    const lastName = nameParts.slice(1).join(' ') || 'Person';

    // Search for existing contact
    const searchResponse = await axios.get(
      `${zohoConfig.apiUrl}/crm/v2/Contacts/search`,
      {
        params: {
          criteria: `(Account_Name:equals:${accountId})and(Email:equals:${contactEmail})`,
          per_page: 5
        },
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`
        }
      }
    );

    const existingContacts = searchResponse.data?.data || [];

    const contactPayload = {
      First_Name: firstName,
      Last_Name: lastName,
      Email: contactEmail,
      Phone: contactPhone,
      Account_Name: accountId,
      Title: contactData.title || 'Contact'
    };

    // Remove null values
    Object.keys(contactPayload).forEach(key => {
      if (contactPayload[key] === null) delete contactPayload[key];
    });

    let contactId;
    let action;

    if (existingContacts.length > 0) {
      // Update existing contact
      contactId = existingContacts[0].id;
      action = 'updated';

      logger.info('📝 Updating existing contact', { contactId });

      await axios.put(
        `${zohoConfig.apiUrl}/crm/v2/Contacts/${contactId}`,
        { data: [contactPayload] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // Create new contact
      action = 'created';

      logger.info('✨ Creating new contact');

      const createResponse = await axios.post(
        `${zohoConfig.apiUrl}/crm/v2/Contacts`,
        { data: [contactPayload] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      contactId = createResponse.data?.data?.[0]?.details?.id;

      if (!contactId) {
        throw new Error('Failed to get contact ID from Zoho response');
      }
    }

    logger.info(`✅ Contact ${action}: ${contactId}`);

    return {
      id: contactId,
      action,
      contactName: `${firstName} ${lastName}`
    };

  } catch (error) {
    logger.error('❌ Contact creation/update failed:', error.message);
    throw new Error(`Zoho contact sync failed: ${error.message}`);
  }
}

/**
 * Create Zoho quote with line items
 * @param {Object} zohoConfig - Zoho configuration
 * @param {string} accountId - Zoho account ID
 * @param {string} contactId - Zoho contact ID
 * @param {Object} quoteData - Complete quote data
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Quote result with id and quoteNumber
 */
async function createQuote(zohoConfig, accountId, contactId, quoteData, logger) {
  logger.info('📋 Creating Zoho quote', { accountId, contactId });

  try {
    // Generate quote number
    const timestamp = Date.now();
    const quoteNumber = quoteData.metadata?.quoteNumber || `E-${new Date().getFullYear()}-${String(timestamp).slice(-4)}`;

    // Build line items with product IDs (Product_Details is MANDATORY)
    // Use findOrCreateProduct to get/create product IDs for each service
    const lineItems = [];

    // Process services - create/find products for each
    if (quoteData.services && Array.isArray(quoteData.services)) {
      for (const service of quoteData.services) {
        try {
          // Get or create product in Zoho catalog
          const productId = await findOrCreateProduct(zohoConfig, service, logger);

          lineItems.push({
            product: { id: productId },
            quantity: 1,
            list_price: service.price || 0,
            Description: service.description || service.notes || '',
            Discount: 0
          });
        } catch (error) {
          logger.warn(`⚠️  Skipping service ${service.id} due to product error:`, error.message);
          // Continue with other services even if one fails
        }
      }
    }

    // Add distance/travel charge if present
    if (quoteData.calculation?.distanceCharge && quoteData.calculation.distanceCharge > 0) {
      try {
        const travelService = {
          id: 'TRAVEL',
          code: 'TRAVEL',
          name: 'Travel/Distance Charge',
          price: quoteData.calculation.distanceCharge,
          description: `Travel charge for ${quoteData.calculation.distance || 0} miles`
        };
        const travelProductId = await findOrCreateProduct(zohoConfig, travelService, logger);

        lineItems.push({
          product: { id: travelProductId },
          quantity: 1,
          list_price: quoteData.calculation.distanceCharge,
          Description: travelService.description,
          Discount: 0
        });
      } catch (error) {
        logger.warn('⚠️  Skipping travel charge due to product error:', error.message);
      }
    }

    // If no line items, create a generic service product
    if (lineItems.length === 0) {
      const genericService = {
        id: 'GENERIC',
        code: 'GENERIC',
        name: 'Generator Service',
        price: quoteData.calculation?.subtotal || 0,
        description: 'Generator maintenance and service'
      };
      const genericProductId = await findOrCreateProduct(zohoConfig, genericService, logger);

      lineItems.push({
        product: { id: genericProductId },
        quantity: 1,
        list_price: quoteData.calculation?.subtotal || 0,
        Description: 'Generator maintenance and service',
        Discount: 0
      });
    }

    // Calculate totals
    const subtotal = quoteData.calculation?.subtotal || lineItems.reduce((sum, item) => sum + item.list_price, 0);
    const tax = quoteData.calculation?.salesTax || (subtotal * 0.0925); // Default to 9.25% CA tax
    const total = quoteData.calculation?.total || (subtotal + tax);

    // Prepare quote payload WITH Product_Details (using product IDs)
    const quotePayload = {
      Subject: `Generator Service Quote - ${quoteData.customer?.companyName || 'Customer'}`,
      Quote_Number: quoteNumber,
      Account_Name: accountId,
      Contact_Name: contactId,
      Valid_Till: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      Product_Details: lineItems, // Now includes proper product IDs
      Sub_Total: subtotal,
      Tax: tax,
      Grand_Total: total,
      Description: buildQuoteDescription(quoteData),
      Quote_Stage: 'Draft',
      Team: 'Energen Sales',
      Adjustment: 0,
      Discount: 0
    };

    logger.info('📤 Sending quote to Zoho', { quoteNumber, lineItems: lineItems.length, total: `$${total.toFixed(2)}` });

    const response = await axios.post(
      `${zohoConfig.apiUrl}/crm/v2/Quotes`,
      { data: [quotePayload] },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Log response structure for debugging
    logger.info('📥 Zoho quote response:', JSON.stringify(response.data, null, 2));

    // Try multiple possible response structures
    const quoteId = response.data?.data?.[0]?.details?.id ||
                    response.data?.data?.[0]?.id ||
                    response.data?.id;

    if (!quoteId) {
      logger.error('❌ Could not find quote ID in response:', response.data);
      throw new Error(`Failed to get quote ID from Zoho response. Response structure: ${JSON.stringify(response.data)}`);
    }

    logger.info(`✅ Quote created: ${quoteId}`);

    return {
      id: quoteId,
      quoteNumber,
      subject: quotePayload.Subject,
      total,
      url: `${zohoConfig.apiUrl.replace('/api', '')}/crm/org/tab/Quotes/${quoteId}`
    };

  } catch (error) {
    logger.error('❌ Quote creation failed:', error.message);
    throw new Error(`Zoho quote creation failed: ${error.message}`);
  }
}

/**
 * Upload logo as attachment to Zoho account
 * @param {Object} zohoConfig - Zoho configuration
 * @param {string} accountId - Zoho account ID
 * @param {string} logoUrl - Logo URL to download and upload
 * @param {string} companyName - Company name for filename
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>}
 */
async function uploadLogoAttachment(zohoConfig, accountId, logoUrl, companyName, logger) {
  try {
    logger.info('📷 Uploading logo to Zoho', { accountId, logoUrl });

    // Download logo
    const logoResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
    const logoBuffer = Buffer.from(logoResponse.data);

    const contentType = logoResponse.headers['content-type'] || 'image/png';
    const extension = contentType.split('/')[1] || 'png';
    const filename = `${companyName.replace(/[^a-z0-9]/gi, '_')}_logo.${extension}`;

    // Upload to Zoho
    const form = new FormData();
    form.append('file', logoBuffer, {
      filename,
      contentType
    });

    const uploadUrl = `${zohoConfig.apiUrl}/crm/v2/Accounts/${accountId}/Attachments`;

    await axios.post(uploadUrl, form, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
        ...form.getHeaders()
      }
    });

    logger.info('✅ Logo uploaded successfully');
    return true;

  } catch (error) {
    logger.warn('⚠️  Logo upload failed:', error.message);
    return false;
  }
}

/**
 * Find existing product or create new one in Zoho Products module
 * Returns Product ID for use in quote line items
 * @param {Object} zohoConfig - Zoho configuration
 * @param {Object} service - Service object with code, name, price
 * @param {Object} logger - Logger instance
 * @returns {Promise<string>} Product ID
 */
async function findOrCreateProduct(zohoConfig, service, logger) {
  try {
    // Search for existing product by Product_Code
    const searchCriteria = `(Product_Code:equals:${service.id || service.code})`;
    const searchUrl = `${zohoConfig.apiUrl}/crm/v6/Products/search?criteria=${encodeURIComponent(searchCriteria)}`;

    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`
      }
    });

    // If product exists, return its ID
    if (searchResponse.data?.data && searchResponse.data.data.length > 0) {
      const productId = searchResponse.data.data[0].id;
      logger.info(`✅ Found existing product: ${service.id || service.code} (ID: ${productId})`);
      return productId;
    }

    // Product doesn't exist - create it
    logger.info(`📦 Creating new product: ${service.id || service.code}`);

    const newProduct = {
      data: [{
        Product_Name: service.name || `Service ${service.id || service.code}`,
        Product_Code: service.id || service.code,
        Unit_Price: service.price || 0,
        Description: service.description || service.notes || '',
        Product_Active: true,
        Product_Category: 'Generator Services',
        Taxable: true
      }]
    };

    const createResponse = await axios.post(
      `${zohoConfig.apiUrl}/crm/v6/Products`,
      newProduct,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const productId = createResponse.data?.data?.[0]?.details?.id;

    if (!productId) {
      throw new Error('Failed to get product ID from create response');
    }

    logger.info(`✅ Created product: ${service.id || service.code} (ID: ${productId})`);
    return productId;

  } catch (error) {
    logger.error(`❌ Product lookup/creation failed for ${service.id || service.code}:`, error.message);
    throw new Error(`Product lookup failed: ${error.message}`);
  }
}

/**
 * Create or find generator equipment records in Zoho
 * @param {Object} zohoConfig - Zoho configuration with accessToken and apiUrl
 * @param {string} accountId - Zoho account ID
 * @param {Array} generators - Generator data from quote
 * @param {Object} customerData - Customer data
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} Array of generator asset IDs
 */
async function createOrFindGeneratorAssets(zohoConfig, accountId, generators, customerData, logger) {
  const generatorAssetIds = [];
  const generatorAssetAPI = new ZohoGeneratorAssetAPI(logger);

  // Copy Zoho credentials to the API instance
  generatorAssetAPI.accessToken = zohoConfig.accessToken;
  generatorAssetAPI.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

  for (const generator of generators) {
    try {
      logger.info(`🔍 Processing generator: ${generator.model || 'Unknown'} (${generator.kw}kW)`);

      let assetId = null;

      // Step 1: Search for existing generator by serial number (if provided)
      if (generator.serialNumber) {
        const searchResult = await generatorAssetAPI.searchGeneratorAssetsBySerial(generator.serialNumber);

        if (searchResult.success && searchResult.assets.length > 0) {
          assetId = searchResult.assets[0].id;
          logger.info(`✅ Found existing generator: ${assetId} (Serial: ${generator.serialNumber})`);
        }
      }

      // Step 2: If not found, create new generator asset
      if (!assetId) {
        logger.info('📝 Creating new generator asset...');

        const assetData = {
          // Basic Info
          model: generator.model || `${generator.kw}kW Generator`,
          kwRating: generator.kw || generator.kwRating,
          serialNumber: generator.serialNumber || generator.serial_number || null,
          fuelType: generator.fuelType || generator.fuel_type || 'Diesel',

          // Customer Link
          customerId: accountId,
          customerName: customerData?.companyName || 'Customer',
          installationAddress: customerData?.address || customerData?.streetAddress || null,

          // Technical Details (if available)
          engineMake: generator.engineMake || null,
          engineModel: generator.engineModel || null,
          cylinders: generator.cylinders || generator.cylinderCount || null,
          oilType: generator.oilType || null,
          oilCapacity: generator.oilCapacity || null,
          coolantType: generator.coolantType || null,
          coolantCapacity: generator.coolantCapacity || null,

          // Service Info
          installDate: generator.installDate || null,

          // Status
          status: 'Active'
        };

        const createResult = await generatorAssetAPI.createGeneratorAsset(assetData);

        if (createResult.success) {
          assetId = createResult.assetId;
          logger.info(`✅ Created generator asset: ${assetId}`);
        } else {
          logger.warn(`⚠️  Failed to create generator asset: ${createResult.error}`);
          continue; // Skip this generator if creation fails
        }
      }

      // Add to list of generator IDs
      if (assetId) {
        generatorAssetIds.push(assetId);
      }

    } catch (error) {
      logger.warn(`⚠️  Error processing generator: ${error.message}`);
      // Continue with other generators even if one fails
    }
  }

  logger.info(`✅ Processed ${generatorAssetIds.length} generator asset(s)`);
  return generatorAssetIds;
}

/**
 * Link generator equipment to quote using Zoho Notes API
 * Note: Zoho CRM doesn't support direct lookup fields from Quotes to custom modules
 * We document the linkage in the quote description and potentially use Notes
 *
 * @param {Object} zohoConfig - Zoho configuration
 * @param {string} quoteId - Zoho quote ID
 * @param {Array} generatorAssetIds - Array of generator asset IDs
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} Success status
 */
async function linkGeneratorsToQuote(zohoConfig, quoteId, generatorAssetIds, logger) {
  if (!generatorAssetIds || generatorAssetIds.length === 0) {
    logger.info('ℹ️  No generators to link to quote');
    return true;
  }

  try {
    logger.info(`🔗 Linking ${generatorAssetIds.length} generator(s) to quote ${quoteId}...`);

    // Create a Note on the Quote documenting the generator linkage
    const noteContent = `Generator Equipment IDs: ${generatorAssetIds.join(', ')}\n\n` +
                       `This quote includes service for ${generatorAssetIds.length} generator unit(s).\n` +
                       'Generator records can be found in the Generator_Equipment module.';

    const notePayload = {
      data: [{
        Note_Title: 'Generator Equipment Reference',
        Note_Content: noteContent,
        Parent_Id: quoteId,
        se_module: 'Quotes'
      }]
    };

    await axios.post(
      `${zohoConfig.apiUrl}/crm/v2/Notes`,
      notePayload,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info('✅ Added generator reference note to quote');
    return true;

  } catch (error) {
    logger.warn(`⚠️  Failed to link generators to quote (non-critical): ${error.message}`);
    return false;
  }
}

/**
 * Build quote description from quote data
 * @param {Object} quoteData - Quote data
 * @param {Array} generatorAssetIds - Optional array of generator asset IDs
 * @returns {string} Formatted description
 */
function buildQuoteDescription(quoteData, generatorAssetIds = []) {
  const parts = [];

  parts.push('Generator Service Quote');

  if (quoteData.generators && quoteData.generators.length > 0) {
    parts.push('\nGenerators:');
    quoteData.generators.forEach((gen, idx) => {
      parts.push(`  ${idx + 1}. ${gen.kw}kW ${gen.model || ''} (${gen.fuelType || 'N/A'})`);
      if (generatorAssetIds[idx]) {
        parts.push(`     Generator_Equipment ID: ${generatorAssetIds[idx]}`);
      }
    });
  }

  if (quoteData.services && quoteData.services.length > 0) {
    parts.push('\nServices:');
    quoteData.services.forEach(svc => {
      parts.push(`  - ${svc.name}: $${svc.price?.toFixed(2) || '0.00'}`);
    });
  }

  if (quoteData.calculation) {
    parts.push('\nPricing:');
    parts.push(`  Subtotal: $${quoteData.calculation.subtotal?.toFixed(2) || '0.00'}`);
    if (quoteData.calculation.distanceCharge) {
      parts.push(`  Travel: $${quoteData.calculation.distanceCharge?.toFixed(2) || '0.00'}`);
    }
    parts.push(`  Tax: $${quoteData.calculation.salesTax?.toFixed(2) || '0.00'}`);
    parts.push(`  Total: $${quoteData.calculation.total?.toFixed(2) || '0.00'}`);
  }

  parts.push('\nGenerated by Energen Calculator v5.0');
  parts.push(`Date: ${new Date().toLocaleString()}`);

  return parts.join('\n');
}

/**
 * Main function: Create complete bid in Zoho CRM
 * Orchestrates account, contact, and quote creation
 *
 * @param {Object} zohoConfig - Zoho configuration with accessToken and apiUrl
 * @param {Object} quoteData - Complete quote data from frontend
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Complete sync result
 */
async function createBidInZoho(zohoConfig, quoteData, logger) {
  logger.info('🚀 Starting automatic Zoho bid creation with Generator Equipment linkage');

  try {
    const customerData = quoteData.customer || quoteData.quoteData?.customer;
    const actualQuoteData = quoteData.quoteData || quoteData;

    // Step 1: Create/Update Account
    const accountResult = await createOrUpdateAccount(
      zohoConfig,
      customerData,
      logger
    );

    // Step 2: Create/Update Contact
    const contactResult = await createOrUpdateContact(
      zohoConfig,
      accountResult.id,
      customerData,
      logger
    );

    // Step 3: Create or Find Generator Equipment records
    const generators = actualQuoteData.generators || [];
    let generatorAssetIds = [];

    if (generators.length > 0) {
      logger.info(`📦 Processing ${generators.length} generator(s)...`);
      generatorAssetIds = await createOrFindGeneratorAssets(
        zohoConfig,
        accountResult.id,
        generators,
        customerData,
        logger
      );
    } else {
      logger.info('ℹ️  No generators in quote data');
    }

    // Step 4: Create Quote (with generator IDs in description)
    const quoteResult = await createQuote(
      zohoConfig,
      accountResult.id,
      contactResult.id,
      { ...actualQuoteData, _generatorAssetIds: generatorAssetIds },
      logger
    );

    // Step 5: Link generators to quote via Notes
    if (generatorAssetIds.length > 0) {
      await linkGeneratorsToQuote(
        zohoConfig,
        quoteResult.id,
        generatorAssetIds,
        logger
      );
    }

    logger.info('🎉 Zoho bid creation completed successfully');

    return {
      success: true,
      account: accountResult,
      contact: contactResult,
      quote: quoteResult,
      generatorAssets: generatorAssetIds,
      estimateNumber: quoteResult.quoteNumber,
      zohoUrl: quoteResult.url
    };

  } catch (error) {
    logger.error('❌ Zoho bid creation failed:', error);
    throw error;
  }
}

module.exports = {
  createBidInZoho,
  createOrUpdateAccount,
  createOrUpdateContact,
  createQuote,
  uploadLogoAttachment,
  findOrCreateProduct
};
