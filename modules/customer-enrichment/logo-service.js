/**
 * @fileoverview Enterprise Logo Service with Brandfetch API Integration
 * @module customer-enrichment/logo-service
 * @version 2.0.0
 * @date 2025-01-09
 *
 * CRITICAL: Clearbit Logo API shutting down December 1, 2025
 * This implementation uses Brandfetch as the primary provider with fallback options
 *
 * Features:
 * - Multiple logo providers (Brandfetch primary, Logo.dev backup)
 * - Smart caching with TTL
 * - Dark/light theme support
 * - SVG and PNG format support
 * - Automatic fallback to lettermarks
 * - Brand color extraction
 * - Performance monitoring
 */

import fetch from 'node-fetch';
import { LRUCache } from 'lru-cache';
import sharp from 'sharp';

/**
 * Logo Service Configuration
 */
class LogoServiceConfig {
  static PROVIDERS = {
    BRANDFETCH: 'brandfetch',
    LOGO_DEV: 'logodev',
    RITEKIT: 'ritekit',
    FALLBACK: 'fallback'
  };

  static DEFAULTS = {
    provider: 'brandfetch',
    cacheSize: 1000,
    cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  static BRANDFETCH = {
    baseUrl: 'https://cdn.brandfetch.io',
    apiUrl: 'https://api.brandfetch.io/v2/brands',
    clientId: process.env.BRANDFETCH_CLIENT_ID || '',
    formats: ['svg', 'png', 'jpg'],
    themes: ['light', 'dark'],
    types: ['logo', 'symbol', 'icon'],
    fallbacks: ['lettermark', '404']
  };

  static LOGO_DEV = {
    baseUrl: 'https://img.logo.dev',
    apiKey: process.env.LOGO_DEV_API_KEY || '',
    formats: ['webp', 'png', 'jpg'],
    sizes: [32, 64, 128, 256, 512]
  };
}

/**
 * Main Logo Service Class
 */
export class LogoService {
  constructor(config = {}) {
    this.config = { ...LogoServiceConfig.DEFAULTS, ...config };
    this.provider = this.config.provider;

    // Initialize cache
    this.cache = new LRUCache({
      max: this.config.cacheSize,
      ttl: this.config.cacheTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      avgResponseTime: 0
    };

    this.initializeProviders();
  }

  /**
   * Initialize provider-specific configurations
   */
  initializeProviders() {
    this.providers = {
      brandfetch: new BrandfetchProvider(LogoServiceConfig.BRANDFETCH),
      logodev: new LogoDevProvider(LogoServiceConfig.LOGO_DEV),
      fallback: new FallbackProvider()
    };
  }

  /**
   * Get logo URL for a domain with options
   * @param {string} domain - Company domain
   * @param {Object} options - Logo options
   * @returns {Promise<Object>} Logo data with URLs
   */
  async getLogoUrl(domain, options = {}) {
    const startTime = Date.now();

    try {
      // Normalize domain
      domain = this.normalizeDomain(domain);
      if (!domain) {
        throw new Error('Invalid domain provided');
      }

      // Check cache first
      const cacheKey = this.getCacheKey(domain, options);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        this.metrics.hits++;
        this.updateMetrics(Date.now() - startTime);
        return cached;
      }

      this.metrics.misses++;

      // Try primary provider
      let result = await this.fetchFromProvider(this.provider, domain, options);

      // Fallback to secondary providers if primary fails
      if (!result && this.provider !== 'fallback') {
        console.warn(`Primary provider ${this.provider} failed for ${domain}, trying fallbacks`);

        for (const [name, provider] of Object.entries(this.providers)) {
          if (name !== this.provider && name !== 'fallback') {
            try {
              result = await this.fetchFromProvider(name, domain, options);
              if (result) break;
            } catch (error) {
              console.warn(`Fallback provider ${name} failed:`, error.message);
            }
          }
        }
      }

      // Last resort: lettermark fallback
      if (!result) {
        result = await this.providers.fallback.generateLogo(domain, options);
      }

      // Cache the result
      this.cache.set(cacheKey, result);
      this.updateMetrics(Date.now() - startTime);

      return result;

    } catch (error) {
      this.metrics.errors++;
      console.error('Logo service error:', error);

      // Return fallback lettermark on error
      return this.providers.fallback.generateLogo(domain, options);
    }
  }

  /**
   * Fetch logo from specific provider
   */
  async fetchFromProvider(providerName, domain, options) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    return provider.fetchLogo(domain, options);
  }

  /**
   * Get multiple logo variations for a domain
   */
  async getLogoVariations(domain) {
    const variations = {};

    // Get different themes and types
    const configs = [
      { key: 'lightLogo', options: { theme: 'light', type: 'logo' } },
      { key: 'darkLogo', options: { theme: 'dark', type: 'logo' } },
      { key: 'lightSymbol', options: { theme: 'light', type: 'symbol' } },
      { key: 'darkSymbol', options: { theme: 'dark', type: 'symbol' } },
      { key: 'square', options: { type: 'symbol', format: 'png' } },
      { key: 'favicon', options: { type: 'icon', size: 32 } }
    ];

    await Promise.all(
      configs.map(async ({ key, options }) => {
        try {
          variations[key] = await this.getLogoUrl(domain, options);
        } catch (error) {
          console.warn(`Failed to get ${key} for ${domain}:`, error.message);
          variations[key] = null;
        }
      })
    );

    return variations;
  }

  /**
   * Extract brand colors from domain
   */
  async getBrandColors(domain) {
    try {
      const provider = this.providers.brandfetch;
      return await provider.fetchBrandColors(domain);
    } catch (error) {
      console.error('Failed to fetch brand colors:', error);
      return this.providers.fallback.getDefaultColors();
    }
  }

  /**
   * Validate if logo exists for domain
   */
  async validateLogo(domain) {
    try {
      const result = await this.getLogoUrl(domain, { fallback: '404' });
      return result && result.url && !result.isFallback;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();

  }

  /**
   * Get service metrics
   */
  getMetrics() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    return {
      ...this.metrics,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      cacheSize: this.cache.size
    };
  }

  // Helper methods

  normalizeDomain(input) {
    if (!input) return null;

    // Extract domain from email
    const emailMatch = input.match(/@(.+)/);
    if (emailMatch) return emailMatch[1];

    // Clean URL to domain
    const domain = input
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();

    // Basic validation
    if (!domain.includes('.') || domain.length < 3) {
      return null;
    }

    return domain;
  }

  getCacheKey(domain, options) {
    return `${domain}:${JSON.stringify(options)}`;
  }

  updateMetrics(responseTime) {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (total - 1) + responseTime) / total;
  }
}

/**
 * Brandfetch Provider Implementation
 */
class BrandfetchProvider {
  constructor(config) {
    this.config = config;
  }

  async fetchLogo(domain, options = {}) {
    const {
      type = 'logo',
      theme = 'light',
      fallback = 'lettermark',
      format = 'png',
      height = 64,
      width = null
    } = options;

    // Build Brandfetch URL
    let url = `${this.config.baseUrl}/${domain}`;

    if (type !== 'logo') {
      url += `/${type}`;
    }

    url += `/theme/${theme}`;
    url += `/fallback/${fallback}`;

    if (height) url += `/h/${height}`;
    if (width) url += `/w/${width}`;

    url += `?c=${this.config.clientId}`;

    // Validate logo exists
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return null;
    }

    return {
      url,
      provider: 'brandfetch',
      format,
      theme,
      type,
      dimensions: { height, width: width || 'auto' },
      isFallback: false
    };
  }

  async fetchBrandColors(domain) {
    const url = `${this.config.apiUrl}/${domain}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.clientId}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch brand data: ${response.status}`);
      }

      const data = await response.json();

      return {
        primary: data.colors?.primary || '#000000',
        secondary: data.colors?.secondary || null,
        accent: data.colors?.accent || null,
        palette: data.colors?.palette || []
      };
    } catch (error) {
      console.error('Brand colors fetch error:', error);
      return null;
    }
  }
}

/**
 * Logo.dev Provider Implementation
 */
class LogoDevProvider {
  constructor(config) {
    this.config = config;
  }

  async fetchLogo(domain, options = {}) {
    const {
      format = 'png',
      size = 128,
      fallback = 'monogram',
      retina = true
    } = options;

    const params = new URLSearchParams({
      token: this.config.apiKey,
      format,
      size,
      fallback,
      retina: retina.toString()
    });

    const url = `${this.config.baseUrl}/${domain}?${params}`;

    try {
      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) {
        return null;
      }

      return {
        url,
        provider: 'logodev',
        format,
        size,
        isFallback: false
      };
    } catch (error) {
      console.error('Logo.dev fetch error:', error);
      return null;
    }
  }
}

/**
 * Fallback Provider for Lettermarks
 */
class FallbackProvider {
  async generateLogo(domain, options = {}) {
    const {
      size = 64,
      theme = 'light',
      format = 'svg'
    } = options;

    // Extract initials from domain
    const name = domain.split('.')[0];
    const initials = this.getInitials(name);

    // Generate colors based on domain
    const colors = this.generateColors(domain, theme);

    if (format === 'svg') {
      const svg = this.generateSVG(initials, size, colors);
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

      return {
        url: dataUrl,
        provider: 'fallback',
        format: 'svg',
        type: 'lettermark',
        isFallback: true,
        initials,
        colors
      };
    } else {
      // For PNG, we'd need to use a library like sharp to convert SVG to PNG
      const svg = this.generateSVG(initials, size, colors);
      const pngBuffer = await this.svgToPng(svg, size);
      const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

      return {
        url: dataUrl,
        provider: 'fallback',
        format: 'png',
        type: 'lettermark',
        isFallback: true,
        initials,
        colors
      };
    }
  }

  getInitials(name) {
    // Handle camelCase, snake_case, kebab-case
    const words = name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(w => w.length > 0);

    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    } else {
      return name.toUpperCase();
    }
  }

  generateColors(domain, theme) {
    // Generate consistent colors based on domain hash
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = domain.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;

    if (theme === 'dark') {
      return {
        background: `hsl(${hue}, 70%, 25%)`,
        text: '#ffffff'
      };
    } else {
      return {
        background: `hsl(${hue}, 70%, 50%)`,
        text: '#ffffff'
      };
    }
  }

  generateSVG(initials, size, colors) {
    return `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${colors.background}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.35}" 
              font-weight="bold" fill="${colors.text}" text-anchor="middle" 
              dominant-baseline="central">${initials}</text>
      </svg>
    `;
  }

  async svgToPng(svg, size) {
    try {
      return await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toBuffer();
    } catch (error) {
      console.error('SVG to PNG conversion error:', error);
      // Return a simple 1x1 transparent PNG as last resort
      return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    }
  }

  getDefaultColors() {
    return {
      primary: '#4A90E2',
      secondary: '#7B68EE',
      accent: '#50C878',
      palette: ['#4A90E2', '#7B68EE', '#50C878', '#FFB347', '#FF6B6B']
    };
  }
}

// Export singleton instance
export const logoService = new LogoService();

// Export for testing
export default LogoService;
