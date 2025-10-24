# ENERGEN CALCULATOR - VALIDATION RULES
## Extracted from ACTUAL CODE - No Speculation

---

## INPUT VALIDATION (server-secure.cjs Lines 148-177)

### Generator Specifications
- **kW Range**: 10 - 5000 (ENFORCED)
- **Quantity**: 1 - 100 per generator (ENFORCED)
- **Distance**: 0 - 1000 miles (ENFORCED)
- **Contract Length**: 1 - 60 months (ENFORCED)

### Customer Information
- **Name**: REQUIRED, max 200 characters
- **State**: Exactly 2 uppercase letters
- **ZIP**: Exactly 5 digits (pattern: /^\d{5}$/)
- **Tax Rate**: 0.0 - 0.2 (0% - 20%)

### Service Selection
- **Minimum Services**: At least 1 required
- **Valid Service Codes**: A, B, C, D, E, F, G, H, I, J
- **UI-Only Services**: K (Battery), CUSTOM (Parts)
  - CONFIDENCE: 3/10 - Backend implementation unverified

---

## CALCULATION RULES (complete-calculation-engine.cjs)

### kW Range Determination (Lines 64-76)
```javascript
if (kw <= 14) return '2-14';
if (kw <= 30) return '15-30';
if (kw <= 150) return '35-150';
if (kw <= 250) return '155-250';
if (kw <= 400) return '255-400';
if (kw <= 500) return '405-500';
if (kw <= 670) return '505-670';
if (kw <= 1050) return '675-1050';
if (kw <= 1500) return '1055-1500';
return '1500-2050';
```

### Material Pricing (GALLONS)
- **Oil**: $16/gallon × 1.5 markup = $24/gallon to customer
- **Coolant**: $15/gallon × 1.5 markup = $22.50/gallon to customer
- **Parts**: Cost × 1.2 markup × 1.05 freight

### Labor Rates
- **Standard**: $191/hour
- **Non-Contract**: $200/hour
- **Overtime**: $255.50/hour
- **Double Time**: $400/hour

### Mobilization Stacking
- **Enabled by Default**: true
- **Stacking Discount**: 35%
- **Base Rate**: $150/hour
- **Minimum Hours**: 1

---

## SERVICE-SPECIFIC RULES

### Service B - Oil Service (VERIFIED GALLONS)
```
2-14 kW: 1.5 gallons
15-30 kW: 3.0 gallons
35-150 kW: 5.0 gallons
155-250 kW: 8.0 gallons
255-400 kW: 12.0 gallons
405-500 kW: 18.0 gallons
505-670 kW: 30.0 gallons
675-1050 kW: 50.0 gallons
1055-1500 kW: 100.0 gallons
1500-2050 kW: 150.0 gallons
```

### Service D - Analysis Options
- **Oil Analysis**: $125 (all sizes)
- **Fuel Analysis**: $95 (all sizes)
- **Coolant Analysis**: $85 (all sizes)
- **Comprehensive Analysis**: $150 (675kW+)

### Service F - Diesel Tune-Up (by cylinders)
- Must specify cylinder count: 4, 6, 8, 12, or 16
- Must specify injector type: 'pop' or 'unit'
- Default: 4 cylinders, pop nozzle

### Service G - Gas Tune-Up (by cylinders)
- Spark plug cost: $25 each
- Valid cylinder counts: 4, 6, 8, 10, 12, 16

---

## API VALIDATION RULES

### Tax Rate API (Lines 265-288)
- **Required**: Valid 5-digit ZIP code
- **Fallback**: 10.25% if CDTFA API fails
- **Response Format**: Decimal (0.1025 for 10.25%)

### Google APIs (Single Key Required)
- **MUST USE**: GOOGLE_MAPS_API_KEY for all services
- **DO NOT CREATE**: Separate keys for Places, Distance, etc.
- **Required APIs**: Distance Matrix, Geocoding, Places, Maps JavaScript

### Zoho Integration
- **Required Fields**: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN
- **OAuth Flow**: Required for all operations
- **Token Refresh**: CANNOT VERIFY automatic refresh mechanism

---

## ERROR STATES

### Rate Limiting (Lines 109-122)
- **General API**: 100 requests per 15 minutes per IP
- **Calculate Endpoint**: 10 requests per minute per IP
- **PDF Generation**: 10 requests per minute per IP

### Request Timeout
- **All Endpoints**: 30 seconds (Line 144)
- **Body Size Limit**: 10MB (Line 140)

### Validation Failures
- Return HTTP 400 with specific error message
- Log validation error with path and details
- Do not expose internal error details in production

---

## CRITICAL UNVERIFIED ITEMS

### REQUIRES INVESTIGATION
1. Service K calculation formula
2. CUSTOM service pricing logic
3. Zoho OAuth token auto-refresh
4. PDF generation memory limits

### CANNOT CONFIRM WITHOUT TESTING
1. Multi-generator price accumulation
2. Mobilization stacking with >5 generators
3. Tax calculation for multi-state operations
4. Prevailing wage multiplier application

---

## ENFORCEMENT PRIORITIES

### NEVER OVERRIDE
1. kW range boundaries
2. Base labor rates without settings override
3. Oil/coolant gallon conversions
4. Service letter definitions (A-J)

### REQUIRES APPROVAL
1. Markup percentage changes
2. Mobilization stacking discount
3. Contract length limits
4. Tax rate overrides

### FLEXIBLE CONFIGURATION
1. Labor rates (via settings)
2. Material prices (via settings)
3. Mobilization rates (via settings)
4. CPI adjustments (via API or settings)
