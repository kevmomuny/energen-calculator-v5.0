# State Management Migration Guide

## Overview

This document tracks the migration from dual state management to a unified system.

## Current State (v5.0)

### Single Source of Truth
- **Location**: `frontend/js/state.js`
- **Type**: ES6 module with plain object + helper functions
- **Status**: ACTIVE (used by all modules)

### Deleted Files
- ~~`frontend/services/state.js`~~ (Class-based StateManager - REMOVED)

## State Structure

### Core Properties (DO NOT RENAME - Breaking Change)

```javascript
export const state = {
    // Core data
    units: [],              // Array of generator units
    customer: {},           // Customer information
    enrichmentData: {},     // Google Places enrichment
    calculations: {},       // Calculation results

    // Settings (SSOT - Single Source of Truth)
    activeSettings: null,   // Current user settings (CRITICAL)
    defaultSettings: null,  // Fallback settings
    sessionSettings: null,  // Session-specific settings
    settingsLoaded: false,  // Settings ready flag
    settingsSource: null,   // 'localStorage' | 'config' | 'manual'

    // Counters
    unitCounter: 1,         // Auto-increment for unit IDs

    // Selection state
    selectedPlaceId: null,  // Google Places selection

    // PDF state
    lastGeneratedPDF: null, // Most recent PDF generation

    // Modules
    modules: null,          // Loaded calculation modules

    // Event tracking
    unitEventListeners: {}, // Event listener cleanup

    // Distance
    distance: 25            // Default distance in miles
};
```

## Helper Functions

### Available Helpers

```javascript
// Settings management
getSettings()                    // Get active settings with fallback
updateSettings(newSettings)      // Update and persist settings

// Unit management
addUnit(unit)                    // Add new unit
removeUnit(unitId)               // Remove unit by ID
updateUnit(unitId, updates)      // Update existing unit
getUnit(unitId)                  // Get unit by ID
clearUnits()                     // Remove all units

// Customer management
updateCustomer(customerData)     // Update customer fields
clearCustomer()                  // Clear customer data

// Global reset
resetState()                     // Reset entire state
```

### Usage Examples

#### ES6 Module Import (Preferred)
```javascript
import { state, getSettings, addUnit, updateUnit } from './js/state.js';

// Use helpers instead of direct mutation
const settings = getSettings();
const newUnit = addUnit({ kw: 30, location: 'CA' });
updateUnit(newUnit.id, { services: ['A', 'B'] });
```

#### Global Access (Backward Compatibility)
```javascript
// Available for inline onclick handlers
// TODO: Migrate these to event delegation
window.state.units.push({ ... });           // Direct access
window.addUnit({ kw: 30, location: 'CA' }); // Helper function
```

## Migration Path

### Phase 1: Cleanup (COMPLETE)
- [x] Delete unused `frontend/services/state.js`
- [x] Remove unused import from `mobilization-stacking-ui.js`
- [x] Add helper functions to `frontend/js/state.js`
- [x] Document migration path

### Phase 2: Modernize (TODO)
- [ ] Convert inline onclick handlers to event delegation
- [ ] Replace direct `window.state` assignments with helper functions
- [ ] Add TypeScript types for state structure
- [ ] Add state validation

### Phase 3: Cleanup Global Namespace (TODO)
- [ ] Remove `window.state` exposure
- [ ] Remove `window.*` helper function exposure
- [ ] Pure ES6 module imports only

## Breaking Changes to Avoid

### DO NOT RENAME These Properties
These are used by backend API responses and calculation modules:

```javascript
// CRITICAL - Backend Dependencies
state.activeSettings  // Used by all calculation endpoints
state.units           // Used by batch calculations
state.customer        // Used by PDF generation
state.settingsLoaded  // Used by calculation timing
```

### Safe to Rename
These are frontend-only:
- `state.unitEventListeners`
- `state.selectedPlaceId`
- `state.lastGeneratedPDF`

## Debugging

### State Tracker
```javascript
import { stateDebugger } from './js/state.js';

// View state change history
stateDebugger.report();

// Track custom events
stateDebugger.track('CUSTOM_EVENT', { data: 'value' });
```

### Console Access
```javascript
// Available in browser console
window.state              // View current state
window.stateDebugger      // Access debugger
window.getSettings()      // Test helper functions
```

## File Locations

### Active Files
```
frontend/
├── js/
│   ├── state.js              <- SINGLE SOURCE OF TRUTH
│   └── STATE_MIGRATION.md    <- This file
```

### Import Patterns
```javascript
// Correct imports
import { state } from '../js/state.js';
import { state, getSettings } from './js/state.js';

// WRONG - File deleted
import { state } from '../services/state.js'; // ❌ NO LONGER EXISTS
```

## Verification

### Check for Orphaned Imports
```bash
# Should return ZERO results
grep -r "from.*services/state" frontend/

# Should show all valid imports
grep -r "from.*js/state" frontend/
```

### Test State Structure
```javascript
import { state } from './frontend/js/state.js';

console.assert(Array.isArray(state.units), 'units is array');
console.assert(typeof state.customer === 'object', 'customer is object');
console.assert(typeof state.unitCounter === 'number', 'unitCounter is number');
console.log('✅ State structure valid');
```

## Known Issues

### Window Pollution
Currently, these are exposed globally:
```javascript
window.state
window.stateDebugger
window.getSettings
window.updateSettings
window.addUnit
window.removeUnit
window.updateUnit
window.getUnit
window.clearUnits
window.updateCustomer
window.clearCustomer
window.resetState
```

**Impact**: Low (backward compatibility needed)
**Fix**: Phase 3 migration (event delegation first)

### Direct Mutation
34 files still use direct `window.state` assignment instead of helpers.

**Impact**: Medium (no validation, no tracking)
**Fix**: Gradual migration to helper functions

## Best Practices

### DO
✅ Use helper functions for state changes
✅ Import from ES6 modules
✅ Track important state changes with `stateDebugger`
✅ Validate settings before assignment

### DON'T
❌ Rename core state properties without backend coordination
❌ Mutate state without tracking
❌ Create new state management systems
❌ Import from deleted `services/state.js`

## Questions?

See:
- `frontend/js/state.js` - Implementation
- `.claude/CLAUDE.md` - Development guidelines
- `SYSTEM_CORE.md` - System architecture

---

**Last Updated**: 2025-10-03
**Status**: Phase 1 Complete, Phase 2 Pending
**Breaking Changes**: None (backward compatible)
