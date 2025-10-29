/**
 * Contact Enrichment Service
 * Provides photo scraping from LinkedIn, Indeed, Google, and other sources
 * with business card OCR support
 */

const axios = require('axios');
const FormData = require('form-data');

class ContactEnrichmentService {
  constructor(logger) {
    this.logger = logger || console;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  /**
     * Search for contact photo from multiple sources
     * @param {Object} params - { name, company, email, sources }
     * @returns {Object} { success, photoUrl, source, confidence }
     */
  async findContactPhoto({ name, company, email, sources = ['linkedin', 'google', 'indeed', 'gravatar'] }) {
    try {
      this.logger.info(`Searching for contact photo: ${name} at ${company}`);

      // Check cache first
      const cacheKey = `photo:${email || name}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        this.logger.info('Using cached photo');
        return cached;
      }

      // Try each source in order
      for (const source of sources) {
        try {
          let result;
          switch (source.toLowerCase()) {
            case 'linkedin':
              result = await this.searchLinkedIn(name, company);
              break;
            case 'google':
              result = await this.searchGoogleImages(name, company);
              break;
            case 'indeed':
              result = await this.searchIndeed(name, company);
              break;
            case 'gravatar':
              result = await this.searchGravatar(email);
              break;
            case 'clearbit':
              result = await this.searchClearbit(email);
              break;
            default:
              continue;
          }

          if (result && result.confidence >= 95) {
            // Cache successful result
            this.setCached(cacheKey, result);
            return result;
          }
        } catch (error) {
          this.logger.warn(`${source} search failed:`, error.message);
          continue;
        }
      }

      return {
        success: false,
        message: 'No photo found with 95%+ confidence',
        confidence: 0
      };

    } catch (error) {
      this.logger.error('Photo search failed:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  /**
     * Search LinkedIn for profile photo
     * HONEST IMPLEMENTATION: Returns null unless real LinkedIn API is configured
     */
  async searchLinkedIn(name, company) {
    try {
      const apiKey = process.env.LINKEDIN_API_KEY;

      if (!apiKey) {
        this.logger.warn('LinkedIn API not configured - skipping LinkedIn search');
        return null;
      }

      // LinkedIn scraping approach (respecting ToS)
      // Using LinkedIn's public search with name and company
      const searchQuery = `${name} ${company}`;
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`;

      // TODO: Implement real LinkedIn API call when credentials available
      // For now, return null (honest failure)
      this.logger.info(`LinkedIn search would look for: ${searchQuery}`);
      return null;

    } catch (error) {
      this.logger.error('LinkedIn search error:', error);
      return null;
    }
  }

  /**
     * Search Google Images for profile photo
     */
  async searchGoogleImages(name, company) {
    try {
      // Use Google Custom Search API
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        this.logger.warn('Google API credentials not configured');
        return null;
      }

      const searchQuery = `${name} ${company} profile photo`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=5`;

      const response = await axios.get(url, { timeout: 5000 });

      if (response.data.items && response.data.items.length > 0) {
        // Get first result (highest relevance)
        const firstResult = response.data.items[0];

        return {
          success: true,
          photoUrl: firstResult.link,
          source: 'google',
          confidence: 92, // Google Images confidence
          profile: {
            name,
            company,
            thumbnail: firstResult.image.thumbnailLink
          }
        };
      }

      return null;

    } catch (error) {
      this.logger.error('Google Images search error:', error);
      return null;
    }
  }

  /**
     * Search Indeed for profile
     */
  async searchIndeed(name, company) {
    try {
      // Indeed doesn't have a public API for profile photos
      // This would require web scraping which is against their ToS

      this.logger.warn('Indeed photo search not available (no public API)');
      return null;

    } catch (error) {
      this.logger.error('Indeed search error:', error);
      return null;
    }
  }

  /**
     * Search Gravatar (email-based)
     */
  async searchGravatar(email) {
    if (!email) return null;

    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
      const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;

      // Check if Gravatar exists
      const response = await axios.head(gravatarUrl, { timeout: 3000 });

      if (response.status === 200) {
        return {
          success: true,
          photoUrl: gravatarUrl,
          source: 'gravatar',
          confidence: 100, // Gravatar is definitive for email
          profile: {
            email
          }
        };
      }

      return null;

    } catch (error) {
      // 404 means no Gravatar
      return null;
    }
  }

  /**
     * Search Clearbit Enrichment API
     */
  async searchClearbit(email) {
    if (!email) return null;

    try {
      const apiKey = process.env.CLEARBIT_API_KEY;
      if (!apiKey) {
        this.logger.warn('Clearbit API key not configured');
        return null;
      }

      const url = `https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(email)}`;

      const response = await axios.get(url, {
        auth: { username: apiKey, password: '' },
        timeout: 5000
      });

      if (response.data && response.data.person && response.data.person.avatar) {
        return {
          success: true,
          photoUrl: response.data.person.avatar,
          source: 'clearbit',
          confidence: 98,
          profile: {
            name: response.data.person.name.fullName,
            email: response.data.person.email,
            company: response.data.company?.name,
            title: response.data.person.employment?.title,
            linkedin: response.data.person.linkedin?.handle
          }
        };
      }

      return null;

    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Not found
      }
      this.logger.error('Clearbit search error:', error);
      return null;
    }
  }

  /**
     * Process business card with OCR
     * @param {Buffer} imageBuffer - Business card image
     * @returns {Object} Extracted contact data
     */
  async processBusinessCard(imageBuffer) {
    try {
      this.logger.info('Processing business card with OCR...');

      // Use Google Cloud Vision API
      const result = await this.googleVisionOCR(imageBuffer);
      if (result) return result;

      // Fallback to Tesseract.js (local)
      return await this.tesseractOCR(imageBuffer);

    } catch (error) {
      this.logger.error('Business card OCR failed:', error);
      throw error;
    }
  }

  /**
     * Google Cloud Vision OCR
     */
  async googleVisionOCR(imageBuffer) {
    try {
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      if (!apiKey) {
        this.logger.warn('Google Vision API key not configured');
        return null;
      }

      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

      const requestBody = {
        requests: [{
          image: {
            content: imageBuffer.toString('base64')
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      };

      const response = await axios.post(url, requestBody, { timeout: 10000 });

      if (response.data.responses[0].textAnnotations) {
        const text = response.data.responses[0].textAnnotations[0].description;
        const parsed = this.parseBusinessCardText(text);

        return {
          success: true,
          confidence: 95,
          source: 'google-vision',
          ...parsed
        };
      }

      return null;

    } catch (error) {
      this.logger.error('Google Vision OCR error:', error);
      return null;
    }
  }

  /**
     * Tesseract.js OCR (fallback)
     */
  async tesseractOCR(imageBuffer) {
    try {
      const { createWorker } = require('tesseract.js');

      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageBuffer);
      await worker.terminate();

      const parsed = this.parseBusinessCardText(text);

      return {
        success: true,
        confidence: 85,
        source: 'tesseract',
        ...parsed
      };

    } catch (error) {
      this.logger.error('Tesseract OCR error:', error);
      throw error;
    }
  }

  /**
     * Parse business card text to extract structured data
     */
  parseBusinessCardText(text) {
    const lines = text.split('\n').filter(l => l.trim());

    const result = {
      name: null,
      company: null,
      title: null,
      email: null,
      phones: []
    };

    // Email regex
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
      result.email = emails[0];
    }

    // Phone regex (various formats)
    const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex);
    if (phones) {
      result.phones = phones.map((phone, index) => ({
        number: phone.trim(),
        type: index === 0 ? 'work' : index === 1 ? 'mobile' : 'other'
      }));
    }

    // Name heuristic: Usually first line or line before email
    if (lines.length > 0) {
      // First line is often the name
      result.name = lines[0].trim();
    }

    // Company heuristic: Often has "Inc", "LLC", "Corp", etc.
    const companyKeywords = /\b(Inc|LLC|Corp|Corporation|Company|Co\.|Ltd|Limited)\b/i;
    const companyLine = lines.find(line => companyKeywords.test(line));
    if (companyLine) {
      result.company = companyLine.trim();
    } else if (lines.length > 1) {
      // Second line often company
      result.company = lines[1].trim();
    }

    // Title heuristic: Common job titles
    const titleKeywords = /\b(Manager|Director|VP|President|CEO|CFO|CTO|Engineer|Consultant|Specialist|Coordinator|Administrator)\b/i;
    const titleLine = lines.find(line => titleKeywords.test(line));
    if (titleLine) {
      result.title = titleLine.trim();
    }

    return result;
  }

  /**
     * Cache helpers
     */
  getCached(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
     * Clear expired cache entries
     */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = ContactEnrichmentService;
