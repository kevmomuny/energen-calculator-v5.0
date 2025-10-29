/**
 * Zoho Books Integration
 * Handles invoice creation, payment tracking, and customer sync
 * Reuses ZohoDirectIntegration for token management
 *
 * @module src/api/zoho-books-integration
 * @version 5.0.0
 */

const fetch = require('node-fetch');
require('dotenv').config();

class ZohoBooksIntegration {
  constructor(zohoAuth, logger = console) {
    this.zohoAuth = zohoAuth; // Reuse ZohoDirectIntegration for token management
    this.logger = logger;
    this.apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
    this.booksBaseUrl = `${this.apiDomain}/books/v3`;
    this.organizationId = process.env.ZOHO_BOOKS_ORGANIZATION_ID;

    if (!this.organizationId) {
      this.logger.warn('[BOOKS] ⚠️  ZOHO_BOOKS_ORGANIZATION_ID not set in .env - Books integration will not function');
    }
  }

  /**
     * Make authenticated API request to Zoho Books
     */
  async makeApiRequest(endpoint, method = 'GET', body = null) {
    if (!this.organizationId) {
      throw new Error('ZOHO_BOOKS_ORGANIZATION_ID not configured');
    }

    const token = await this.zohoAuth.getAccessToken();

    // All Zoho Books requests require organization_id
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.booksBaseUrl}${endpoint}${separator}organization_id=${this.organizationId}`;

    const options = {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    this.logger.debug(`[BOOKS] ${method} ${endpoint}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`[BOOKS] API error: ${response.status} - ${error}`);
      throw new Error(`Zoho Books API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
     * Create invoice from Energen quote data
     * @param {Object} quoteData - Quote from calculator
     * @returns {Promise<Object>} Invoice details
     */
  async createInvoiceFromQuote(quoteData) {
    try {
      this.logger.info('[BOOKS] Creating invoice from quote:', quoteData.bidNumber);

      // Map Energen quote to Zoho Books invoice format
      const invoiceData = {
        customer_id: quoteData.customer.zohoBooksCustomerId, // Need to map from CRM Account
        invoice_number: quoteData.bidNumber,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        due_date: this.calculateDueDate(quoteData.paymentTerms || 'Net 30'),
        line_items: this.mapLineItems(quoteData),
        notes: `Generated from Quote ${quoteData.bidNumber}`,
        terms: quoteData.terms || 'Payment due within terms specified',
        discount: quoteData.discount || 0,
        discount_type: 'entity_level',
        is_discount_before_tax: true,
        tax_id: quoteData.taxId || null,
        salesperson_name: quoteData.salesperson || 'Energen Team'
      };

      const response = await this.makeApiRequest('/invoices', 'POST', invoiceData);

      this.logger.info('[BOOKS] ✅ Invoice created:', response.invoice.invoice_id);

      return {
        invoiceId: response.invoice.invoice_id,
        invoiceNumber: response.invoice.invoice_number,
        status: response.invoice.status,
        total: response.invoice.total,
        balance: response.invoice.balance,
        dueDate: response.invoice.due_date,
        invoiceUrl: response.invoice.invoice_url
      };
    } catch (error) {
      this.logger.error('[BOOKS] ❌ Invoice creation failed:', error.message);
      throw error;
    }
  }

  /**
     * Map Energen quote line items to Zoho Books format
     */
  mapLineItems(quoteData) {
    const lineItems = [];

    // Add service line items
    if (quoteData.services && quoteData.services.length > 0) {
      quoteData.services.forEach(service => {
        lineItems.push({
          name: service.name || `Service ${service.code}`,
          description: service.description || this.buildServiceDescription(service),
          rate: service.price || 0,
          quantity: service.quantity || 1,
          unit: 'service',
          item_order: lineItems.length + 1
        });
      });
    }

    // Add generator-specific line items if multi-unit
    if (quoteData.units && quoteData.units.length > 0) {
      quoteData.units.forEach((unit, index) => {
        lineItems.push({
          name: `Generator ${index + 1}: ${unit.model || 'Unknown Model'}`,
          description: `Serial: ${unit.serialNumber || 'N/A'} | kW: ${unit.kw || 'N/A'}`,
          rate: unit.totalPrice || 0,
          quantity: 1,
          unit: 'unit',
          item_order: lineItems.length + 1
        });
      });
    }

    // Add mobilization if present
    if (quoteData.mobilization && quoteData.mobilization > 0) {
      lineItems.push({
        name: 'Mobilization',
        description: 'Travel and setup charges',
        rate: quoteData.mobilization,
        quantity: 1,
        unit: 'charge',
        item_order: lineItems.length + 1
      });
    }

    return lineItems;
  }

  /**
     * Build service description from service details
     */
  buildServiceDescription(service) {
    const parts = [];
    if (service.laborHours) parts.push(`${service.laborHours} labor hrs`);
    if (service.oilQty) parts.push(`${service.oilQty} gal oil`);
    if (service.coolantQty) parts.push(`${service.coolantQty} gal coolant`);
    if (service.partsIncluded) parts.push(service.partsIncluded.join(', '));
    return parts.join(' | ');
  }

  /**
     * Calculate due date from payment terms
     */
  calculateDueDate(paymentTerms) {
    const match = paymentTerms.match(/Net (\d+)/i);
    const days = match ? parseInt(match[1]) : 30;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString().split('T')[0];
  }

  /**
     * Get invoice by ID
     */
  async getInvoice(invoiceId) {
    try {
      const response = await this.makeApiRequest(`/invoices/${invoiceId}`, 'GET');
      return response.invoice;
    } catch (error) {
      this.logger.error('[BOOKS] ❌ Get invoice failed:', error.message);
      throw error;
    }
  }

  /**
     * List all invoices (with optional filters)
     */
  async listInvoices(filters = {}) {
    try {
      let endpoint = '/invoices';
      const params = new URLSearchParams();

      if (filters.customerId) params.append('customer_id', filters.customerId);
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);

      if (params.toString()) {
        endpoint += '?' + params.toString();
      }

      const response = await this.makeApiRequest(endpoint, 'GET');
      return response.invoices || [];
    } catch (error) {
      this.logger.error('[BOOKS] ❌ List invoices failed:', error.message);
      throw error;
    }
  }

  /**
     * Record payment for invoice
     */
  async recordPayment(invoiceId, paymentData) {
    try {
      this.logger.info('[BOOKS] Recording payment for invoice:', invoiceId);

      const paymentPayload = {
        customer_id: paymentData.customerId,
        payment_mode: paymentData.paymentMode || 'cash',
        amount: paymentData.amount,
        date: paymentData.date || new Date().toISOString().split('T')[0],
        reference_number: paymentData.referenceNumber || null,
        description: paymentData.description || 'Payment received',
        invoices: [{
          invoice_id: invoiceId,
          amount_applied: paymentData.amount
        }]
      };

      const response = await this.makeApiRequest('/customerpayments', 'POST', paymentPayload);

      this.logger.info('[BOOKS] ✅ Payment recorded:', response.payment.payment_id);

      return {
        paymentId: response.payment.payment_id,
        paymentNumber: response.payment.payment_number,
        amount: response.payment.amount,
        date: response.payment.date
      };
    } catch (error) {
      this.logger.error('[BOOKS] ❌ Payment recording failed:', error.message);
      throw error;
    }
  }

  /**
     * Get invoice PDF
     */
  async getInvoicePDF(invoiceId) {
    try {
      const token = await this.zohoAuth.getAccessToken();
      const url = `${this.booksBaseUrl}/invoices/${invoiceId}?organization_id=${this.organizationId}&accept=pdf`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`PDF download failed: ${response.status}`);
      }

      return await response.buffer();
    } catch (error) {
      this.logger.error('[BOOKS] ❌ PDF download failed:', error.message);
      throw error;
    }
  }

  /**
     * Email invoice to customer
     */
  async emailInvoice(invoiceId, emailData) {
    try {
      const emailPayload = {
        send_from_org_email_id: true,
        to_mail_ids: emailData.recipients,
        cc_mail_ids: emailData.cc || [],
        subject: emailData.subject || 'Invoice from Energen',
        body: emailData.body || 'Please find your invoice attached.'
      };

      const response = await this.makeApiRequest(
        `/invoices/${invoiceId}/email`,
        'POST',
        emailPayload
      );

      this.logger.info('[BOOKS] ✅ Invoice emailed');
      return { success: true };
    } catch (error) {
      this.logger.error('[BOOKS] ❌ Email failed:', error.message);
      throw error;
    }
  }

  /**
     * Sync Zoho CRM Account to Zoho Books Customer
     * Required before creating invoices
     */
  async syncAccountToCustomer(crmAccount) {
    try {
      // Search for existing customer
      const searchResponse = await this.makeApiRequest(
        `/contacts?company_name=${encodeURIComponent(crmAccount.Account_Name)}`,
        'GET'
      );

      if (searchResponse.contacts && searchResponse.contacts.length > 0) {
        // Customer exists
        this.logger.info('[BOOKS] Customer found:', searchResponse.contacts[0].contact_id);
        return searchResponse.contacts[0].contact_id;
      }

      // Create new customer
      const customerData = {
        contact_name: crmAccount.Account_Name,
        company_name: crmAccount.Account_Name,
        contact_type: 'customer',
        billing_address: {
          address: crmAccount.Billing_Street || '',
          city: crmAccount.Billing_City || '',
          state: crmAccount.Billing_State || '',
          zip: crmAccount.Billing_Code || '',
          country: 'USA'
        },
        phone: crmAccount.Phone || '',
        website: crmAccount.Website || '',
        notes: `Synced from Zoho CRM Account ID: ${crmAccount.id}`
      };

      const response = await this.makeApiRequest('/contacts', 'POST', customerData);

      this.logger.info('[BOOKS] ✅ Customer created:', response.contact.contact_id);
      return response.contact.contact_id;

    } catch (error) {
      this.logger.error('[BOOKS] ❌ Customer sync failed:', error.message);
      throw error;
    }
  }
}

module.exports = ZohoBooksIntegration;
