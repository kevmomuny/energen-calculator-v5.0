/**
 * Customer Enrichment Service
 * Handles all customer data enrichment operations
 */

// Get API service dynamically (it may not be available at module load time)
function getAPI() {
  return window.apiService || window.EnergenApp?.modules?.api;
}

import { logoService } from './logo-service.js'

export class EnrichmentService {
  constructor() {
    this.currentEnrichment = null
  }

  /**
   * Autocomplete company name using Google Places API
   * @param {string} input - The search query (min 3 characters)
   * @returns {Promise<{predictions: Array}>} Array of place predictions
   */
  async autocomplete(input) {
    if (!input || input.length < 3) {
      return { predictions: [] }
    }

    try {
      const api = getAPI()
      if (!api) {
        throw new Error('API service not available')
      }

      const result = await api.autocomplete(input)
      return result
    } catch (error) {
      window.logError?.('enrichment', 'Autocomplete failed', error)
      return { predictions: [] }
    }
  }

  /**
   * Full customer enrichment flow
   */
  async enrichCustomer(companyName, address, placeId = null) {
    if (!companyName) {
      throw new Error('Company name is required for enrichment')
    }

    try {
      // 1. Get Google Places data
      const api = getAPI();
      if (!api) {
        throw new Error('API service not available');
      }
      const placeData = await api.enrichCustomer(companyName, address, placeId)
      
      // 2. Format business type intelligently
      const businessType = this.detectBusinessType(companyName, placeData.types)
      
      // 3. Determine industry
      const industry = this.detectIndustry(businessType, companyName)
      
      // 4. Get logo if website available
      let logoUrl = null
      if (placeData.website) {
        // Try the new logo service first (client-side with multiple providers)
        logoUrl = await logoService.getLogo(placeData.website, companyName)

        // Fallback to server API if needed
        if (!logoUrl && api) {
          logoUrl = await api.getCompanyLogo(companyName, placeData.website)
        }
      }
      
      // 5. Use properly parsed address from server OR fallback to string parsing
      let addressComponents
      if (placeData.parsed_address) {
        // Use the server's proper address_components parsing
        addressComponents = {
          street: placeData.parsed_address.street,
          city: placeData.parsed_address.city,
          state: placeData.parsed_address.state,
          zip: placeData.parsed_address.zip,
          country: placeData.parsed_address.country
        }
      } else {
        // Fallback to string parsing (less reliable)
        addressComponents = this.parseAddress(placeData.formatted_address, companyName)
      }
      
      // Store current enrichment
      this.currentEnrichment = {
        ...placeData,
        businessType,
        industry,
        logoUrl,
        addressComponents,
        enrichedAt: new Date().toISOString()
      }
      
      return this.currentEnrichment
    } catch (error) {
      window.logError('enrichment', 'Enrichment failed', error)
      throw error
    }
  }

  /**
   * Detect business type from name and Google types
   */
  detectBusinessType(companyName, googleTypes = []) {
    const nameLower = companyName.toLowerCase()
    
    // Check company name for specific keywords
    if (nameLower.includes('fire') || nameLower.includes('cal fire')) {
      return 'Fire Department'
    }
    if (nameLower.includes('university') || nameLower.includes('college') || nameLower.includes('csu')) {
      return 'Educational Institution'
    }
    if (nameLower.includes('hospital') || nameLower.includes('medical') || nameLower.includes('health')) {
      return 'Healthcare Facility'
    }
    if (nameLower.includes('police') || nameLower.includes('sheriff')) {
      return 'Law Enforcement'
    }
    if (nameLower.includes('city of') || nameLower.includes('county of')) {
      return 'Government Agency'
    }
    if (nameLower.includes('school')) {
      return 'School'
    }
    
    // Check Google types for meaningful ones
    const priorityTypes = [
      'university', 'school', 'hospital', 'fire_station', 'police',
      'local_government_office', 'restaurant', 'store', 'bank', 'hotel',
      'gas_station', 'shopping_mall', 'airport', 'factory'
    ]
    
    for (const type of googleTypes) {
      if (priorityTypes.includes(type)) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
    }
    
    // Skip generic types
    if (googleTypes.includes('establishment') || 
        googleTypes.includes('point_of_interest') ||
        googleTypes.includes('business')) {
      return 'Business'
    }
    
    // Format the first non-generic type
    const firstType = googleTypes.find(t => 
      !['establishment', 'point_of_interest'].includes(t)
    )
    
    if (firstType) {
      return firstType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    
    return 'Organization'
  }

  /**
   * Detect industry from business type
   */
  detectIndustry(businessType, companyName) {
    const typeStr = businessType.toLowerCase()
    const nameStr = companyName.toLowerCase()
    
    if (typeStr.includes('university') || typeStr.includes('school') || 
        typeStr.includes('education') || nameStr.includes('academy')) {
      return 'Education'
    }
    if (typeStr.includes('government') || typeStr.includes('fire') || 
        typeStr.includes('police') || nameStr.includes('cal fire') ||
        nameStr.includes('city of') || nameStr.includes('county')) {
      return 'Government/Public Service'
    }
    if (typeStr.includes('hospital') || typeStr.includes('medical') || 
        typeStr.includes('healthcare') || typeStr.includes('clinic')) {
      return 'Healthcare'
    }
    if (typeStr.includes('manufacturing') || typeStr.includes('factory')) {
      return 'Manufacturing'
    }
    if (typeStr.includes('tech') || typeStr.includes('software') || 
        nameStr.includes('tech') || nameStr.includes('software')) {
      return 'Technology'
    }
    if (typeStr.includes('restaurant') || typeStr.includes('food')) {
      return 'Food Service'
    }
    if (typeStr.includes('hotel') || typeStr.includes('lodging')) {
      return 'Hospitality'
    }
    if (typeStr.includes('bank') || typeStr.includes('financial')) {
      return 'Financial Services'
    }
    if (typeStr.includes('store') || typeStr.includes('retail')) {
      return 'Retail'
    }
    
    return 'General Business'
  }

  /**
   * Parse address string into components
   */
  parseAddress(formattedAddress, companyName) {
    if (!formattedAddress) {
      return {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
    }
    
    // If the formatted address starts with the company name, remove it
    let cleanAddress = formattedAddress
    if (companyName && formattedAddress.toLowerCase().startsWith(companyName.toLowerCase())) {
      // Remove company name from the beginning
      cleanAddress = formattedAddress.substring(companyName.length).replace(/^,\s*/, '')
    }
    
    const parts = cleanAddress.split(',').map(p => p.trim())
    
    // Initialize components
    const components = {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
    
    // Working backwards is more reliable for US addresses
    // Format is typically: Street, City, State ZIP, Country
    let stateZipFound = false
    
    // Find state and ZIP first (usually in format "CA 95827" or "California 95827")
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      
      // Skip USA/United States
      if (part === 'USA' || part === 'United States') {
        components.country = part
        continue
      }
      
      // Check for state + ZIP pattern
      const stateZip = part.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
      if (stateZip) {
        components.state = stateZip[1]
        components.zip = stateZip[2]
        stateZipFound = true
        
        // Everything before this is street and city
        if (i >= 2) {
          components.city = parts[i - 1]
          components.street = parts.slice(0, i - 1).join(', ')
        } else if (i === 1) {
          components.city = parts[0]
        }
        break
      }
      
      // Check for country
      if (part === 'USA' || part === 'United States') {
        components.country = part
        continue
      }
      
      // Might be just state
      if (part.length === 2 && /^[A-Z]{2}$/.test(part)) {
        components.state = part
      }
    }
    
    return components
  }

  /**
   * Get tax rate for customer location
   */
  async getTaxRate(address, city, zip, state = 'CA') {
    try {
      const api = getAPI();
      if (!api) {
        throw new Error('API service not available');
      }
      return await api.getTaxRate(address, city, zip, state)
    } catch (error) {
      window.logError('enrichment', 'Tax rate lookup failed', error)
      return 0.1025 // Default California rate
    }
  }

  /**
   * Calculate distance from shop to customer
   */
  async calculateDistance(shopAddress, customerAddress) {
    if (!customerAddress) {
      throw new Error('Customer address is required for distance calculation')
    }

    try {
      const api = getAPI();
      if (!api) {
        throw new Error('API service not available');
      }
      return await api.calculateDistance(shopAddress, customerAddress)
    } catch (error) {
      window.logError('enrichment', 'Distance calculation failed', error)
      throw error // Let caller handle this
    }
  }

  /**
   * Get current enrichment data
   */
  getCurrentEnrichment() {
    return this.currentEnrichment
  }

  /**
   * Clear current enrichment
   */
  clearEnrichment() {
    this.currentEnrichment = null
  }
}