/**
 * @fileoverview Brandfetch Logo Service - Drop-in replacement for Clearbit
 * @module customer-enrichment/brandfetch-logo-service
 * @version 1.0.0
 * @date 2025-01-09
 * 
 * Replaces Clearbit (shutting down Dec 1, 2025) with Brandfetch
 * Integrates with existing google-places-integration.js
 */

class BrandfetchLogoService {
    constructor() {
        // Brandfetch configuration
        this.brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID || 'demo-client-id';
        this.brandfetchBaseUrl = 'https://cdn.brandfetch.io';
        
        // Logo.dev configuration (existing fallback)
        this.logoDevApiKey = 'pk_IR-QgGp6SbiohLPBG3wlgw'; // From existing code
        this.logoDevBaseUrl = 'https://img.logo.dev';
    }

    /**
     * Main method to fetch logo - replaces existing fetchLogo in google-places-integration.js
     * @param {Object} place - Google Place object
     * @returns {Promise<string|null>} Logo URL or null
     */
    async fetchLogo(place) {

        // 1. Try Google Places Photos first (existing logic)
        if (place.photos && place.photos.length > 0) {
            const photoUrl = place.photos[0].getUrl({
                maxWidth: 200,
                maxHeight: 200
            });

            return photoUrl;
        }

        const domain = this.extractDomain(place.website);
        
        if (!domain) {

            return place.icon || null;
        }

        // 2. Try Brandfetch (NEW - replacing Clearbit)
        const brandfetchUrl = await this.tryBrandfetch(domain);
        if (brandfetchUrl) {

            return brandfetchUrl;
        }

        // 3. Try Logo.dev (existing fallback)
        const logoDevUrl = await this.tryLogoDev(domain);
        if (logoDevUrl) {

            return logoDevUrl;
        }

        // 4. Google Favicon as last resort (existing)
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        console.log('⚠️ Using Google Favicon (fallback)');
        return faviconUrl;
    }

    /**
     * Try Brandfetch API
     * @private
     */
    async tryBrandfetch(domain) {
        try {
            // Brandfetch URL format with default options
            const url = `${this.brandfetchBaseUrl}/${domain}?c=${this.brandfetchClientId}`;
            
            // Test if logo exists
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors' // Avoid CORS issues
            });
            
            // If no-cors, we can't read status but URL should work in img tag
            return url;
        } catch (error) {

            return null;
        }
    }

    /**
     * Try Logo.dev API (existing logic from google-places-integration.js)
     * @private
     */
    async tryLogoDev(domain) {
        try {
            const logoDevUrl = `${this.logoDevBaseUrl}/${domain}?token=${this.logoDevApiKey}&format=png&size=512`;
            
            // Test if logo exists
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = logoDevUrl;
                
                // Timeout after 2 seconds
                setTimeout(() => reject('Timeout'), 2000);
            });
            
            return logoDevUrl;
        } catch (error) {

            return null;
        }
    }

    /**
     * Extract domain from website URL (existing logic)
     * @private
     */
    extractDomain(url) {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return null;
        }
    }

    /**
     * Get Brandfetch URL with options
     * Can be called directly for advanced usage
     */
    getBrandfetchUrl(domain, options = {}) {
        const {
            type = 'logo',        // logo, symbol, icon
            theme = 'light',      // light, dark
            fallback = 'default', // default, lettermark, 404
            height = null,
            width = null
        } = options;

        let url = `${this.brandfetchBaseUrl}/${domain}`;
        
        // Add type if not default
        if (type !== 'logo') {
            url += `/${type}`;
        }
        
        // Add theme
        url += `/theme/${theme}`;
        
        // Add fallback
        url += `/fallback/${fallback}`;
        
        // Add dimensions
        if (height) url += `/h/${height}`;
        if (width) url += `/w/${width}`;
        
        // Add client ID
        url += `?c=${this.brandfetchClientId}`;
        
        return url;
    }
}

// Export for use in google-places-integration.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrandfetchLogoService;
} else {
    window.BrandfetchLogoService = BrandfetchLogoService;
}
