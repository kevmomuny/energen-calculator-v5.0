/**
 * Contact Selector Service
 * Provides modal for selecting contacts with photos
 * Similar pattern to logo-selector.js
 */

import { contactService } from './contact-service.js'

export class ContactSelectorService {
  constructor() {
    this.modalElement = null
    this.onSelectCallback = null
    this.contacts = []
    this.selectedContactId = null
  }

  /**
   * Show contact selector modal
   */
  async showSelector(companyName, domain, placeId, onSelect) {
    this.onSelectCallback = onSelect
    this.companyName = companyName

    // Create modal if it doesn't exist
    if (!this.modalElement) {
      this.createModal()
    }

    // Show modal with loading state
    this.modalElement.classList.add('active')
    this.modalElement.style.display = 'flex' // Override inline style
    const grid = document.getElementById('contactGrid')
    grid.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading contacts...</div>'

    try {
      // Get all contacts from all sources
      const contacts = await contactService.getAllContactsForCompany(
        companyName,
        domain,
        placeId
      )

      this.contacts = contacts
      this.populateModal(contacts)
    } catch (error) {
      console.error('Error loading contacts:', error)
      this.populateModal([])
    }
  }

  /**
   * Create or attach to existing modal element
   */
  createModal() {
    // Use existing modal from HTML
    this.modalElement = document.getElementById('contactPickerModal')

    if (!this.modalElement) {
      console.error('Contact picker modal not found in HTML')
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
   * Populate modal with contact options
   */
  populateModal(contacts) {
    const grid = document.getElementById('contactGrid')
    grid.innerHTML = ''

    // Add "Add New Contact" option first
    const addNewOption = document.createElement('div')
    addNewOption.className = 'contact-option add-contact-option'
    addNewOption.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; cursor: pointer;">
        <span class="material-symbols-outlined" style="font-size: 48px; color: var(--accent-blue); margin-bottom: 12px;">person_add</span>
        <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">Add New Contact</div>
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">Create manually</div>
      </div>
    `
    addNewOption.onclick = () => this.addNewContact()
    grid.appendChild(addNewOption)

    // Add each contact as an option
    contacts.forEach((contact, index) => {
      const option = document.createElement('div')
      option.className = 'contact-option'
      option.dataset.contactId = contact.id

      // Check if this is currently selected
      if (contact.id === this.selectedContactId) {
        option.classList.add('selected')
      }

      // Photo or avatar
      const photoHtml = contact.photoUrl
        ? `<img src="${contact.photoUrl}" alt="${contact.name}" class="contact-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="contact-avatar-fallback" style="display: none;">
             <span class="material-symbols-outlined" style="font-size: 40px;">person</span>
           </div>`
        : `<div class="contact-avatar-fallback">
             <span class="material-symbols-outlined" style="font-size: 40px;">person</span>
           </div>`

      option.innerHTML = `
        <div style="position: relative;">
          ${photoHtml}
          ${contact.isPrimary ? '<div class="primary-badge">PRIMARY</div>' : ''}
        </div>
        <div class="contact-info">
          <div class="contact-name">${contact.name || 'Unnamed'}</div>
          ${contact.title ? `<div class="contact-title">${contact.title}</div>` : ''}
          ${contact.email ? `<div class="contact-email">${contact.email}</div>` : ''}
          ${contact.phone ? `<div class="contact-phone">${contact.phone}</div>` : ''}
        </div>
        <div class="contact-actions">
          <button class="btn-icon primary-btn" title="Set as primary" data-contact-id="${contact.id}">
            <span class="material-symbols-outlined">star</span>
          </button>
          <button class="btn-icon edit-btn" title="Edit contact" data-contact-id="${contact.id}">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon delete-btn" title="Delete contact" data-contact-id="${contact.id}">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      `

      // Main click selects contact
      option.onclick = (e) => {
        // Don't select if clicking action buttons
        if (e.target.closest('.contact-actions')) return
        this.selectContact(contact)
      }

      // Action button handlers
      const primaryBtn = option.querySelector('.primary-btn')
      if (primaryBtn) {
        primaryBtn.onclick = (e) => {
          e.stopPropagation()
          this.setPrimaryContact(contact.id)
        }
      }

      const editBtn = option.querySelector('.edit-btn')
      if (editBtn) {
        editBtn.onclick = (e) => {
          e.stopPropagation()
          this.editContact(contact)
        }
      }

      const deleteBtn = option.querySelector('.delete-btn')
      if (deleteBtn) {
        deleteBtn.onclick = (e) => {
          e.stopPropagation()
          this.deleteContact(contact.id)
        }
      }

      grid.appendChild(option)
    })

    // If no contacts, show helpful message
    if (contacts.length === 0) {
      const noContactsMsg = document.createElement('div')
      noContactsMsg.className = 'no-contacts-message'
      noContactsMsg.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
          <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3; margin-bottom: 12px;">contacts</span>
          <p style="font-size: 12px; margin-bottom: 8px;">No contacts found for ${this.companyName}</p>
          <p style="font-size: 10px;">Click "Add New Contact" to create one</p>
        </div>
      `
      grid.appendChild(noContactsMsg)
    }
  }

  /**
   * Select a contact
   */
  selectContact(contact) {
    // Update UI selection
    document.querySelectorAll('.contact-option').forEach(opt => {
      opt.classList.remove('selected')
    })

    const option = document.querySelector(`[data-contact-id="${contact.id}"]`)
    if (option) {
      option.classList.add('selected')
    }

    this.selectedContactId = contact.id

    // Callback with contact data
    if (this.onSelectCallback) {
      this.onSelectCallback(contact)
    }

    // Close modal after short delay for visual feedback
    setTimeout(() => {
      this.hideModal()
    }, 300)
  }

  /**
   * Set primary contact
   */
  setPrimaryContact(contactId) {
    // Update in ContactManager
    if (window.contactManager) {
      window.contactManager.setPrimaryContact(contactId)

      // Update UI
      this.contacts = this.contacts.map(c => ({
        ...c,
        isPrimary: c.id === contactId
      }))

      this.populateModal(this.contacts)

      // Show notification
      if (typeof window.showNotification === 'function') {
        window.showNotification('Primary contact updated', 'success')
      }
    }
  }

  /**
   * Edit contact
   */
  editContact(contact) {
    // Use existing ContactManager edit functionality
    if (window.contactManager) {
      this.hideModal()
      window.contactManager.editContact(contact.id)
    }
  }

  /**
   * Delete contact
   */
  deleteContact(contactId) {
    if (confirm('Delete this contact?')) {
      if (window.contactManager) {
        window.contactManager.deleteContact(contactId)

        // Remove from local list
        this.contacts = this.contacts.filter(c => c.id !== contactId)

        // Refresh modal
        this.populateModal(this.contacts)

        // Show notification
        if (typeof window.showNotification === 'function') {
          window.showNotification('Contact deleted', 'success')
        }
      }
    }
  }

  /**
   * Add new contact
   */
  addNewContact() {
    // Close this modal
    this.hideModal()

    // Open add contact modal
    if (typeof window.addContact === 'function') {
      window.addContact()

      // Pre-fill company name if available
      setTimeout(() => {
        const companyField = document.getElementById('contactCompany')
        if (companyField && this.companyName) {
          companyField.value = this.companyName
        }
      }, 100)
    }
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
   * Show modal
   */
  showModal() {
    if (this.modalElement) {
      this.modalElement.classList.add('active')
    }
  }
}

// Export singleton
export const contactSelector = new ContactSelectorService()
