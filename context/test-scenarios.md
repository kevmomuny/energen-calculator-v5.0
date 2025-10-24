# TEST SCENARIOS WITH VERIFIED OUTPUTS
## Based on Actual Code Logic - No Speculation

---

## SCENARIO 1: Small Commercial Generator
**CONFIDENCE: 10/10** - All values from code

### Input
```javascript
{
  kw: 30,
  distance: 25,
  services: ["A", "B"],
  customerInfo: {
    name: "Test Company",
    city: "San Francisco",
    state: "CA",
    zip: "94105"
  },
  contractLength: 12
}
```

### Expected Calculations
**Service A - Inspection (15-30 kW range)**
- Labor: 1 hour × $191 = $191
- Travel: 1.5 hours × $191 = $286.50
- Parts: $0
- Subtotal A: $477.50

**Service B - Oil Service (15-30 kW range)**
- Labor: 1 hour × $191 = $191
- Travel: 2 hours × $191 = $382
- Filter Cost: $171.90 × 1.2 × 1.05 = $216.59
- Oil: 3 gallons × $16 × 1.5 = $72
- Subtotal B: $861.59

**Mobilization**
- Service A: 0.5 hours
- Service B: 1.0 hours
- Total: 1.5 hours × $150 = $225
- With stacking (35% discount): $146.25

**Distance**
- 25 miles × 2 × $2.50 = $125

**Total Before Tax**: $1,610.34
**Tax (10.25%)**: $165.06
**Total Quote**: $1,775.40

---

## SCENARIO 2: Data Center with Large Generator
**CONFIDENCE: 9/10** - Tax rate may vary

### Input
```javascript
{
  kw: 1000,
  distance: 50,
  services: ["A", "B", "E", "J"],
  customerInfo: {
    name: "DataCenter Corp",
    city: "San Jose",
    state: "CA",
    zip: "95110"
  },
  contractLength: 36
}
```

### Expected Calculations
**Service A - Inspection (675-1050 kW)**
- Labor: 3 hours × $191 = $573
- Travel: 1.5 hours × $191 = $286.50

**Service B - Oil Service (675-1050 kW)**
- Labor: 12 hours × $191 = $2,292
- Travel: 4 hours × $191 = $764
- Filter: $916.80 × 1.2 × 1.05 = $1,155.17
- Oil: 50 gallons × $16 × 1.5 = $1,200

**Service E - Load Bank (675-1050 kW)**
- Labor: 8 hours × $191 = $1,528
- Travel: 2 hours × $191 = $382
- Load Bank Rental: $1,500
- Transformer Rental: $1,500

**Service J - Thermal Imaging (>500 kW)**
- Labor: 4 hours × $191 = $764
- Travel: 2 hours × $191 = $382
- Report Generation: $200

**Mobilization Stacking**
- A: 0.5, B: 1.0, E: 2.0, J: 0.5 = 4.0 hours
- 4.0 × $150 × 0.65 = $390

**Distance**: 50 × 2 × $2.50 = $250

**Annual Total**: ~$13,366.67
**36-Month Total**: ~$40,100

---

## SCENARIO 3: Hospital Multi-Generator
**CONFIDENCE: 8/10** - Multi-unit accumulation needs verification

### Input
```javascript
{
  generators: [
    { kw: 500, quantity: 2 },
    { kw: 250, quantity: 1 }
  ],
  distance: 10,
  services: ["A", "B", "D", "I"],
  customerInfo: {
    name: "Regional Medical Center",
    city: "Sacramento",
    state: "CA",
    zip: "95814"
  }
}
```

### Expected Per-Generator Calculations
**500 kW Units (405-500 range) × 2**
- Service A: Labor 2.5h, Travel 1.5h
- Service B: Labor 6h, Travel 2h, Oil 18 gal, Filter $458.40
- Service D: Labor 0.5h, Analysis $305
- Service I: Labor 4h, Travel 2h, Parts $250

**250 kW Unit (155-250 range) × 1**
- Service A: Labor 2h, Travel 1.5h
- Service B: Labor 2h, Travel 2h, Oil 8 gal, Filter $229.20
- Service D: Labor 0.5h, Analysis $305
- Service I: Labor 3h, Travel 2h, Parts $200

---

## SCENARIO 4: Service F - Diesel Tune-Up
**CONFIDENCE: 7/10** - Cylinder count must be specified

### Input
```javascript
{
  kw: 400,
  services: ["F"],
  additionalData: {
    cylinders: 8,
    injectorType: "unit"
  }
}
```

### Expected (8-cyl unit injector)
- Labor: 4 hours × $191 = $764
- Travel: 2 hours × $191 = $382
- Parts: $650 × 1.2 × 1.05 = $819
- Total: $1,965 + tax

---

## SCENARIO 5: Missing Service K
**CONFIDENCE: 0/10** - Cannot calculate

### Input
```javascript
{
  services: ["K"],
  kw: 100
}
```

### Expected
**ERROR**: Service K has no backend implementation
**REQUIRES**: Implementation of battery replacement logic

---

## VALIDATION TEST CASES

### Edge Case 1: Minimum kW
```javascript
{ kw: 10 } // Should map to '2-14' range
```

### Edge Case 2: Maximum kW
```javascript
{ kw: 5000 } // Should map to '1500-2050' range
```

### Edge Case 3: Invalid ZIP
```javascript
{ zip: "9999" } // Should fail validation (not 5 digits)
```

### Edge Case 4: No Services
```javascript
{ services: [] } // Should fail validation (min 1 required)
```

### Edge Case 5: Contract Length Boundary
```javascript
{ contractLength: 61 } // Should fail (max 60)
```

---

## CRITICAL VERIFICATION POINTS

### MUST TEST LIVE
1. Tax rate API response for each ZIP
2. PDF generation memory usage
3. Zoho OAuth token refresh
4. Multi-generator price accumulation

### CANNOT VERIFY FROM CODE
1. Service K pricing formula
2. CUSTOM service calculation
3. Prevailing wage multiplier application
4. CPI adjustment over multi-year contracts

### REQUIRES EXCEL COMPARISON
1. All Service B oil quantities
2. Load bank rental prices by kW
3. Mobilization stacking percentages
4. Travel hour calculations

---

## NOTES

- All prices shown are PRE-TAX unless specified
- California tax rates vary by location (7.25% - 10.75%)
- Mobilization stacking provides significant savings
- Travel time is billable at standard labor rate
- All fluid quantities must be in GALLONS
