/**
 * Contact Enrichment API Endpoints
 * Provides photo scraping and business card OCR
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const ContactEnrichmentService = require('./contact-enrichment.cjs');
const { createGooglePlacesNew } = require('./google-places-new.cjs');
const GooglePlacesAdapter = require('./google-places-adapter.cjs');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        // Allow images only
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

function setupEnrichmentEndpoints(app, logger) {
    const enrichmentService = new ContactEnrichmentService(logger);

    // Clean up expired cache every hour
    setInterval(() => {
        enrichmentService.clearExpiredCache();
    }, 60 * 60 * 1000);

    /**
     * POST /api/enrichment/contact-photo
     * Find contact photo from multiple sources
     *
     * Body: {
     *   name: string,
     *   company: string,
     *   email: string (optional),
     *   sources: string[] (optional)
     * }
     */
    app.post('/api/enrichment/contact-photo', async (req, res) => {
        try {
            const { name, company, email, sources } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Contact name is required'
                });
            }

            logger.info(`📸 Photo search request: ${name} at ${company || 'unknown company'}`);

            const result = await enrichmentService.findContactPhoto({
                name,
                company,
                email,
                sources: sources || ['gravatar', 'linkedin', 'google', 'indeed', 'clearbit']
            });

            if (result.success) {
                logger.info(`✅ Photo found: ${result.source} (${result.confidence}% confidence)`);
            } else {
                logger.info(`❌ No photo found with 95%+ confidence`);
            }

            res.json(result);

        } catch (error) {
            logger.error('Photo search error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/enrichment/business-card-ocr
     * Process business card image with OCR
     *
     * multipart/form-data with 'businessCard' image file
     */
    app.post('/api/enrichment/business-card-ocr', upload.single('businessCard'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No business card image provided'
                });
            }

            logger.info(`🃏 Processing business card: ${req.file.originalname} (${req.file.size} bytes)`);

            const result = await enrichmentService.processBusinessCard(req.file.buffer);

            logger.info(`✅ Business card processed: ${result.confidence}% confidence`);

            res.json(result);

        } catch (error) {
            logger.error('Business card OCR error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                confidence: 0
            });
        }
    });

    /**
     * GET /api/enrichment/status
     * Check enrichment service status and API keys
     */
    app.get('/api/enrichment/status', (req, res) => {
        const status = {
            service: 'Contact Enrichment API',
            version: '1.0.0',
            status: 'operational',
            features: {
                photoScraping: true,
                businessCardOCR: true
            },
            sources: {
                gravatar: true,
                linkedin: !!process.env.LINKEDIN_API_KEY,
                google: !!process.env.GOOGLE_API_KEY,
                indeed: true, // Public scraping
                clearbit: !!process.env.CLEARBIT_API_KEY,
                googleVision: !!process.env.GOOGLE_VISION_API_KEY,
                tesseract: true // Local fallback
            },
            cache: {
                size: enrichmentService.cache.size,
                expiryDays: 30
            }
        };

        res.json(status);
    });

    /**
     * DELETE /api/enrichment/cache
     * Clear the enrichment cache
     */
    app.delete('/api/enrichment/cache', (req, res) => {
        enrichmentService.cache.clear();
        logger.info('🧹 Enrichment cache cleared');

        res.json({
            success: true,
            message: 'Cache cleared'
        });
    });

    /**
     * POST /api/enrichment/batch-photos
     * Batch photo search for multiple contacts
     *
     * Body: {
     *   contacts: Array<{name, company, email}>
     * }
     */
    app.post('/api/enrichment/batch-photos', async (req, res) => {
        try {
            const { contacts } = req.body;

            if (!Array.isArray(contacts) || contacts.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Contacts array is required'
                });
            }

            if (contacts.length > 50) {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum 50 contacts per batch'
                });
            }

            logger.info(`📸 Batch photo search: ${contacts.length} contacts`);

            const results = await Promise.allSettled(
                contacts.map(contact =>
                    enrichmentService.findContactPhoto(contact)
                )
            );

            const formattedResults = results.map((result, index) => ({
                contact: contacts[index],
                result: result.status === 'fulfilled' ? result.value : {
                    success: false,
                    error: result.reason.message
                }
            }));

            const successCount = formattedResults.filter(r => r.result.success).length;

            logger.info(`✅ Batch complete: ${successCount}/${contacts.length} photos found`);

            res.json({
                success: true,
                total: contacts.length,
                found: successCount,
                results: formattedResults
            });

        } catch (error) {
            logger.error('Batch photo search error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/contacts/search
     * Search for contacts by company name/domain
     *
     * Body: {
     *   companyName: string,
     *   domain: string (optional),
     *   placeId: string (optional)
     * }
     */
    app.post('/api/contacts/search', async (req, res) => {
        try {
            const { companyName, domain, placeId } = req.body;

            if (!companyName) {
                return res.status(400).json({
                    success: false,
                    error: 'Company name is required'
                });
            }

            logger.info(`🔍 Contact search: ${companyName}`);

            // For now, return empty array since Google Contacts API requires OAuth
            // This endpoint is a placeholder for future Google Contacts integration
            const contacts = [];

            // If Google Contacts API is configured, search would happen here
            // const googleContacts = await searchGoogleContacts(companyName, domain);
            // contacts.push(...googleContacts);

            logger.info(`✅ Contact search complete: ${contacts.length} contacts found`);

            res.json({
                success: true,
                contacts: contacts,
                source: 'placeholder',
                note: 'Google Contacts API integration pending OAuth setup'
            });

        } catch (error) {
            logger.error('Contact search error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/config/google-contacts-available
     * Check if Google Contacts API is available
     */
    app.get('/api/config/google-contacts-available', (req, res) => {
        // Check if Google Contacts credentials are configured
        const available = !!(
            process.env.GOOGLE_CONTACTS_CLIENT_ID &&
            process.env.GOOGLE_CONTACTS_CLIENT_SECRET &&
            process.env.GOOGLE_CONTACTS_REFRESH_TOKEN
        );

        res.json({
            available: available,
            status: available ? 'configured' : 'not_configured'
        });
    });

    /**
     * POST /api/enrichment/google-places-predictions
     * Get autocomplete predictions from Google Places API
     *
     * Body: {
     *   input: string
     * }
     */
    app.post('/api/enrichment/google-places-predictions', async (req, res) => {
        try {
            const { input } = req.body;

            if (!input || input.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Input must be at least 2 characters'
                });
            }

            const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                return res.status(503).json({
                    success: false,
                    error: 'Google Places API key not configured'
                });
            }

            // Feature flag: Use New API if enabled
            const useNewAPI = process.env.USE_NEW_PLACES_API === 'true';
            logger.info(`🔍 Google Places predictions (${useNewAPI ? 'NEW' : 'LEGACY'} API): "${input}"`);

            let predictions = [];
            let apiVersion = useNewAPI ? 'new' : 'legacy';

            // Try New API first if enabled
            if (useNewAPI) {
                try {
                    const placesNew = createGooglePlacesNew(apiKey);
                    const response = await placesNew.autocomplete(input, { types: ['establishment'] });

                    if (response.success) {
                        const adapted = GooglePlacesAdapter.adaptAutocompleteResponse(response);
                        predictions = adapted.predictions || [];
                        logger.info(`✅ NEW API success: ${predictions.length} predictions`);
                    } else {
                        throw new Error(response.error || 'New API failed');
                    }
                } catch (newApiError) {
                    logger.warn(`🔄 NEW API failed (${newApiError.message}), falling back to LEGACY API`);
                    apiVersion = 'legacy_fallback';

                    // Fallback to Legacy API
                    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                        params: {
                            input: input,
                            types: 'establishment',
                            key: apiKey
                        },
                        timeout: 5000
                    });

                    if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
                        predictions = response.data.predictions || [];
                        logger.info(`✅ LEGACY API fallback success: ${predictions.length} predictions`);
                    }
                }
            } else {
                // Use Legacy API directly
                try {
                    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                        params: {
                            input: input,
                            types: 'establishment',
                            key: apiKey
                        },
                        timeout: 5000
                    });

                    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                        logger.error(`Google Places API error: ${response.data.status} - ${response.data.error_message || 'No error message'}`);
                    } else {
                        predictions = response.data.predictions || [];
                        logger.info(`✅ LEGACY API success: ${predictions.length} predictions`);
                    }
                } catch (apiError) {
                    logger.error('Google Places API request failed:', apiError.message);
                }
            }

            res.json({
                success: true,
                predictions: predictions,
                count: predictions.length,
                apiVersion: apiVersion
            });

        } catch (error) {
            logger.error('Google Places predictions error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    logger.info('✅ Contact enrichment endpoints registered');
}

module.exports = setupEnrichmentEndpoints;
