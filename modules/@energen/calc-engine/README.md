# @energen/calc-engine

> Pure calculation engine for Energen generator service pricing - Excel parity guaranteed

## Overview

This module is the **authoritative source** for all Energen service calculations. It provides 100% Excel parity with `ServiceCalculator.xlsx` (Aug 13, 2024) and is designed to be the foundation for the entire Energen ecosystem.

## Key Features

- ✅ **100% Excel Parity** - Every calculation matches Excel exactly
- 🚀 **Zero Dependencies** - Pure JavaScript, no external libraries
- 💉 **Dependency Injection** - Inject tax/distance providers
- 🔄 **Platform Agnostic** - Works in Node.js, Browser, React Native
- 📊 **Full Audit Trail** - Complete calculation transparency
- ⚡ **Built-in Caching** - Automatic result memoization
- 🛡️ **Type Safe** - Full TypeScript definitions available
- 📦 **Modular Architecture** - Use only what you need

## Installation

```bash
# Internal package - not published to npm
npm install file:./modules/@energen/calc-engine
```

## Quick Start

### Modern ESM Usage

```javascript
import { EnergenCalculationEngine } from '@energen/calc-engine';

// Create engine instance
const engine = new EnergenCalculationEngine();

// Calculate service pricing
const result = await engine.calculate({
    customerInfo: {
        address: '100 Campus Center',
        city: 'Seaside',
        state: 'CA',
        zip: '93955'
    },
    generators: [{
        kw: 150,
        quantity: 1
    }],
    services: ['A', 'B', 'C'], // Service codes
    contractLength: 12, // months
    facilityType: 'commercial'
});

console.log(`Total: $${result.calculation.total}`);
```

### Legacy CommonJS Usage

```javascript
const EnergenCalculationEngine = require('@energen/calc-engine');

const engine = new EnergenCalculationEngine();
// Same API as above
```

## Dependency Injection

Inject external service providers for tax rates and distance calculations:

```javascript
import { EnergenCalculationEngine } from '@energen/calc-engine';

const engine = new EnergenCalculationEngine({
    // Inject tax rate provider (e.g., CDTFA API)
    taxRateProvider: async (customerInfo) => {
        const response = await fetch(`/api/tax-rate?zip=${customerInfo.zip}`);
        const data = await response.json();
        return data.rate;
    },
    
    // Inject distance provider (e.g., Google Maps)
    distanceProvider: async (customerInfo) => {
        const response = await fetch(`/api/distance?address=${customerInfo.address}`);
        const data = await response.json();
        return data.miles;
    },
    
    // Configuration overrides
    config: {
        laborRates: {
            standard: 191,
            overtime: 255.50
        },
        mileageRate: 2.50
    }
});
```

## Service Codes

| Code | Service | Frequency |
|------|---------|-----------|
| A | Comprehensive Inspection | Quarterly |
| B | Oil & Filter Service | Annual |
| C | Coolant Service | Biannual |
| D | Oil & Fuel Analysis | Annual |
| E | Load Bank Testing | Annual |
| F | Engine Tune-Up (Diesel) | Every 3 years |
| G | Gas Engine Tune-Up | Every 3 years |
| H | Generator Electrical Testing | Every 5 years |
| I | Transfer Switch Service | Annual |
| J | Thermal Imaging Scan | Annual |

## API Reference

### `new EnergenCalculationEngine(dependencies)`

Creates a new calculation engine instance.

#### Parameters

- `dependencies.taxRateProvider` - Async function to get tax rates
- `dependencies.distanceProvider` - Async function to get distances
- `dependencies.config` - Configuration overrides
- `dependencies.enableCache` - Enable calculation caching (default: true)
- `dependencies.enableAudit` - Enable audit logging (default: true)

### `engine.calculate(payload)`

Performs service calculations with Excel parity.

#### Payload Structure

```javascript
{
    customerInfo: {
        companyName: string,
        address: string,
        city: string,
        state: string,    // 2-letter code
        zip: string,
        email?: string,
        phone?: string
    },
    generators: [{
        kw: number,       // 2-2050
        quantity: number, // Default: 1
        brand?: string,
        model?: string,
        cylinders?: number,      // For F/G services
        injectorType?: 'pop'|'unit' // For F service
    }],
    services: string[],   // ['A', 'B', 'C', etc.]
    contractLength: number, // Months (default: 12)
    facilityType: 'commercial'|'government'|'contract'|'non-contract'
}
```

#### Response Structure

```javascript
{
    success: true,
    calculation: {
        // Totals
        laborTotal: string,
        partsTotal: string,
        travelTotal: string,
        subtotal: string,
        tax: string,
        taxRate: string,
        total: string,
        
        // Monthly/Annual
        annual: string,
        monthly: string,
        
        // Service breakdown
        serviceBreakdown: {...},
        services: [...],
        
        // Distance/Mileage
        distance: number,
        mileageCost: string
    },
    metadata: {
        version: string,
        calculatedAt: string,
        duration: number,
        excelParityDate: string
    }
}
```

### `engine.getAuditLog()`

Returns the complete calculation audit trail for debugging.

### `engine.clearCache()`

Clears the calculation cache.

### `engine.getVersionInfo()`

Returns version information and Excel parity date.

## Testing

```bash
# Run all tests
npm test

# Excel parity tests only
npm run test:parity

# Validate against Excel file
npm run validate
```

## Migration from Legacy

### From `complete-calculation-engine.cjs`

```javascript
// Old
const EnergenCalculationEngine = require('./complete-calculation-engine.cjs');
const engine = new EnergenCalculationEngine();

// New - Use legacy adapter
import { LegacyCalculationEngine } from '@energen/calc-engine/legacy';
const engine = new LegacyCalculationEngine();
// 100% compatible API
```

### Direct Migration

```javascript
// Old monolithic approach
const result = await engine.calculate(payload);

// New modular approach (same API!)
import { EnergenCalculationEngine } from '@energen/calc-engine';
const engine = new EnergenCalculationEngine();
const result = await engine.calculate(payload);
```

## Architecture

```
@energen/calc-engine/
├── index.js                 # Main entry point
├── core/
│   ├── CalculationCore.js   # Pure calculation logic
│   ├── ServiceDefinitions.js # Service A-J definitions
│   ├── MaterialRates.js     # Material costs & markups
│   ├── KwRangeMapper.js     # kW range mapping
│   ├── ValidationEngine.js  # Input validation
│   ├── AuditLogger.js       # Calculation audit trail
│   └── CacheManager.js      # Result caching
├── adapters/
│   ├── legacy.js            # Backward compatibility
│   └── commonjs.cjs         # CommonJS support
└── tests/
    └── excel-parity.js      # Excel parity tests
```

## Design Principles

1. **Pure Functions** - No side effects, deterministic results
2. **Dependency Injection** - All external services injected
3. **Immutable Data** - Never modify input data
4. **Platform Agnostic** - Works everywhere JavaScript runs
5. **Excel Parity** - Every calculation matches Excel exactly

## Excel Parity Guarantee

This module is verified against `ServiceCalculator.xlsx` (Aug 13, 2024) and maintains 100% calculation parity with `complete-calculation-engine.cjs` (Aug 21, 2024).

Any changes to calculations MUST:
1. Be verified against the Excel file
2. Pass all parity tests
3. Be documented in CHANGELOG.md
4. Update the version number

## Version History

- **5.0.0** - Complete modular rewrite with dependency injection
- **4.0.0** - Legacy version (complete-calculation-engine.cjs)

## License

PROPRIETARY - Energen Systems Inc. All calculations are trade secrets.

## Support

Internal use only. Contact development team for support.