# Calculator Bug Log - Phase 1 Testing

## Date: 2025-09-30

## Critical Bugs Found

### BUG #1: Service G Data Accessor (FIXED)
**Severity**: CRITICAL
**Location**: [complete-calculation-engine.cjs:406](src/api/complete-calculation-engine.cjs#L406)
**Symptom**: API returns "Cannot read properties of undefined (reading 'laborHours')"
**Root Cause**: `getServiceG()` tried to access `this.settings.serviceG?.cylinderData` but settings use `serviceG.data` (array format)
**Evidence**:
```javascript
// Settings format:
{
  "serviceG": {
    "data": [
      { "cylinders": 4, "labor": 2, ... },
      { "cylinders": 6, "labor": 3, ... }
    ]
  }
}

// Engine expected:
this.settings.serviceG?.cylinderData?.[cylinders]
```
**Fix Applied**: Changed `getServiceG()` to properly access `serviceG.data` array and use `.find()` to locate cylinder count
**Status**: FIXED ✅

### BUG #2: Missing customerInfo in Preview Prices (FIXED)
**Severity**: CRITICAL
**Location**: [complete-calculation-engine.cjs:569](src/api/complete-calculation-engine.cjs#L569)
**Symptom**: API returns "Cannot read properties of undefined (reading 'address')"
**Root Cause**: `calculate()` method assumes `customerInfo` is always provided, but preview-prices endpoint doesn't include customer information
**Evidence**: Test call with `{kw: 50}` → line 569 tries `customerInfo.address` → undefined
**Fix Applied**: Added optional chaining with defaults:
```javascript
const taxRate = await this.getTaxRate(
    customerInfo?.address || '',
    customerInfo?.city || '',
    customerInfo?.zip || ''
);
```
**Status**: FIXED ✅

## Testing Status

### Server Configuration
- ✅ Server serves UI at http://localhost:3002
- ✅ Config endpoint functional (/config/default-settings.json)
- ⚠️ API endpoint was failing (now fixed)

### API Testing
**Test Command**: `curl -X POST http://localhost:3002/api/preview-prices -d '{"kw":50}'`
**Before Fixes**: Error 500 - "Cannot read 'laborHours' of undefined"
**After Fixes**: Need to restart server and retest

## Next Steps
1. Restart server with fixed code
2. Test preview-prices API with various kW values
3. Test all services A-J individually
4. Document any additional bugs found
5. Begin UI testing with browser automation
