# Service Card Templates

This directory contains HTML templates for different service card variants used in the Energen Calculator v5.0.

## Template Files

### 1. service-card-default.html
**Used for:** Services A, B, C, E, I, J (standard services)

**Features:**
- Service name and description
- Dynamic pricing display
- Standard frequency selector (Quarterly, Semi-Annual, Annual)
- Service breakdown display area

**Placeholders:**
- `${unitId}` - Unit identifier
- `${code}` - Service code (A, B, C, etc.)
- `${serviceName}` - Display name of service
- `${description}` - Service description text
- `${fuelType}` - Fuel type restriction (if applicable)
- `${hasKw}` - Boolean for kW entry state
- `${isQuarterly}`, `${isSemiAnnual}`, `${isAnnual}` - Frequency active states

---

### 2. service-card-d.html
**Used for:** Service D (Fluid Analysis)

**Features:**
- Three fluid analysis checkboxes (Oil, Coolant, Fuel)
- Individual pricing display for each fluid type
- Standard frequency selector
- Cumulative price calculation

**Placeholders:**
- All default placeholders plus:
- `${oilPrice}` - Oil analysis price
- `${coolantPrice}` - Coolant analysis price
- `${fuelPrice}` - Fuel analysis price

---

### 3. service-card-h.html
**Used for:** Service H (5-Year Electrical Testing)

**Features:**
- Single checkbox for opt-in
- "Every 5 Years" frequency indicator
- No standard frequency selector (fixed 5-year interval)

**Placeholders:**
- `${unitId}` - Unit identifier
- `${serviceName}` - Display name
- `${description}` - Service description
- `${hasKw}` - Boolean for kW entry state

---

### 4. service-card-fg.html
**Used for:** Services F (Fuel System Cleaning) and G (Turbocharger Overhaul)

**Features:**
- "By Recommendation" pricing display
- Binary toggle: "Not Included" / "Add Service"
- No standard frequency selector

**Placeholders:**
- `${unitId}` - Unit identifier
- `${code}` - Service code (F or G)
- `${serviceName}` - Display name
- `${description}` - Service description
- `${fuelType}` - Fuel type restriction
- `${hasKw}` - Boolean for kW entry state

---

### 5. service-card-custom.html
**Used for:** CUSTOM service entries

**Features:**
- Custom description input field
- Parts cost input (currency)
- Labor hours input (numeric)
- Dynamic price calculation based on inputs

**Placeholders:**
- `${unitId}` - Unit identifier
- `${serviceName}` - Display name ("Custom Service")
- `${description}` - Service description
- `${hasKw}` - Boolean for kW entry state

---

### 6. service-card-k.html
**Used for:** Service K (if implemented)

**Features:**
- Simple card without frequency selector
- Basic pricing display
- Service breakdown area

**Placeholders:**
- `${unitId}` - Unit identifier
- `${serviceName}` - Display name
- `${description}` - Service description
- `${fuelType}` - Fuel type restriction
- `${hasKw}` - Boolean for kW entry state

---

## Usage

These templates are designed to be loaded and rendered dynamically using JavaScript template literals. All `onclick` handlers have been removed to support event delegation.

### Event Delegation Pattern

Instead of inline handlers, attach events via:

```javascript
// Example: Frequency button clicks
document.addEventListener('click', (e) => {
    if (e.target.matches('.frequency-btn')) {
        const unitId = e.target.closest('.service-card').id.split('-service-')[0];
        const serviceCode = // extract from card ID
        const frequency = e.target.dataset.freq;
        setFrequency(unitId, serviceCode, frequency, e.target);
    }
});
```

### Loading Templates

```javascript
async function loadTemplate(templateName) {
    const response = await fetch(`/frontend/templates/${templateName}.html`);
    return await response.text();
}

// Usage
const defaultTemplate = await loadTemplate('service-card-default');
```

---

## Maintenance Notes

1. **Keep templates in sync** with the main UI file when making structural changes
2. **Test all variants** after modifications
3. **Preserve accessibility** attributes when updating
4. **Document new placeholders** in this README when adding variables
5. **Validate HTML** structure before committing changes

---

## Version History

- **v5.0** - Initial template extraction (2025-10-01)
  - Separated 6 service card variants from integrated-ui.html
  - Removed inline event handlers for event delegation support
  - Added comprehensive placeholder documentation
