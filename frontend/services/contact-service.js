/**
 * Contact Service
 * Handles contact enrichment with photo search
 * Includes Gravatar, Google Contacts (if available), and generated avatars
 */

export class ContactService {
  constructor() {
    this.googleContactsAvailable = false
    this.checkGoogleContactsAvailability()
  }

  /**
   * Check if Google Contacts API is available
   */
  async checkGoogleContactsAvailability() {
    try {
      const response = await fetch('/api/config/google-contacts-available')
      const data = await response.json()
      this.googleContactsAvailable = data.available || false
    } catch (error) {
      console.warn('Google Contacts API not available:', error)
      this.googleContactsAvailable = false
    }
  }

  /**
   * Search for contacts by company name
   */
  async searchContacts(companyName, domain, placeId) {
    try {
      const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:3002'
        : window.location.origin

      const response = await fetch(`${API_BASE}/api/contacts/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          domain,
          placeId
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.contacts || []
      }

      return []
    } catch (error) {
      console.error('Error searching contacts:', error)
      return []
    }
  }

  /**
   * Get contact photo from multiple sources
   */
  async getContactPhoto(contact) {
    const email = contact.email

    // 1. Try Gravatar first (fastest)
    if (email) {
      const gravatarUrl = await this.getGravatarUrl(email)
      if (gravatarUrl) {
        return {
          url: gravatarUrl,
          source: 'gravatar'
        }
      }
    }

    // 2. Try Google Contacts (if available)
    if (this.googleContactsAvailable && email) {
      const googlePhoto = await this.getGoogleContactPhoto(email)
      if (googlePhoto) {
        return {
          url: googlePhoto,
          source: 'google'
        }
      }
    }

    // 3. Generate avatar as fallback
    return {
      url: this.generateAvatar(contact),
      source: 'generated'
    }
  }

  /**
   * Get Gravatar URL for email
   * Returns null if Gravatar doesn't exist
   */
  async getGravatarUrl(email) {
    if (!email) return null

    try {
      // Create MD5 hash of email
      const hash = await this.md5(email.toLowerCase().trim())

      // Check if Gravatar exists (using 404 parameter)
      const testUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`

      const response = await fetch(testUrl, { method: 'HEAD' })

      if (response.ok) {
        return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`
      }

      return null
    } catch (error) {
      console.warn('Gravatar check failed:', error)
      return null
    }
  }

  /**
   * MD5 hash function for Gravatar
   */
  async md5(string) {
    const encoder = new TextEncoder()
    const data = encoder.encode(string)
    const hashBuffer = await crypto.subtle.digest('MD5', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get photo from Google Contacts API
   * Only works if OAuth is set up
   */
  async getGoogleContactPhoto(email) {
    if (!this.googleContactsAvailable) return null

    try {
      const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:3002'
        : window.location.origin

      const response = await fetch(`${API_BASE}/api/google/contact-photo?email=${encodeURIComponent(email)}`)

      if (response.ok) {
        const data = await response.json()
        return data.photoUrl || null
      }

      return null
    } catch (error) {
      console.warn('Google Contacts photo fetch failed:', error)
      return null
    }
  }

  /**
   * Generate avatar from initials with color
   */
  generateAvatar(contact) {
    const name = contact.name || contact.email || 'Unknown'
    const initials = this.getInitials(name)
    const color = this.getColorForName(name)

    // Use UI Avatars service for high-quality generated avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=200&bold=true`
  }

  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return 'NA'

    const parts = name.trim().split(/\s+/)

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  /**
   * Get consistent color for name
   */
  getColorForName(name) {
    if (!name) return '667eea'

    // Generate hash from name
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Professional color palette
    const colors = [
      '667eea', // Blue-purple
      '764ba2', // Purple
      'f093fb', // Pink
      '4facfe', // Light blue
      '00f2fe', // Cyan
      'fa709a', // Rose
      'fee140', // Yellow
      '30cfd0', // Teal
      'a8edea', // Mint
      'f5af19', // Orange
      'f12711', // Red
      '536976', // Gray-blue
      'bbd2c5', // Sage
      '292e49', // Dark blue
      '536976'  // Slate
    ]

    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  /**
   * Enrich contact with photo
   */
  async enrichContact(contact) {
    const photo = await this.getContactPhoto(contact)

    return {
      ...contact,
      photoUrl: photo.url,
      photoSource: photo.source
    }
  }

  /**
   * Enrich multiple contacts with photos
   */
  async enrichContacts(contacts) {
    const enriched = await Promise.all(
      contacts.map(contact => this.enrichContact(contact))
    )

    return enriched
  }

  /**
   * Get contact from Google Places (if available)
   */
  async getPlaceContact(placeId) {
    if (!placeId) return null

    try {
      // This would integrate with Google Places API
      // to get business owner/manager info
      // For now, return null as this requires additional setup
      return null
    } catch (error) {
      console.warn('Google Places contact fetch failed:', error)
      return null
    }
  }

  /**
   * Search localStorage contacts by company
   */
  searchLocalContacts(companyName) {
    if (!window.contactManager) return []

    return window.contactManager.searchContacts(companyName)
  }

  /**
   * Merge contacts from multiple sources
   * Remove duplicates based on email
   */
  mergeContacts(contacts) {
    const seen = new Set()
    const merged = []

    for (const contact of contacts) {
      const key = contact.email ? contact.email.toLowerCase() : contact.name

      if (!seen.has(key)) {
        seen.add(key)
        merged.push(contact)
      }
    }

    return merged
  }

  /**
   * Get all contacts for a company from all sources
   */
  async getAllContactsForCompany(companyName, domain, placeId) {
    const sources = []

    // 1. Local storage contacts
    const localContacts = this.searchLocalContacts(companyName)
    sources.push(...localContacts)

    // 2. Backend search (includes Google Contacts if available)
    const backendContacts = await this.searchContacts(companyName, domain, placeId)
    sources.push(...backendContacts)

    // 3. Google Places contact (if available)
    const placeContact = await this.getPlaceContact(placeId)
    if (placeContact) {
      sources.push(placeContact)
    }

    // Merge and deduplicate
    const merged = this.mergeContacts(sources)

    // Enrich with photos
    return await this.enrichContacts(merged)
  }
}

// Export singleton
export const contactService = new ContactService()
