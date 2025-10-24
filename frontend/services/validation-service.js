/**
 * Validation Service - Modular validation with Zoho CRM field compatibility
 * Designed to work with both local state and Zoho Catalyst DataStore
 */

export class ValidationService {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    
    // Zoho CRM field constraints (for future sync)
    this.zohoFieldLimits = {
      company_name: 255,
      email: 100,
      phone: 30,
      address: 250,
      kw_rating: { min: 1, max: 9999 },
      contract_months: { min: 1, max: 120 }
    };
    
    // Validation rules that match Zoho CRM requirements
    this.rules = {
      required: (value) => !!value && value.toString().trim() !== '',
      email: (value) => {
        // Email is optional - only validate format if provided
        if (!value || value.toString().trim() === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      phone: (value) => {
        // Phone is optional - only validate format if provided
        if (!value || value.toString().trim() === '') return true;
        return /^\d{10}$/.test(value.replace(/\D/g, ''));
      },
      kw: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= this.zohoFieldLimits.kw_rating.min &&
               num <= this.zohoFieldLimits.kw_rating.max;
      },
      taxRate: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 1;
      },
      zip: (value) => {
        // ZIP is optional - only validate format if provided
        if (!value || value.toString().trim() === '') return true;
        return /^\d{5}(-\d{4})?$/.test(value);
      },
      contractMonths: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= this.zohoFieldLimits.contract_months.min &&
               num <= this.zohoFieldLimits.contract_months.max;
      }
    };
    
    // Track validation state for form submission
    this.validationState = new Map();
    
    // Emit validation events for other modules
    if (this.eventBus) {
      this.setupEventListeners();
    }
  }
  
  /**
   * Setup event listeners for validation requests
   */
  setupEventListeners() {
    this.eventBus.on('validation:request', (data) => {
      const result = this.validateField(data.field, data.value, data.rules);
      this.eventBus.emit('validation:response', {
        field: data.field,
        result,
        requestId: data.requestId
      });
    });
    
    this.eventBus.on('validation:form', (data) => {
      const results = this.validateForm(data.form);
      this.eventBus.emit('validation:formResponse', {
        results,
        formId: data.formId
      });
    });
  }
  
  /**
   * Validate a single field with multiple rules
   * @param {string} fieldName - Field identifier
   * @param {*} value - Field value
   * @param {Array} rules - Array of rule names or custom functions
   * @returns {Object} Validation result
   */
  validateField(fieldName, value, rules = []) {
    const errors = [];
    let valid = true;
    let sanitizedValue = value;
    
    // Apply each rule
    for (const rule of rules) {
      if (typeof rule === 'string' && this.rules[rule]) {
        if (!this.rules[rule](value)) {
          valid = false;
          errors.push(this.getErrorMessage(rule, fieldName));
        }
      } else if (typeof rule === 'function') {
        const result = rule(value);
        if (result !== true) {
          valid = false;
          errors.push(typeof result === 'string' ? result : 'Invalid value');
        }
      }
    }
    
    // Sanitize value based on field type
    sanitizedValue = this.sanitizeValue(fieldName, value);
    
    // Store validation state
    this.validationState.set(fieldName, { valid, errors });
    
    // Emit validation event
    if (this.eventBus) {
      this.eventBus.emit('validation:fieldValidated', {
        field: fieldName,
        valid,
        errors,
        value: sanitizedValue
      });
    }
    
    return {
      valid,
      errors,
      value: sanitizedValue,
      originalValue: value
    };
  }
  
  /**
   * Sanitize value for Zoho compatibility
   */
  sanitizeValue(fieldName, value) {
    if (!value) return value;
    
    // Remove potential XSS/injection attempts
    let sanitized = value.toString().replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Field-specific sanitization
    switch (fieldName) {
      case 'email':
        return sanitized.toLowerCase().trim();
      
      case 'phone':
        // Store as digits only for Zoho, format for display
        return sanitized.replace(/\D/g, '');
      
      case 'kw':
      case 'kw_rating':
        return parseFloat(sanitized) || 0;
      
      case 'company_name':
      case 'address':
        // Truncate to Zoho field limits
        const limit = this.zohoFieldLimits[fieldName];
        return limit ? sanitized.slice(0, limit).trim() : sanitized.trim();
      
      default:
        return sanitized.trim();
    }
  }
  
  /**
   * Get user-friendly error message
   */
  getErrorMessage(rule, fieldName) {
    const messages = {
      required: `${this.formatFieldName(fieldName)} is required`,
      email: 'Please enter a valid email address',
      phone: 'Phone number must be 10 digits',
      kw: `Generator size must be between ${this.zohoFieldLimits.kw_rating.min}-${this.zohoFieldLimits.kw_rating.max} kW`,
      taxRate: 'Tax rate must be between 0-100%',
      zip: 'Please enter a valid ZIP code',
      contractMonths: `Contract must be ${this.zohoFieldLimits.contract_months.min}-${this.zohoFieldLimits.contract_months.max} months`
    };
    
    return messages[rule] || `${this.formatFieldName(fieldName)} is invalid`;
  }
  
  /**
   * Format field name for display
   */
  formatFieldName(fieldName) {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Validate entire form
   */
  validateForm(formData) {
    const results = {};
    let isValid = true;
    
    for (const [field, value] of Object.entries(formData)) {
      // Determine rules based on field name
      const rules = this.getFieldRules(field);
      const result = this.validateField(field, value, rules);
      
      results[field] = result;
      if (!result.valid) {
        isValid = false;
      }
    }
    
    return {
      valid: isValid,
      fields: results,
      canSubmit: isValid && this.checkRequiredFields(formData)
    };
  }
  
  /**
   * Get validation rules for a field
   */
  getFieldRules(fieldName) {
    const ruleMap = {
      email: ['email'], // Email is OPTIONAL - only validate format if provided
      phone: ['phone'], // Phone is OPTIONAL - only validate format if provided
      kw: ['required', 'kw'],
      kw_rating: ['required', 'kw'],
      company_name: ['required'],
      address: [], // Address is optional for initial quote calculation
      city: [], // City is optional for initial quote calculation
      state: [], // State is optional for initial quote calculation
      zip: ['zip'], // ZIP is optional but must be valid if provided
      tax_rate: ['taxRate'],
      contract_months: ['required', 'contractMonths']
    };

    return ruleMap[fieldName] || [];
  }
  
  /**
   * Check if all required fields are present
   */
  checkRequiredFields(formData) {
    // Only company_name and kw are truly required for quote calculation
    // Email and phone are optional - only validated if provided
    const required = ['company_name'];
    return required.every(field => formData[field]);
  }
  
  /**
   * Format value for display (UI layer)
   */
  formatForDisplay(fieldName, value) {
    if (!value) return '';
    
    switch (fieldName) {
      case 'phone':
        const digits = value.toString().replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        }
        return value;
      
      case 'tax_rate':
        const rate = parseFloat(value);
        if (!isNaN(rate)) {
          return (rate * 100).toFixed(2) + '%';
        }
        return value;
      
      case 'currency':
      case 'price':
      case 'total':
        const amount = parseFloat(value);
        if (!isNaN(amount)) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(amount);
        }
        return value;
      
      default:
        return value;
    }
  }
  
  /**
   * Prepare data for Zoho sync
   */
  prepareForZoho(formData) {
    const zohoData = {};
    
    for (const [field, value] of Object.entries(formData)) {
      // Map to Zoho field names
      const zohoField = this.mapToZohoField(field);
      
      // Validate and sanitize
      const result = this.validateField(field, value, this.getFieldRules(field));
      
      if (result.valid) {
        zohoData[zohoField] = result.value;
      }
    }
    
    // Add metadata for Zoho
    zohoData.Source = 'Energen Calculator v4.5';
    zohoData.Created_Time = new Date().toISOString();
    
    return zohoData;
  }
  
  /**
   * Map local field names to Zoho CRM fields
   */
  mapToZohoField(localField) {
    const mapping = {
      company_name: 'Company',
      email: 'Email',
      phone: 'Phone',
      kw: 'Generator_Size_kW',
      address: 'Street',
      city: 'City',
      state: 'State',
      zip: 'Zip_Code',
      tax_rate: 'Tax_Rate',
      contract_months: 'Contract_Duration_Months'
    };
    
    return mapping[localField] || localField;
  }
  
  /**
   * Real-time validation setup for input
   */
  attachToInput(inputElement, rules = [], options = {}) {
    const fieldName = inputElement.name || inputElement.id;
    
    // Debounce validation for performance
    let timeout;
    const debounceMs = options.debounce || 300;
    
    // Input event for real-time validation
    inputElement.addEventListener('input', (e) => {
      clearTimeout(timeout);
      
      // Show typing indicator
      this.showValidating(inputElement);
      
      timeout = setTimeout(() => {
        const result = this.validateField(fieldName, e.target.value, rules);
        this.showValidationResult(inputElement, result);
        
        // Format value if needed
        if (result.valid && options.format) {
          e.target.value = this.formatForDisplay(fieldName, result.value);
        }
      }, debounceMs);
    });
    
    // Blur event for final validation
    inputElement.addEventListener('blur', (e) => {
      clearTimeout(timeout);
      const result = this.validateField(fieldName, e.target.value, rules);
      this.showValidationResult(inputElement, result);
      
      // Format on blur
      if (options.formatOnBlur) {
        e.target.value = this.formatForDisplay(fieldName, result.value);
      }
    });
  }
  
  /**
   * Show validation UI feedback
   */
  showValidationResult(inputElement, result) {
    // Remove previous states
    inputElement.classList.remove('validating', 'valid', 'invalid');
    
    // Remove previous error message
    const existingError = inputElement.parentElement.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    
    if (result.valid) {
      inputElement.classList.add('valid');
    } else {
      inputElement.classList.add('invalid');
      
      // Show error message
      if (result.errors.length > 0) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = result.errors[0];
        inputElement.parentElement.appendChild(errorDiv);
      }
    }
  }
  
  /**
   * Show validating state
   */
  showValidating(inputElement) {
    inputElement.classList.remove('valid', 'invalid');
    inputElement.classList.add('validating');
  }
  
  /**
   * Check if form can be submitted
   */
  canSubmit() {
    for (const [field, state] of this.validationState) {
      if (!state.valid) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Get validation summary
   */
  getValidationSummary() {
    const errors = [];
    for (const [field, state] of this.validationState) {
      if (!state.valid) {
        errors.push({
          field,
          errors: state.errors
        });
      }
    }
    return errors;
  }
}

// Export as singleton for consistency across modules
export default new ValidationService();