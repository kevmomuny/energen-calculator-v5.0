/**
 * Logo Selector Service
 * Provides multiple logo options for user selection
 */

import { logoService } from './logo-service.js'

export class LogoSelectorService {
  constructor() {
    this.modalElement = null
    this.onSelectCallback = null
  }

  /**
   * Get all possible logo variations for a company
   */
  async getAllLogoOptions(domain, companyName) {
    const options = []
    
    // Clean domain for better search
    const cleanDomain = this.cleanDomain(domain)
    
    // 1. Brandfetch variations
    if (cleanDomain) {
      // Standard logo
      options.push({
        url: `https://cdn.brandfetch.io/${cleanDomain}/w/400/h/400`,
        source: 'Brandfetch Logo',
        quality: 'high'
      })
      
      // Symbol/icon version
      options.push({
        url: `https://cdn.brandfetch.io/${cleanDomain}/symbol/w/400/h/400`,
        source: 'Brandfetch Symbol',
        quality: 'high'
      })
      
      // Icon version
      options.push({
        url: `https://cdn.brandfetch.io/${cleanDomain}/icon/w/400/h/400`,
        source: 'Brandfetch Icon',
        quality: 'high'
      })
    }
    
    // 2. Logo.dev variations
    if (cleanDomain) {
      const apiKey = 'pk_IR-QgGp6SbiohLPBG3wlgw'
      options.push({
        url: `https://img.logo.dev/${cleanDomain}?token=${apiKey}&size=400`,
        source: 'Logo.dev',
        quality: 'high'
      })
    }
    
    // 3. Google favicon (higher res)
    if (cleanDomain) {
      options.push({
        url: `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=256`,
        source: 'Google Favicon',
        quality: 'medium'
      })
    }
    
    // 4. DuckDuckGo icon
    if (cleanDomain) {
      options.push({
        url: `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`,
        source: 'DuckDuckGo',
        quality: 'low'
      })
    }
    
    // 5. For government agencies, try specific sources
    if (companyName) {
      const nameLower = companyName.toLowerCase()
      
      // Cal Fire specific
      if (nameLower.includes('cal fire') || nameLower.includes('calfire')) {
        options.unshift({
          url: 'https://www.fire.ca.gov/media/4897/calfire-logo.png',
          source: 'Cal Fire Official',
          quality: 'high',
          priority: true
        })
        
        // Also try fire.ca.gov domain
        options.push({
          url: `https://cdn.brandfetch.io/fire.ca.gov/w/400/h/400`,
          source: 'Fire.ca.gov',
          quality: 'high'
        })
      }
      
      // CSU specific
      if (nameLower.includes('csu') || nameLower.includes('california state university')) {
        // Try CSU system logo
        options.push({
          url: `https://cdn.brandfetch.io/calstate.edu/w/400/h/400`,
          source: 'CSU System',
          quality: 'high'
        })
      }
      
      // Try variations without "www"
      if (cleanDomain && cleanDomain.startsWith('www.')) {
        const domainNoWww = cleanDomain.replace('www.', '')
        options.push({
          url: `https://cdn.brandfetch.io/${domainNoWww}/w/400/h/400`,
          source: 'Brandfetch (no www)',
          quality: 'high'
        })
      }
    }
    
    // 6. Search-based logos (placeholder for future enhancement)
    // This could integrate with Google Custom Search API or Bing Image Search
    if (companyName) {
      options.push({
        url: await this.getSearchBasedLogo(cleanDomain || companyName),
        source: 'Web Search',
        quality: 'variable',
        searchTerm: companyName + ' logo'
      })
    }
    
    // Test which URLs actually work
    const validOptions = []
    for (const option of options) {
      const isValid = await this.testLogoUrl(option.url)
      if (isValid) {
        validOptions.push(option)
      }
    }
    
    // Sort by priority and quality
    validOptions.sort((a, b) => {
      if (a.priority && !b.priority) return -1
      if (!a.priority && b.priority) return 1
      const qualityOrder = { high: 3, medium: 2, low: 1, variable: 0 }
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0)
    })
    
    return validOptions
  }
  
  /**
   * Get search-based logo (placeholder - needs API implementation)
   */
  async getSearchBasedLogo(domainOrCompanyName) {
    // For now, return a Google search URL
    // In production, this would use Google Custom Search API or similar
    const searchTerm = encodeURIComponent(domainOrCompanyName + ' logo transparent png')

    // Try to use a known CDN that might have the logo
    if (domainOrCompanyName.toLowerCase().includes('cal fire')) {
      return 'https://www.fire.ca.gov/media/4897/calfire-logo.png'
    }

    // Default fallback - use domain if available, otherwise company name
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainOrCompanyName)}&sz=256`
  }
  
  /**
   * Get proxied URL to bypass CORS
   */
  getProxiedUrl(url) {
    if (!url) return null
    // Use backend proxy for external images
    return `/api/proxy-image?url=${encodeURIComponent(url)}`
  }

  /**
   * Test if a logo URL is valid
   */
  async testLogoUrl(url) {
    if (!url) return false

    return new Promise(resolve => {
      const img = new Image()
      const timeout = setTimeout(() => resolve(false), 3000)

      img.onload = () => {
        clearTimeout(timeout)
        // Check if image has reasonable dimensions
        resolve(img.width > 16 && img.height > 16)
      }

      img.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }

      // Use proxied URL to avoid CORS issues
      img.src = this.getProxiedUrl(url)
    })
  }
  
  /**
   * Show logo selector modal
   */
  async showSelector(domain, companyName, currentLogoUrl, onSelect) {
    this.onSelectCallback = onSelect
    this.currentLogoUrl = currentLogoUrl
    
    // Create modal if it doesn't exist
    if (!this.modalElement) {
      this.createModal()
    }
    
    // Show modal with loading state
    this.modalElement.classList.add('active')
    const grid = document.getElementById('logoGrid')
    grid.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading logo options...</div>'
    
    try {
      // Extract domain from website if needed
      let cleanDomain = domain
      if (domain) {
        try {
          const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`)
          cleanDomain = url.hostname.replace('www.', '')
        } catch (e) {
          cleanDomain = domain.replace(/https?:\/\/(www\.)?/, '').split('/')[0]
        }
      }
      
      // Fetch logo variations from backend API
      const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin
      const response = await fetch(`${API_BASE}/api/enrichment/logo-variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanDomain,
          companyName,
          website: domain || cleanDomain
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const logos = data.variations || []
        this.populateModal(logos, companyName)
      } else {
        throw new Error('Failed to fetch logo variations')
      }
    } catch (error) {
      console.error('Error fetching logos:', error)
      // Show fallback lettermark option
      const fallbackLogos = [{
        provider: 'Lettermark',
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=667eea&color=fff&size=128`,
        type: 'lettermark',
        format: 'png'
      }]
      this.populateModal(fallbackLogos, companyName)
    }
  }
  
  /**
   * Get or attach to existing modal element
   */
  createModal() {
    // Use existing modal from HTML instead of creating a new one
    this.modalElement = document.getElementById('logoPickerModal')
    
    if (!this.modalElement) {
      console.error('Logo picker modal not found in HTML')
      return
    }
    
    // Close modal on click outside
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.hideModal()
      }
    })
  }
  
  /**
   * Populate modal with logo options
   */
  populateModal(logos, companyName) {
    const grid = document.getElementById('logoGrid')
    grid.innerHTML = ''
    
    // Add manual upload option first
    const uploadOption = document.createElement('div')
    uploadOption.className = 'logo-option upload-option'
    uploadOption.style.cursor = 'pointer'
    uploadOption.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="logo-provider" style="margin-top: 8px;">Upload Logo</div>
        <div class="logo-type">Custom</div>
      </div>
    `
    
    // Create hidden file input
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.style.display = 'none'
    fileInput.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          this.selectLogo(event.target.result, 'Custom Upload')
        }
        reader.readAsDataURL(file)
      }
    }
    grid.appendChild(fileInput)
    
    uploadOption.onclick = () => fileInput.click()
    grid.appendChild(uploadOption)
    
    // Add all other logo options
    logos.forEach((logo, index) => {
      const option = document.createElement('div')
      option.className = 'logo-option'
      
      // Check if this is the currently selected logo
      if (logo.url === this.currentLogoUrl) {
        option.classList.add('selected')
      }
      
      // Use proxied URL for display
      const proxiedUrl = this.getProxiedUrl(logo.url)
      
      option.innerHTML = `
        <img src="${proxiedUrl}" alt="${logo.provider}" 
             onerror="this.src='https://ui-avatars.com/api/?name=NA&background=667eea&color=fff&size=128'">
        <div class="logo-option-info">
          <div class="logo-provider">${logo.provider}</div>
          <div class="logo-type">${logo.type}</div>
        </div>
      `
      
      option.onclick = () => this.selectLogo(proxiedUrl, logo.provider)
      grid.appendChild(option)
    })
  }
  
  /**
   * Handle logo selection
   */
  selectLogo(logoUrl, source) {
    if (this.onSelectCallback) {
      this.onSelectCallback(logoUrl, source)
    }
    
    // Close modal after short delay for visual feedback
    setTimeout(() => {
      this.hideModal()
    }, 300)
  }
  
  /**
   * Hide the modal
   */
  hideModal() {
    if (this.modalElement) {
      this.modalElement.classList.remove('active')
    }
  }
  
  /**
   * Clean domain URL
   */
  cleanDomain(domain) {
    if (!domain) return null
    
    try {
      if (domain.includes('://')) {
        const url = new URL(domain)
        return url.hostname.replace('www.', '')
      }
      return domain.replace('www.', '').split('/')[0]
    } catch {
      return domain
    }
  }
}

// Export singleton
export const logoSelector = new LogoSelectorService()