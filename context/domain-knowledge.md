# ENERGEN DOMAIN KNOWLEDGE
## Extracted from v5.0 Code Implementation

---

## COMPANY CONTEXT (from package.json and server files)

**Company**: Energen Systems Inc.
**Product**: Emergency Generator Service Calculator v5.0
**Purpose**: Calculate service contract pricing for emergency power systems
**Architecture**: Modular field service calculator with Excel parity

---

## SERVICE DEFINITIONS (complete-calculation-engine.cjs Lines 30-42)

### Core Services (VERIFIED IN CODE)
- **A - Comprehensive Inspection**: Quarterly preventive maintenance
- **B - Oil & Filter Service**: Annual oil change with filters
- **C - Coolant Service**: Annual/Biannual coolant service
- **D - Oil, Fuel & Coolant Analysis**: Annual fluid analysis
- **E - Load Bank Testing**: Annual load testing
- **F - Engine Tune-Up (Diesel)**: Based on cylinder count
- **G - Gas Engine Tune-Up**: Natural gas/propane generators
- **H - Generator Electrical Testing**: Every 5 years
- **I - Transfer Switch Service**: Annual switch maintenance
- **J - Thermal Imaging Scan**: Annual infrared inspection

### UI-Only Services (integrated-ui.html Line 2086-2087)
- **K - Battery Replacement**: CONFIDENCE 3/10 - No backend logic found
- **CUSTOM - Custom Service/Parts**: CONFIDENCE 3/10 - No backend logic found

---

## PRICING STRUCTURE

### Base Labor Rates (Lines 12-16)
```
Standard Rate: $191/hour
Non-Contract Rate: $200/hour
Overtime Rate: $255.50/hour
Double Time Rate: $400/hour
```

### Material Costs (Lines 18-20)
```
Oil: $16/gallon (sells at $24 with 50% markup)
Coolant: $15/gallon (sells at $22.50 with 50% markup)
Mileage: $2.50/mile
```

### Markup Structure (Lines 22-26)
```
Parts: 20% markup (1.2x)
Oil: 50% markup (1.5x)
Coolant: 50% markup (1.5x)
Freight: 5% additional (1.05x)
```

---

## KW RANGE TIERS (Lines 64-76)

Generators are categorized into pricing tiers:
1. **2-14 kW**: Residential/small commercial
2. **15-30 kW**: Small commercial
3. **35-150 kW**: Medium commercial
4. **155-250 kW**: Large commercial
5. **255-400 kW**: Industrial small
6. **405-500 kW**: Industrial medium
7. **505-670 kW**: Industrial large
8. **675-1050 kW**: Data center/hospital
9. **1055-1500 kW**: Major facility
10. **1500-2050 kW**: Campus/complex

Each tier has specific labor hours, parts costs, and fluid quantities.

---

## MOBILIZATION STACKING (Lines 46-61)

### Concept
When multiple services are performed together, mobilization costs are "stacked" with discounts.

### Implementation
```
Base Mobilization: $150/hour
Stacking Discount: 35% for combined services
Minimum Hours: 1
```

### Service Mobilization Hours
- A (Inspection): 0.5 hours
- B (Oil Service): 1.0 hours
- C (Coolant): 1.0 hours
- D (Analysis): 0.5 hours
- E (Load Bank): 2.0 hours
- F (Diesel Tune): 1.5 hours
- G (Gas Tune): 1.5 hours
- H (Electrical): 1.0 hours
- I (Transfer): 1.0 hours
- J (Thermal): 0.5 hours

---

## FLUID SPECIFICATIONS

### Oil Quantities (Service B - VERIFIED GALLONS)
All oil quantities have been converted to gallons:
- Small generators (2-30 kW): 1.5-3 gallons
- Medium generators (35-250 kW): 5-8 gallons
- Large generators (255-500 kW): 12-18 gallons
- Industrial (505-1050 kW): 30-50 gallons
- Major facilities (1055+ kW): 100-150 gallons

### Coolant Quantities (Service C)
Already stored in gallons in the system.

---

## CALCULATION METHODOLOGY

### Total Quote Calculation
```
1. Base Labor = Hours × Labor Rate
2. Parts Cost = Base Cost × Parts Markup × Freight Markup
3. Fluids Cost = Gallons × Price × Fluid Markup
4. Mobilization = Hours × Rate × Stacking Discount
5. Subtotal = Labor + Parts + Fluids + Mobilization
6. Tax = Subtotal × Tax Rate
7. Total = Subtotal + Tax
```

### Multi-Generator Handling
- Each generator calculated independently
- Results accumulated per service type
- Mobilization stacking applied across all units

---

## COMPLIANCE STANDARDS

### Referenced Standards (from documentation)
- **NFPA 110**: Emergency and Standby Power Systems
- **NFPA 99**: Healthcare facilities
- **CARB**: California Air Resources Board
- **BAAQMD**: Bay Area Air Quality Management District
- **FDA 21 CFR Part 11**: Pharmaceutical compliance

### Facility Types (implied from code)
- Data Centers: Monthly testing required
- Healthcare: Weekly visual inspection
- Pharmaceutical: Documentation requirements
- Government: Prevailing wage may apply

---

## INTEGRATIONS

### California Tax (CDTFA)
- Real-time tax rate lookup by ZIP code
- Fallback rate: 10.25%
- API: services.maps.cdtfa.ca.gov

### Google Services (Single API Key)
- Distance calculation for mileage
- Address validation
- Business enrichment

### Zoho CRM
- Customer data synchronization
- Quote generation
- Lead management
- OAuth2 authentication required

### PDF Generation
- Professional 8-component PDFs
- Digital signatures
- Terms and conditions
- Quote validity tracking

---

## SPECIAL CALCULATIONS

### CPI Adjustments
- Default: 3.0% annual
- Can fetch real-time from FRED API
- Metro-specific rates available

### Prevailing Wage
- Government facilities may require
- Multiplier applied to base labor rate
- Location-specific via ZIP code

---

## UNVERIFIED FEATURES

### Service K - Battery Replacement
- UI exists but no calculation logic found
- REQUIRES INVESTIGATION

### CUSTOM Service
- UI exists but no pricing logic found
- REQUIRES INVESTIGATION

### Advanced Features
- Multi-year contracts with escalation
- Bundled service discounts
- Emergency response pricing
- After-hours multipliers

---

## CRITICAL BUSINESS RULES

1. **Never** quote below $500/month total
2. **Always** include mobilization costs
3. **Always** apply freight markup to parts
4. **Never** modify Excel-verified formulas
5. **Always** use gallons for fluids (not quarts)
6. **Always** verify tax rate for California addresses
