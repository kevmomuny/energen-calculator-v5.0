/**
 * Enhanced Customer Enrichment Service
 * Handles automatic enrichment triggers and complete data flow
 * @module services/enhanced-enrichment
 */

import { api } from './api.js';
import { logoService } from './logo-service.js';
import { state } from './state.js';

export class EnhancedEnrichmentService {
  constructor() {
    this.currentEnrichment = null;
    this.pendingEnrichment = null;
    this.enrichmentInProgress = false;
    this.distanceCalculationInProgress = false;
    this.lastEnrichedAddress = null;
    this.lastCalculatedDistance = null;
  }

  /**
   * Initialize automatic enrichment triggers
   */
  initAutoTriggers() {
    // Set up address autocomplete listener
    this.setupAddressAutocomplete();
    
    // Set up manual address completion listener
    this.setupManualAddressTrigger();
    
    // Set up logo tap-and-choose
    this.setupLogoSelector();
  }

  /**
   * Setup Google Places Autocomplete
   */
  setupAddressAutocomplete() {
    const addressInput = document.getElementById('address');
    if (!addressInput || !window.google?.maps?.places) {
      console.warn('Google Places not available, using fallback');
      return;
    }

    // Create autocomplete instance
    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ['address'],
      componentRestrictions: { country: 'us' }
    });

    // Listen for place selection
    autocomplete.addListener('place_changed', async () => {
      const place = autocomplete.getPlace();
      
      if (place.geometry) {
        // Extract address components
        const addressData = this.extractAddressComponents(place);
        
        // Update form fields
        this.updateAddressFields(addressData);
        
        // Trigger automatic enrichment
        await this.triggerAutoEnrichment(addressData);
        
        // Trigger automatic distance calculation
        await this.triggerDistanceCalculation(addressData);
      }
    });
  }

  /**
   * Setup manual address completion trigger
   */
  setupManualAddressTrigger() {
    const addressFields = ['address', 'city', 'state', 'zip'];
    let debounceTimer = null;

    addressFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (!field) return;

      field.addEventListener('blur', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          // Check if we have minimum required address data
          const hasAddress = this.hasCompleteAddress();
          
          if (hasAddress && !this.isSameAddress()) {
            const addressData = this.getCurrentAddressData();
            
            // Trigger enrichment
            await this.triggerAutoEnrichment(addressData);
            
            // Trigger distance calculation
            await this.triggerDistanceCalculation(addressData);
          }
        }, 500);
      });
    });
  }

  /**
   * Setup logo tap-and-choose functionality
   */
  setupLogoSelector() {
    const logoContainer = document.getElementById('companyLogo');
    if (!logoContainer) return;

    // Create logo selector UI
    logoContainer.innerHTML = `
      <div class="logo-selector">
        <div class="current-logo" id="currentLogo">
          <img src="/assets/placeholder-logo.png" alt="Company Logo" />
          <div class="logo-overlay">
            <button class="btn-change-logo" onclick="enhancedEnrichment.openLogoSelector()">
              <i class="fas fa-camera"></i> Change Logo
            </button>
          </div>
        </div>
        <div class="logo-options" id="logoOptions" style="display: none;">
          <h4>Select Logo Source:</h4>
          <button onclick="enhancedEnrichment.fetchLogoFromWeb()">
            <i class="fas fa-globe"></i> Fetch from Website
          </button>
          <button onclick="enhancedEnrichment.uploadCustomLogo()">
            <i class="fas fa-upload"></i> Upload Custom
          </button>
          <button onclick="enhancedEnrichment.searchLogos()">
            <i class="fas fa-search"></i> Search Online
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Trigger automatic enrichment
   */
  async triggerAutoEnrichment(addressData) {
    if (this.enrichmentInProgress) return;
    
    this.enrichmentInProgress = true;
    const companyName = document.getElementById('companyName').value;
    
    try {
      // Show enrichment in progress
      this.showEnrichmentStatus('Enriching customer data...');
      
      // Perform enrichment
      const enrichmentData = await this.enrichCustomer(companyName, addressData);
      
      // Update UI with enriched data
      this.updateEnrichedFields(enrichmentData);
      
      // Store in state
      state.enrichmentData = enrichmentData;
      
      // Show success
      this.showEnrichmentStatus('Customer data enriched', 'success');
      
    } catch (error) {
      console.error('Auto-enrichment failed:', error);
      this.showEnrichmentStatus('Enrichment failed', 'error');
    } finally {
      this.enrichmentInProgress = false;
    }
  }

  /**
   * Trigger automatic distance calculation
   */
  async triggerDistanceCalculation(addressData) {
    if (this.distanceCalculationInProgress) return;
    
    this.distanceCalculationInProgress = true;
    
    try {
      // Show calculation in progress
      this.showDistanceStatus('Calculating distance...');
      
      // Build customer address string
      const customerAddress = `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.zip}`;
      
      // Get shop address from config or env
      const shopAddress = state.config?.shopAddress || '150 Mason Circle, Concord, CA 94520';
      
      // Calculate distance
      const distanceData = await api.calculateDistance(shopAddress, customerAddress);
      
      // Update distance field
      const distanceField = document.getElementById('travelDistance');
      if (distanceField) {
        distanceField.value = Math.round(distanceData.distance);
      }
      
      // Update round trip display
      const roundTripField = document.getElementById('roundTripDistance');
      if (roundTripField) {
        roundTripField.value = Math.round(distanceData.distance * 2);
      }
      
      // Store in state (use state.distance for calculations)
      state.distance = distanceData.distance;         // PRIMARY: Used by calculations
      state.travelDistance = distanceData.distance;   // LEGACY: Keep for compatibility
      state.distanceData = distanceData;              // FULL DATA: Keep complete response
      
      // Show success
      this.showDistanceStatus(`Distance: ${Math.round(distanceData.distance)} miles`, 'success');
      
      // Trigger recalculation if needed
      if (window.recalculatePricing) {
        window.recalculatePricing();
      }
      
    } catch (error) {
      console.error('Distance calculation failed:', error);
      this.showDistanceStatus('Using default distance', 'warning');
      
      // Use default distance
      const distanceField = document.getElementById('travelDistance');
      if (distanceField && !distanceField.value) {
        distanceField.value = 120; // Default distance
      }
    } finally {
      this.distanceCalculationInProgress = false;
    }
  }

  /**
   * Full customer enrichment flow
   */
  async enrichCustomer(companyName, addressData) {
    if (!companyName) {
      throw new Error('Company name is required for enrichment');
    }

    // Build address string for API
    const addressString = addressData ? 
      `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.zip}` : 
      '';

    // Call enrichment API
    const enrichmentResult = await api.enrichCustomer(companyName, addressString);
    
    // Detect and set business type
    const businessType = this.detectBusinessType(companyName, enrichmentResult.types);
    
    // Detect and set industry
    const industry = this.detectIndustry(businessType, companyName);
    
    // Get tax rate for location
    let taxRate = 0.1025; // Default CA rate
    if (addressData?.zip) {
      try {
        const taxData = await api.getTaxRate(
          addressData.street,
          addressData.city,
          addressData.zip,
          addressData.state || 'CA'
        );
        taxRate = taxData.rate;
      } catch (error) {
        console.error('Tax rate lookup failed:', error);
      }
    }
    
    // Compile enrichment data
    const enrichmentData = {
      ...enrichmentResult,
      businessType,
      industry,
      taxRate,
      addressComponents: addressData,
      enrichedAt: new Date().toISOString()
    };
    
    // Store current enrichment
    this.currentEnrichment = enrichmentData;
    
    return enrichmentData;
  }

  /**
   * Detect business type from name and Google types
   */
  detectBusinessType(companyName, googleTypes = []) {
    const nameLower = companyName.toLowerCase();
    
    // Priority keyword matching
    const typeKeywords = {
      'Fire Department': ['fire', 'cal fire', 'fire department'],
      'Educational Institution': ['university', 'college', 'csu', 'institute', 'academy'],
      'Healthcare Facility': ['hospital', 'medical', 'health', 'clinic', 'healthcare'],
      'Law Enforcement': ['police', 'sheriff', 'law enforcement'],
      'Government Agency': ['city of', 'county of', 'state of', 'federal'],
      'School': ['school', 'elementary', 'middle school', 'high school'],
      'Manufacturing': ['manufacturing', 'factory', 'production'],
      'Technology': ['tech', 'software', 'systems', 'solutions', 'digital'],
      'Restaurant': ['restaurant', 'cafe', 'diner', 'grill'],
      'Retail': ['store', 'shop', 'mart', 'retail'],
      'Financial': ['bank', 'credit union', 'financial', 'investment']
    };
    
    // Check name against keywords
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => nameLower.includes(keyword))) {
        return type;
      }
    }
    
    // Check Google types
    const typeMap = {
      'university': 'Educational Institution',
      'school': 'School',
      'hospital': 'Healthcare Facility',
      'fire_station': 'Fire Department',
      'police': 'Law Enforcement',
      'local_government_office': 'Government Agency',
      'restaurant': 'Restaurant',
      'store': 'Retail Store',
      'bank': 'Financial Institution',
      'hotel': 'Hotel',
      'gas_station': 'Gas Station',
      'shopping_mall': 'Shopping Mall',
      'airport': 'Airport',
      'factory': 'Manufacturing Facility'
    };
    
    for (const googleType of googleTypes) {
      if (typeMap[googleType]) {
        return typeMap[googleType];
      }
    }
    
    // Default
    return 'Commercial Business';
  }

  /**
   * Detect industry from business type
   */
  detectIndustry(businessType, companyName) {
    const industryMap = {
      'Fire Department': 'Government/Public Safety',
      'Educational Institution': 'Education',
      'Healthcare Facility': 'Healthcare',
      'Law Enforcement': 'Government/Public Safety',
      'Government Agency': 'Government/Public Service',
      'School': 'Education',
      'Manufacturing': 'Manufacturing',
      'Technology': 'Technology',
      'Restaurant': 'Food Service',
      'Retail Store': 'Retail',
      'Financial Institution': 'Financial Services',
      'Hotel': 'Hospitality',
      'Gas Station': 'Automotive/Energy',
      'Shopping Mall': 'Retail',
      'Airport': 'Transportation',
      'Manufacturing Facility': 'Manufacturing'
    };
    
    return industryMap[businessType] || 'General Business';
  }

  /**
   * Extract address components from Google Place
   */
  extractAddressComponents(place) {
    const components = {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA'
    };
    
    // Extract street number and route
    let streetNumber = '';
    let route = '';
    
    place.address_components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('locality')) {
        components.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        components.state = component.short_name;
      }
      if (types.includes('postal_code')) {
        components.zip = component.long_name;
      }
      if (types.includes('country')) {
        components.country = component.long_name;
      }
    });
    
    // Combine street number and route
    components.street = streetNumber ? `${streetNumber} ${route}` : route;
    
    return components;
  }

  /**
   * Update address fields in the form
   */
  updateAddressFields(addressData) {
    if (addressData.street) {
      const addressField = document.getElementById('address');
      if (addressField) addressField.value = addressData.street;
    }
    
    if (addressData.city) {
      const cityField = document.getElementById('city');
      if (cityField) cityField.value = addressData.city;
    }
    
    if (addressData.state) {
      const stateField = document.getElementById('state');
      if (stateField) stateField.value = addressData.state;
    }
    
    if (addressData.zip) {
      const zipField = document.getElementById('zip');
      if (zipField) zipField.value = addressData.zip;
    }
  }

  /**
   * Update enriched fields in the form
   */
  updateEnrichedFields(enrichmentData) {
    // Update business type
    const businessTypeField = document.getElementById('businessType');
    if (businessTypeField && enrichmentData.businessType) {
      businessTypeField.value = enrichmentData.businessType;
    }
    
    // Update industry
    const industryField = document.getElementById('industry');
    if (industryField && enrichmentData.industry) {
      industryField.value = enrichmentData.industry;
    }
    
    // Update phone if available
    if (enrichmentData.phone) {
      const phoneField = document.getElementById('phone');
      if (phoneField && !phoneField.value) {
        phoneField.value = enrichmentData.phone;
      }
    }
    
    // Update website if available
    if (enrichmentData.website) {
      const websiteField = document.getElementById('website');
      if (websiteField && !websiteField.value) {
        websiteField.value = enrichmentData.website;
      }
    }
    
    // Update tax rate
    if (enrichmentData.taxRate) {
      const taxRateField = document.getElementById('taxRate');
      if (taxRateField) {
        taxRateField.value = (enrichmentData.taxRate * 100).toFixed(2);
      }
    }
  }

  /**
   * Check if we have complete address data
   */
  hasCompleteAddress() {
    const address = document.getElementById('address')?.value;
    const city = document.getElementById('city')?.value;
    const state = document.getElementById('state')?.value;
    const zip = document.getElementById('zip')?.value;
    
    return !!(address && city && (state || zip));
  }

  /**
   * Check if address has changed
   */
  isSameAddress() {
    const currentAddress = this.getCurrentAddressData();
    const lastAddress = this.lastEnrichedAddress;
    
    if (!lastAddress) return false;
    
    return (
      currentAddress.street === lastAddress.street &&
      currentAddress.city === lastAddress.city &&
      currentAddress.state === lastAddress.state &&
      currentAddress.zip === lastAddress.zip
    );
  }

  /**
   * Get current address data from form
   */
  getCurrentAddressData() {
    return {
      street: document.getElementById('address')?.value || '',
      city: document.getElementById('city')?.value || '',
      state: document.getElementById('state')?.value || '',
      zip: document.getElementById('zip')?.value || ''
    };
  }

  /**
   * Show enrichment status
   */
  showEnrichmentStatus(message, type = 'info') {
    const statusEl = document.getElementById('enrichmentStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${type}`;
      
      if (type === 'success') {
        setTimeout(() => {
          statusEl.textContent = '';
          statusEl.className = '';
        }, 3000);
      }
    }
  }

  /**
   * Show distance calculation status
   */
  showDistanceStatus(message, type = 'info') {
    const statusEl = document.getElementById('distanceStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${type}`;
      
      if (type === 'success') {
        setTimeout(() => {
          statusEl.textContent = '';
          statusEl.className = '';
        }, 3000);
      }
    }
  }

  /**
   * Logo selector methods
   */
  openLogoSelector() {
    const options = document.getElementById('logoOptions');
    if (options) {
      options.style.display = options.style.display === 'none' ? 'block' : 'none';
    }
  }

  async fetchLogoFromWeb() {
    const website = document.getElementById('website')?.value;
    const companyName = document.getElementById('companyName')?.value;
    
    if (!website && !companyName) {
      alert('Please enter a company name or website first');
      return;
    }
    
    try {
      const logoUrl = await logoService.getLogo(website, companyName);
      if (logoUrl) {
        this.updateLogo(logoUrl);
      } else {
        alert('Could not find logo automatically. Please upload a custom logo.');
      }
    } catch (error) {
      console.error('Logo fetch failed:', error);
      alert('Failed to fetch logo. Please try uploading a custom logo.');
    }
  }

  uploadCustomLogo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.updateLogo(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  }

  async searchLogos() {
    const companyName = document.getElementById('companyName')?.value;
    if (!companyName) {
      alert('Please enter a company name first');
      return;
    }
    
    // Open logo search modal (would implement full search UI)
    alert(`Logo search for "${companyName}" - Feature coming soon!`);
  }

  updateLogo(logoUrl) {
    const logoImg = document.querySelector('#currentLogo img');
    if (logoImg) {
      logoImg.src = logoUrl;
    }
    
    // Store in state
    if (state.enrichmentData) {
      state.enrichmentData.logoUrl = logoUrl;
    }
    
    // Hide options
    const options = document.getElementById('logoOptions');
    if (options) {
      options.style.display = 'none';
    }
  }
}

// Create and export singleton instance
export const enhancedEnrichment = new EnhancedEnrichmentService();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    enhancedEnrichment.initAutoTriggers();
  });
} else {
  enhancedEnrichment.initAutoTriggers();
}

// Make available globally for UI callbacks
window.enhancedEnrichment = enhancedEnrichment;