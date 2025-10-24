/**
 * Logo Service
 * Integrates with Brandfetch and other logo providers
 */

export class LogoService {
  constructor() {
    // Logo provider configurations - Updated for 2025 with best providers
    this.providers = {
      // NEW: FaviconExtractor - Best quality with multiple sizes
      faviconExtractor: {
        baseUrl: 'https://faviconextractor.com/api',
        priority: 1,
        sizes: [128, 256, 512]
      },
      // Keep: Brandfetch - Best for brand assets
      brandfetch: {
        baseUrl: 'https://cdn.brandfetch.io',
        formats: ['svg', 'png'],
        sizes: [200, 400],
        priority: 2
      },
      // Keep: Logo.dev - Good quality
      logoDev: {
        baseUrl: 'https://img.logo.dev',
        apiKey: 'pk_IR-QgGp6SbiohLPBG3wlgw',
        priority: 3
      },
      // NEW: Favicon.is - Fast and free
      faviconIs: {
        baseUrl: 'https://favicon.is',
        priority: 4
      },
      // NEW: Favicone - Open source option
      favicone: {
        baseUrl: 'https://favicone.com',
        priority: 5
      },
      // Keep: Google - Reliable but lower quality
      google: {
        baseUrl: 'https://www.google.com/s2/favicons',
        maxSize: 128,
        priority: 6
      },
      // Keep: DuckDuckGo - Last resort
      duckduckgo: {
        baseUrl: 'https://icons.duckduckgo.com/ip3',
        priority: 7
      }
    }
    
    // Cache for logo URLs
    this.cache = new Map()
    this.cacheTimeout = 24 * 60 * 60 * 1000 // 24 hours
  }

  /**
   * Get logo for a company
   */
  async getLogo(domain, companyName = null) {
    // Check cache first
    const cacheKey = domain || companyName
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {

        return cached.url
      }
    }
    
    // Clean up domain
    const cleanDomain = this.cleanDomain(domain)
    
    if (!cleanDomain) {

      return null
    }
    
    // Try providers in order
    const logoUrl = await this.tryProviders(cleanDomain)
    
    // Cache the result
    if (logoUrl) {
      this.cache.set(cacheKey, {
        url: logoUrl,
        timestamp: Date.now()
      })
    }
    
    return logoUrl
  }

  /**
   * Try multiple logo providers - Enhanced with 2025 best services
   */
  async tryProviders(domain) {
    // 1. NEW: Try FaviconExtractor first (best quality, multiple sizes)
    const faviconExtractorUrl = this.getFaviconExtractorUrl(domain, 256)
    if (await this.checkImageExists(faviconExtractorUrl)) {
      console.log('✅ Logo from FaviconExtractor (high quality):', domain)
      return faviconExtractorUrl
    }

    // 2. Try Brandfetch (best brand quality) - try multiple variations
    let brandfetchUrl = this.getBrandfetchUrl(domain)
    if (await this.checkImageExists(brandfetchUrl)) {

      return brandfetchUrl
    }

    // Try symbol variant if logo fails
    brandfetchUrl = this.getBrandfetchUrl(domain, { type: 'symbol' })
    if (await this.checkImageExists(brandfetchUrl)) {

      return brandfetchUrl
    }

    // 3. Try Logo.dev (high quality)
    const logoDevUrl = this.getLogoDevUrl(domain)
    if (await this.checkImageExists(logoDevUrl)) {

      return logoDevUrl
    }

    // 4. NEW: Try Favicon.is (fast and reliable)
    const faviconIsUrl = this.getFaviconIsUrl(domain)
    if (await this.checkImageExists(faviconIsUrl)) {

      return faviconIsUrl
    }

    // 5. NEW: Try Favicone (open source)
    const faviconeUrl = this.getFaviconeUrl(domain)
    if (await this.checkImageExists(faviconeUrl)) {

      return faviconeUrl
    }

    // 6. Try Google Favicons (reliable fallback)
    const googleUrl = this.getGoogleFaviconUrl(domain)
    if (await this.checkImageExists(googleUrl)) {

      return googleUrl
    }

    // 7. Try DuckDuckGo (last resort)
    const duckUrl = this.getDuckDuckGoUrl(domain)
    console.log('⚠️ Logo from DuckDuckGo (last resort):', domain)
    return duckUrl
  }

  /**
   * Get Brandfetch URL with advanced options
   */
  getBrandfetchUrl(domain, options = {}) {
    const { baseUrl } = this.providers.brandfetch
    const {
      type = 'logo',        // logo, symbol, icon
      theme = 'light',      // light, dark  
      fallback = 'default', // default, lettermark, 404
      height = 200,
      width = 200
    } = options

    let url = `${baseUrl}/${domain}`
    
    // Add type if not default
    if (type !== 'logo') {
      url += `/${type}`
    }
    
    // Add dimensions
    url += `/w/${width}/h/${height}`
    
    return url
  }

  /**
   * Get Logo.dev URL
   */
  getLogoDevUrl(domain) {
    const { baseUrl, apiKey } = this.providers.logoDev
    return `${baseUrl}/${domain}?token=${apiKey}&size=200`
  }

  /**
   * Get Google Favicon URL
   */
  getGoogleFaviconUrl(domain) {
    const { baseUrl, maxSize } = this.providers.google
    return `${baseUrl}?domain=${domain}&sz=${maxSize}`
  }

  /**
   * Get DuckDuckGo URL
   */
  getDuckDuckGoUrl(domain) {
    const { baseUrl } = this.providers.duckduckgo
    return `${baseUrl}/${domain}.ico`
  }

  /**
   * NEW: Get FaviconExtractor URL - Best quality with size options
   */
  getFaviconExtractorUrl(domain, size = 128) {
    const { baseUrl } = this.providers.faviconExtractor
    return `${baseUrl}/${domain}?size=${size}`
  }

  /**
   * NEW: Get Favicon.is URL - Fast and simple
   */
  getFaviconIsUrl(domain) {
    const { baseUrl } = this.providers.faviconIs
    return `${baseUrl}/${domain}`
  }

  /**
   * NEW: Get Favicone URL - Open source option
   */
  getFaviconeUrl(domain) {
    const { baseUrl } = this.providers.favicone
    return `${baseUrl}/${domain}`
  }

  /**
   * Check if image exists at URL
   */
  async checkImageExists(url) {
    try {
      // Create image element to test loading
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        
        // Set timeout for slow responses
        setTimeout(() => resolve(false), 2000)
        
        img.src = url
      })
    } catch (error) {
      return false
    }
  }

  /**
   * Clean domain from URL
   */
  cleanDomain(domain) {
    if (!domain) return null
    
    try {
      // If it's a full URL, extract domain
      if (domain.includes('://')) {
        const url = new URL(domain)
        return url.hostname.replace('www.', '')
      }
      
      // Remove www. if present
      return domain.replace('www.', '').split('/')[0]
    } catch (error) {
      window.logError('logo', 'Domain cleaning failed', error)
      return domain
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()

  }

  /**
   * Get high resolution logo URL if available
   */
  getHighResUrl(logoUrl) {
    // FaviconExtractor: increase size parameter
    if (logoUrl.includes('faviconextractor.com')) {
      return logoUrl.replace(/size=\d+/, 'size=512')
    }

    // Brandfetch: increase size parameters
    if (logoUrl.includes('brandfetch.io')) {
      return logoUrl.replace('/w/200/h/200', '/w/400/h/400')
    }

    // Logo.dev: increase size parameter
    if (logoUrl.includes('logo.dev')) {
      return logoUrl.replace('size=200', 'size=400')
    }

    // Google, Favicon.is, Favicone: already at their max
    return logoUrl
  }
}

// Export singleton instance
export const logoService = new LogoService()