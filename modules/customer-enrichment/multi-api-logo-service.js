/**
 * Multi-API Logo Service with Prioritized Fallback
 * Priority: Brandfetch > Logo.dev > Google Favicon
 * Replaces Clearbit (shutting down Dec 1, 2025)
 */

class MultiApiLogoService {
    constructor() {
        // API configurations
        this.brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID || 'demo';
        this.logoDevKey = process.env.LOGODEV_SECRET_KEY || 'pk_IR-QgGp6SbiohLPBG3wlgw';
        
        // Cache configuration
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        // API endpoints in priority order
        this.apis = [
            { name: 'brandfetch', quality: 'high', enabled: true },
            { name: 'logodev', quality: 'high', enabled: true },
            { name: 'google', quality: 'medium', enabled: true }
        ];
    }

    /**
     * Get logo with multi-API fallback
     * @param {Object} options - Logo options
     * @returns {Promise<Object>} Logo data
     */
    async getLogo({ domain, companyName, size = 256, format = 'png' }) {
        // Check cache first
        const cacheKey = `${domain}-${size}-${format}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        // Clean domain
        const cleanDomain = this.extractDomain(domain);
        if (!cleanDomain) {
            return this.errorResponse('Invalid domain');
        }

        // Try each API in priority order
        for (const api of this.apis) {
            if (!api.enabled) continue;
            
            try {
                let result = null;
                
                switch (api.name) {
                    case 'brandfetch':
                        result = await this.tryBrandfetch(cleanDomain, size, format);
                        break;
                    case 'logodev':
                        result = await this.tryLogoDev(cleanDomain, size, format);
                        break;
                    case 'google':
                        result = await this.tryGoogleFavicon(cleanDomain, size);
                        break;
                }
                
                if (result && result.success) {
                    this.setCacheItem(cacheKey, result);
                    return result;
                }
            } catch (error) {
                console.debug(`${api.name} API failed:`, error.message);
            }
        }

        // No logo found
        return this.errorResponse('No logo found from any API');
    }

    /**
     * Try Brandfetch API (NEW - replacing Clearbit)
     */
    async tryBrandfetch(domain, size, format) {
        try {
            // Brandfetch CDN URL
            const url = `https://cdn.brandfetch.io/${domain}`;
            
            // Add parameters
            const params = [];
            if (size) params.push(`h/${size}`);
            if (format === 'svg') params.push('format/svg');
            
            const fullUrl = params.length > 0 
                ? `${url}/${params.join('/')}?c=${this.brandfetchClientId}`
                : `${url}?c=${this.brandfetchClientId}`;

            return {
                success: true,
                url: fullUrl,
                source: 'brandfetch',
                quality: 'high',
                domain: domain,
                size: size,
                format: format,
                features: ['svg', 'dark_mode', 'no_attribution']
            };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Try Logo.dev API (existing)
     */
    async tryLogoDev(domain, size, format) {
        if (!this.logoDevKey) {
            return { success: false };
        }

        try {
            const url = `https://img.logo.dev/${domain}`;
            const params = new URLSearchParams({
                token: this.logoDevKey,
                size: size,
                format: format,
                quality: 'high'
            });

            return {
                success: true,
                url: `${url}?${params.toString()}`,
                source: 'logo.dev',
                quality: 'high',
                domain: domain,
                size: size,
                format: format
            };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Try Google Favicon (fallback)
     */
    async tryGoogleFavicon(domain, size) {
        try {
            const googleSize = this.normalizeGoogleSize(size);
            const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=${googleSize}`;

            return {
                success: true,
                url: url,
                source: 'google_favicon',
                quality: googleSize >= 128 ? 'medium' : 'low',
                domain: domain,
                size: googleSize,
                format: 'png'
            };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Extract clean domain from input
     */
    extractDomain(input) {
        if (!input) return null;

        // Email domain extraction
        if (input.includes('@')) {
            return input.split('@')[1];
        }

        // Already clean domain
        if (!input.includes('://') && !input.includes('/')) {
            return input.replace('www.', '');
        }

        // URL extraction
        try {
            const url = input.includes('://') ? input : `https://${input}`;
            const parsed = new URL(url);
            return parsed.hostname.replace('www.', '');
        } catch {
            return input.replace('www.', '');
        }
    }

    /**
     * Normalize size for Google
     */
    normalizeGoogleSize(size) {
        const sizes = [16, 32, 64, 128, 256];
        return sizes.reduce((prev, curr) => 
            Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
        );
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return { ...cached.data, fromCache: true };
            }
        }
        return null;
    }

    setCacheItem(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    /**
     * Error response helper
     */
    errorResponse(message) {
        return {
            success: false,
            url: null,
            source: 'none',
            quality: 'none',
            message: message
        };
    }
}

// Export for both Node and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = new MultiApiLogoService();
}
if (typeof window !== 'undefined') {
    window.MultiApiLogoService = MultiApiLogoService;
}
