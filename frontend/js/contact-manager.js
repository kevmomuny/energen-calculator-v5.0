/**
 * Contact Management System with localStorage
 * For Energen Calculator v4.5
 */

class ContactManager {
    constructor() {
        this.storageKey = 'energen_contacts';
        this.contacts = this.loadContacts();
        this.currentContactId = null;
    }

    // Load contacts from localStorage
    loadContacts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading contacts:', error);
            return [];
        }
    }

    // Save contacts to localStorage
    saveContacts() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.contacts));
            this.notifyUpdate();
            return true;
        } catch (error) {
            console.error('Error saving contacts:', error);
            return false;
        }
    }

    // Add new contact
    async addContact(contactData) {
        const contact = {
            id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPrimary: this.contacts.length === 0, // First contact is primary
            ...contactData
        };

        this.contacts.push(contact);
        this.saveContacts();

        // Sync to Zoho CRM if account ID is available
        if (window.state?.customer?.zohoAccountId) {
            try {
                await this.syncContactToZoho(contact, window.state.customer.zohoAccountId);
                console.log('✅ Contact synced to Zoho CRM');
            } catch (error) {
                console.error('❌ Failed to sync contact to Zoho:', error);
                // Don't fail the whole operation if Zoho sync fails
            }
        } else {
            console.warn('⚠️ No Zoho account ID available - contact saved locally only');
        }

        return contact;
    }

    // Sync contact to Zoho CRM
    async syncContactToZoho(contact, accountId) {
        try {
            // Transform contact data to Zoho format
            const zohoData = {
                accountId: accountId,
                firstName: contact.name.split(' ')[0] || contact.name,
                lastName: contact.name.split(' ').slice(1).join(' ') || contact.name.split(' ')[0],
                email: contact.email,
                phone: contact.phones?.[0]?.number || contact.phone || '',
                title: contact.title || ''
            };

            const response = await fetch('/api/zoho/create-contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(zohoData)
            });

            if (!response.ok) {
                throw new Error('Zoho API request failed');
            }

            const result = await response.json();

            if (result.success && result.contactId) {
                // Store Zoho ID in local contact
                contact.zohoId = result.contactId;
                contact.isZoho = true;
                this.saveContacts();
                return result.contactId;
            } else {
                throw new Error(result.message || 'Zoho contact creation failed');
            }
        } catch (error) {
            console.error('Zoho contact sync error:', error);
            throw error;
        }
    }

    // Update existing contact
    updateContact(contactId, updates) {
        const index = this.contacts.findIndex(c => c.id === contactId);
        if (index !== -1) {
            this.contacts[index] = {
                ...this.contacts[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveContacts();
            return this.contacts[index];
        }
        return null;
    }

    // Delete contact
    deleteContact(contactId) {
        const index = this.contacts.findIndex(c => c.id === contactId);
        if (index !== -1) {
            const deleted = this.contacts.splice(index, 1)[0];
            
            // If deleted contact was primary, make the first remaining contact primary
            if (deleted.isPrimary && this.contacts.length > 0) {
                this.contacts[0].isPrimary = true;
            }
            
            this.saveContacts();
            return true;
        }
        return false;
    }

    // Set primary contact
    setPrimaryContact(contactId) {
        this.contacts.forEach(contact => {
            contact.isPrimary = contact.id === contactId;
        });
        this.saveContacts();
    }

    // Get all contacts
    getAllContacts() {
        return [...this.contacts];
    }

    // Get primary contact
    getPrimaryContact() {
        return this.contacts.find(c => c.isPrimary) || this.contacts[0] || null;
    }

    // Search contacts
    searchContacts(query) {
        const searchTerm = query.toLowerCase();
        return this.contacts.filter(contact => 
            contact.name?.toLowerCase().includes(searchTerm) ||
            contact.company?.toLowerCase().includes(searchTerm) ||
            contact.email?.toLowerCase().includes(searchTerm) ||
            contact.phone?.includes(searchTerm)
        );
    }

    // Get contact by ID
    getContact(contactId) {
        return this.contacts.find(c => c.id === contactId) || null;
    }

    // Import contacts from JSON
    importContacts(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                imported.forEach(contact => {
                    if (!contact.id) {
                        contact.id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    }
                    if (!this.contacts.find(c => c.id === contact.id)) {
                        this.contacts.push(contact);
                    }
                });
                this.saveContacts();
                return { success: true, count: imported.length };
            }
            return { success: false, error: 'Invalid format' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Export contacts as JSON
    exportContacts() {
        return JSON.stringify(this.contacts, null, 2);
    }

    // Clear all contacts
    clearAllContacts() {
        if (confirm('Are you sure you want to delete all contacts? This cannot be undone.')) {
            this.contacts = [];
            this.saveContacts();
            return true;
        }
        return false;
    }

    // Notify UI of updates
    notifyUpdate() {
        window.dispatchEvent(new CustomEvent('contactsUpdated', {
            detail: { contacts: this.contacts }
        }));
    }

    // Load contacts from Zoho CRM by account ID
    async loadContactsFromZoho(accountId) {
        try {
            console.log('📇 Loading contacts from Zoho for account:', accountId);

            const response = await fetch(`/api/zoho/contacts/${accountId}`);
            const data = await response.json();

            if (data.success && data.contacts && data.contacts.length > 0) {
                // Transform Zoho contacts to match our local format
                this.contacts = data.contacts.map(contact => ({
                    id: `zoho_${contact.id}`,
                    name: contact.fullName || `${contact.firstName} ${contact.lastName}`.trim(),
                    company: contact.accountName || '',
                    email: contact.email || '',
                    phone: contact.phone || '',
                    title: contact.title || '',
                    isPrimary: false,
                    isZoho: true, // Flag to indicate this is from Zoho
                    zohoId: contact.id
                }));

                // Mark first contact as primary if none exists
                if (this.contacts.length > 0 && !this.contacts.some(c => c.isPrimary)) {
                    this.contacts[0].isPrimary = true;
                }

                this.renderContactList();
                console.log(`✅ Loaded ${this.contacts.length} contacts from Zoho`);
                return true;
            } else {
                console.log('ℹ️ No contacts found in Zoho for this account');
                this.contacts = [];
                this.renderContactList();
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to load contacts from Zoho:', error);
            this.contacts = [];
            this.renderContactList();
            return false;
        }
    }

    // Render contact list HTML
    renderContactList(containerId = 'contacts-list') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.contacts.length === 0) {
            container.innerHTML = `
                <div class="no-contacts-message" style="
                    padding: 20px;
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 11px;
                ">
                    <span class="material-symbols-outlined" style="font-size: 32px; opacity: 0.3;">person_off</span>
                    <p>No contacts yet</p>
                    <p style="font-size: 9px;">Click "Add Contact" to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.contacts.map(contact => {
            // Handle both old format (single phone) and new format (phones array)
            const phones = contact.phones || (contact.phone ? [{ number: contact.phone, type: 'work' }] : []);
            const phonesHTML = phones.map(phone => `
                <div>
                    <span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">phone</span>
                    ${phone.number}
                    <span style="font-size: 8px; background: var(--bg-tertiary); padding: 2px 4px; border-radius: 3px; margin-left: 4px;">${phone.type}</span>
                </div>
            `).join('');

            // Contact photo or placeholder - Enhanced with Gravatar/photo support
            let photoHTML;
            if (contact.photoUrl) {
                photoHTML = `<img src="${contact.photoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-subtle);" alt="${contact.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display: none; width: 40px; height: 40px; border-radius: 50%; background: var(--bg-tertiary); align-items: center; justify-content: center; border: 2px solid var(--border-subtle);">
                               <span class="material-symbols-outlined" style="font-size: 24px; color: var(--text-tertiary);">person</span>
                           </div>`;
            } else {
                // Generate avatar from initials if no photo
                const initials = this.getInitials(contact.name);
                const color = this.getColorForName(contact.name);
                photoHTML = `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=80&bold=true" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-subtle);" alt="${contact.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display: none; width: 40px; height: 40px; border-radius: 50%; background: var(--bg-tertiary); align-items: center; justify-content: center; border: 2px solid var(--border-subtle);">
                               <span class="material-symbols-outlined" style="font-size: 24px; color: var(--text-tertiary);">person</span>
                           </div>`;
            }

            return `
                <div class="contact-card" data-contact-id="${contact.id}" style="display: flex; gap: 12px; padding: 12px;">
                    ${photoHTML}
                    <div style="flex: 1; min-width: 0;">
                        <div class="contact-primary">
                            <span class="contact-name">${contact.name || 'Unnamed'}</span>
                            ${contact.isPrimary ? '<span class="contact-badge">PRIMARY</span>' : ''}
                        </div>
                        <div style="font-size: 9px; color: var(--text-secondary); margin: 4px 0;">
                            ${contact.company || 'No company'}
                            ${contact.title ? ` • ${contact.title}` : ''}
                        </div>
                        <div style="font-size: 9px; color: var(--text-tertiary);">
                            ${contact.email ? `<div><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">mail</span> ${contact.email}</div>` : ''}
                            ${phonesHTML || '<div style="color: var(--text-tertiary); font-style: italic;">No phone</div>'}
                        </div>
                        ${contact.notes ? `<div style="font-size: 9px; color: var(--text-tertiary); margin-top: 6px; font-style: italic; border-left: 2px solid var(--border-subtle); padding-left: 8px;">${contact.notes}</div>` : ''}
                        <div class="contact-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="btn btn-sm contact-edit-btn" data-contact-id="${contact.id}" style="padding: 4px 8px; font-size: 9px;">
                                <span class="material-symbols-outlined" style="font-size: 14px;">edit</span>
                            </button>
                            ${!contact.isPrimary ? `
                                <button class="btn btn-sm contact-primary-btn" data-contact-id="${contact.id}" style="padding: 4px 8px; font-size: 9px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px;">star</span>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-danger contact-delete-btn" data-contact-id="${contact.id}" style="padding: 4px 8px; font-size: 9px;">
                                <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for contact action buttons using event delegation
        // This fixes the issue with inline onclick handlers not working with innerHTML
        container.querySelectorAll('.contact-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const contactId = btn.dataset.contactId;
                this.editContact(contactId);
            });
        });

        container.querySelectorAll('.contact-primary-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const contactId = btn.dataset.contactId;
                this.setPrimaryContact(contactId);
                this.renderContactList(); // Re-render to update UI
            });
        });

        container.querySelectorAll('.contact-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const contactId = btn.dataset.contactId;
                this.deleteContactUI(contactId);
            });
        });
    }

    // UI method to edit contact
    editContact(contactId) {
        const contact = this.getContact(contactId);
        if (!contact) return;

        this.currentContactId = contactId;
        
        // Open modal with existing data
        window.addContact(); // Reuse the existing modal
        
        // Pre-fill form
        setTimeout(() => {
            document.getElementById('contactName').value = contact.name || '';
            document.getElementById('contactCompany').value = contact.company || '';
            document.getElementById('contactEmail').value = contact.email || '';
            document.getElementById('contactPhone').value = contact.phone || '';
            document.getElementById('contactTitle').value = contact.title || '';
            document.getElementById('contactNotes').value = contact.notes || '';
            
            // Change button text
            const submitBtn = document.querySelector('.contact-modal button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Update Contact';
            }
        }, 100);
    }

    // UI method to delete contact
    deleteContactUI(contactId) {
        const contact = this.getContact(contactId);
        if (!contact) return;

        if (confirm(`Delete contact "${contact.name}"?`)) {
            if (this.deleteContact(contactId)) {
                this.renderContactList();
                // Show notification if function exists, otherwise just log
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Contact deleted', 'success');
                } else {
                    console.log('✅ Contact deleted:', contact.name);
                }
            }
        }
    }

    // Get initials from name for avatar generation
    getInitials(name) {
        if (!name) return 'NA';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // Get consistent color for name
    getColorForName(name) {
        if (!name) return '667eea';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            '667eea', '764ba2', 'f093fb', '4facfe', '00f2fe',
            'fa709a', 'fee140', '30cfd0', 'a8edea', 'f5af19'
        ];
        return colors[Math.abs(hash) % colors.length];
    }

    // Autofill customer form from primary contact
    autofillFromPrimary() {
        const primary = this.getPrimaryContact();
        if (!primary) return false;

        // Fill customer information fields
        const fields = {
            'company': primary.company,
            'contact': primary.name,
            'email': primary.email,
            'phone': primary.phone,
            'primaryEmail': primary.email,
            'primaryPhone': primary.phone
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
                // Trigger input event for any listeners
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        return true;
    }
}

// Initialize global contact manager
window.contactManager = new ContactManager();

// Listen for contact updates
window.addEventListener('contactsUpdated', (event) => {
    // Update UI contact count
    const countElement = document.getElementById('contact-count');
    if (countElement) {
        countElement.textContent = event.detail.contacts.length;
    }
});

// Handle contact form submission
window.handleContactSubmit = function(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('contactName').value,
        company: document.getElementById('contactCompany').value,
        email: document.getElementById('contactEmail').value,
        phone: document.getElementById('contactPhone').value,
        title: document.getElementById('contactTitle').value,
        notes: document.getElementById('contactNotes').value
    };

    let result;
    if (contactManager.currentContactId) {
        // Update existing contact
        result = contactManager.updateContact(contactManager.currentContactId, formData);
        window.showNotification('Contact updated successfully', 'success');
    } else {
        // Add new contact
        result = contactManager.addContact(formData);
        window.showNotification('Contact added successfully', 'success');
    }

    if (result) {
        contactManager.renderContactList();
        window.closeContactModal();
        contactManager.currentContactId = null;
    }
};

// Close contact modal
window.closeContactModal = function() {
    const modal = document.querySelector('.contact-modal-overlay');
    if (modal) {
        modal.remove();
    }
    contactManager.currentContactId = null;
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    contactManager.renderContactList();
    
    // Add autofill button if it doesn't exist
    const customerSection = document.querySelector('.customer-info');
    if (customerSection && !document.getElementById('autofill-btn')) {
        const autofillBtn = document.createElement('button');
        autofillBtn.id = 'autofill-btn';
        autofillBtn.className = 'btn btn-sm';
        autofillBtn.style.cssText = 'position: absolute; right: 10px; top: 10px; padding: 4px 8px; font-size: 9px;';
        autofillBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 14px;">person_pin</span> Autofill';
        autofillBtn.onclick = () => {
            if (contactManager.autofillFromPrimary()) {
                window.showNotification('Autofilled from primary contact', 'success');
            } else {
                window.showNotification('No primary contact found', 'warning');
            }
        };
        customerSection.style.position = 'relative';
        customerSection.appendChild(autofillBtn);
    }
});

// Make ContactManager globally available
if (typeof window !== 'undefined') {
    window.ContactManager = ContactManager;
    // Create a singleton instance for the inline onclick handlers
    window.contactManager = new ContactManager();
}

// Export for use in other modules
export default ContactManager;