/**
 * Input Field Component
 * Configurable input with validation and autocomplete
 */

import { Component } from '../core/Component.js'

export class InputField extends Component {
  constructor(config) {
    super({
      type: 'input-field',
      ...config
    })
    
    this.value = config.value || ''
    this.label = config.label || ''
    this.name = config.name || ''
    this.inputType = config.inputType || 'text'
    this.placeholder = config.placeholder || ''
    this.required = config.required || false
    this.readonly = config.readonly || false
    this.validator = config.validator || null
    this.autocomplete = config.autocomplete || null
    this.debounceTime = config.debounceTime || 300
    this.debounceTimer = null
  }

  getTemplate() {
    return `
      <div class="input-field-component">
        ${this.label ? `
          <label class="input-label" for="${this.id}-input">
            ${this.label}${this.required ? '<span class="required">*</span>' : ''}
          </label>
        ` : ''}
        <div class="input-wrapper">
          <input 
            type="${this.inputType}"
            id="${this.id}-input"
            name="${this.name}"
            class="input-element"
            placeholder="${this.placeholder}"
            value="${this.value}"
            ${this.required ? 'required' : ''}
            ${this.readonly ? 'readonly' : ''}
          >
          <div class="input-icon" data-slot="icon"></div>
          <div class="input-error" style="display: none;"></div>
          ${this.autocomplete ? '<div class="autocomplete-dropdown" data-slot="autocomplete"></div>' : ''}
        </div>
        <div class="input-help" data-slot="help"></div>
      </div>
    `
  }

  attachEventListeners() {
    const input = this.container.querySelector('.input-element')
    
    // Input event with debouncing
    input.addEventListener('input', (e) => {
      this.value = e.target.value
      this.clearError()
      
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.validate()
        this.emit('input', this.value)
        
        if (this.autocomplete && this.value.length >= (this.config.minChars || 2)) {
          this.showAutocomplete()
        } else {
          this.hideAutocomplete()
        }
      }, this.debounceTime)
    })

    // Change event
    input.addEventListener('change', (e) => {
      this.value = e.target.value
      this.validate()
      this.emit('change', this.value)
    })

    // Focus/blur events
    input.addEventListener('focus', () => {
      this.container.classList.add('focused')
      this.emit('focus')
    })

    input.addEventListener('blur', () => {
      this.container.classList.remove('focused')
      this.validate()
      this.emit('blur')
      
      // Hide autocomplete after a delay
      setTimeout(() => this.hideAutocomplete(), 200)
    })

    // Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.emit('enter', this.value)
      }
    })
  }

  /**
   * Validate input
   */
  validate() {
    if (!this.validator) return true
    
    const result = this.validator(this.value)
    
    if (result === true) {
      this.clearError()
      return true
    } else {
      this.showError(result)
      return false
    }
  }

  /**
   * Show validation error
   */
  showError(message) {
    const errorElement = this.container.querySelector('.input-error')
    errorElement.textContent = message
    errorElement.style.display = 'block'
    this.container.classList.add('has-error')
    this.emit('error', message)
  }

  /**
   * Clear validation error
   */
  clearError() {
    const errorElement = this.container.querySelector('.input-error')
    errorElement.textContent = ''
    errorElement.style.display = 'none'
    this.container.classList.remove('has-error')
  }

  /**
   * Show autocomplete suggestions
   */
  async showAutocomplete() {
    if (!this.autocomplete) return
    
    try {
      const suggestions = await this.autocomplete(this.value)
      this.renderAutocomplete(suggestions)
    } catch (error) {
      console.error('Autocomplete error:', error)
    }
  }

  /**
   * Render autocomplete dropdown
   */
  renderAutocomplete(suggestions) {
    const dropdown = this.container.querySelector('.autocomplete-dropdown')
    if (!dropdown) return
    
    dropdown.innerHTML = ''
    
    if (suggestions.length === 0) {
      dropdown.style.display = 'none'
      return
    }
    
    suggestions.forEach(suggestion => {
      const item = document.createElement('div')
      item.className = 'autocomplete-item'
      
      if (typeof suggestion === 'object') {
        item.innerHTML = `
          <div class="autocomplete-main">${suggestion.main || suggestion.text}</div>
          ${suggestion.secondary ? `<div class="autocomplete-secondary">${suggestion.secondary}</div>` : ''}
        `
        item.addEventListener('click', () => {
          this.selectSuggestion(suggestion)
        })
      } else {
        item.textContent = suggestion
        item.addEventListener('click', () => {
          this.setValue(suggestion)
          this.hideAutocomplete()
        })
      }
      
      dropdown.appendChild(item)
    })
    
    dropdown.style.display = 'block'
  }

  /**
   * Hide autocomplete dropdown
   */
  hideAutocomplete() {
    const dropdown = this.container.querySelector('.autocomplete-dropdown')
    if (dropdown) {
      dropdown.style.display = 'none'
    }
  }

  /**
   * Select autocomplete suggestion
   */
  selectSuggestion(suggestion) {
    this.setValue(suggestion.value || suggestion.text || suggestion.main)
    this.hideAutocomplete()
    this.emit('select', suggestion)
  }

  /**
   * Get input value
   */
  getValue() {
    return this.value
  }

  /**
   * Set input value
   */
  setValue(value) {
    this.value = value
    const input = this.container.querySelector('.input-element')
    if (input) {
      input.value = value
    }
    this.emit('change', value)
    return this
  }

  /**
   * Clear input
   */
  clear() {
    this.setValue('')
    this.clearError()
    return this
  }

  /**
   * Set placeholder
   */
  setPlaceholder(placeholder) {
    this.placeholder = placeholder
    const input = this.container.querySelector('.input-element')
    if (input) {
      input.placeholder = placeholder
    }
    return this
  }

  /**
   * Set as required
   */
  setRequired(required) {
    this.required = required
    const input = this.container.querySelector('.input-element')
    if (input) {
      input.required = required
    }
    this.render()
    return this
  }

  /**
   * Set as readonly
   */
  setReadonly(readonly) {
    this.readonly = readonly
    const input = this.container.querySelector('.input-element')
    if (input) {
      input.readOnly = readonly
    }
    return this
  }

  /**
   * Focus the input
   */
  focus() {
    const input = this.container.querySelector('.input-element')
    if (input) {
      input.focus()
    }
    return this
  }
}