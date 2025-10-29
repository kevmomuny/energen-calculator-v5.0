---
name: energen-rfp-evaluator
description: Mission-critical RFP evaluation with 100% detail capture for legally binding bid submittals
version: 2.0.0
author: Energen Development Team
tags: [rfp, bid, proposal, legal-compliance, anti-hallucination, evidence-based]
---

# Energen RFP Evaluator v2.0 - MISSION-CRITICAL EDITION

## ⚠️ CRITICAL UNDERSTANDING

**THIS IS NOT A CONVENIENCE TOOL - THIS IS A COMPANY SURVIVAL TOOL**

> "if i miss a single detail, i could kill the whole company." - User

**Legal Reality:**
- Bid submittals are **legally binding contracts**
- Missing ANY requirement = breach of contract = bankruptcy risk
- Government RFPs use **designed obfuscation** as a tactic
- Competitors look for ways to protest awards on technicalities
- One missed detail can cost millions or destroy company reputation

**Design Intent:**
> "we specifically wanted to create a universal skill that could take non-standard documents that had descriptions of needed work that didn't necessarily match our definitions inhouse. data extraction was to use ai to extract details in a way we could bid with confidence that we didn't miss ANY details."

**Success Metric:** 100% detail capture, not 95%, not 99%, but **100%**

---

## ANTI-HALLUCINATION PROTOCOLS

### Rule #1: Evidence-Based Extraction Only
- **NEVER infer** service frequencies from task lists
- **ONLY extract** explicitly stated frequencies
- **ALWAYS cite** page numbers and exact quotes
- **ALWAYS validate** quotes exist in source document

### Rule #2: Comprehensive PM Visit Recognition
Government RFPs describe **ONE annual visit with multiple tasks**, NOT separate quarterly visits.

**RED FLAGS for Hallucination:**
- "Quarterly" frequency when document says "annual PM"
- Separate visits for each task in a checklist
- Services invented from keywords (e.g., "NFPA 110" → quarterly inspections)
- Total visits/year > 6 for generator PM (typical is 1-3)

**PM Visit Structure Pattern (Government):**
```
Section 4: Annual Preventive Maintenance
  a. Before Starting Engine (15-point checklist)
  b. During Operation (10 tasks)
  c. After Shutdown (8 tasks)
  d. Reporting Requirements
```

**THIS IS ONE VISIT**, not 33 separate visits!

### Rule #3: Complete Document Scanning
- Read **ENTIRE SOW** before mapping services
- Check **ALL sections** for requirements:
  - Section 1-3: Overview, scope, definitions
  - Section 4: PM procedures (main tasks)
  - Section 5: Emergency services
  - Section 6: **Testing/Analysis** (often separate from PM)
  - Section 7: Reporting/Documentation
  - Section 8: Personnel requirements
  - Section 9: Training/Certifications
  - Appendices: Equipment lists, forms, special requirements

**Case Study - LBNL ANR-6-2025:**
- Section 4c: Oil sample collection (part of PM visit)
- Section 6: "Fuel, Oil and Coolant Sampling" (SEPARATE requirement for analysis)
- **AI Error:** Stopped reading at Section 4, missed Section 6 entirely

### Rule #4: Overhead Cost Detection
Government RFPs bury time-consuming requirements across multiple sections:

**Personnel Section:**
- Training requirements (NFPA 70E, QEW2, site-specific)
- Cost absorption language: "training to be absorbed by Subcontractor"

**Safety Section:**
- LOTO procedures (+20-30 min per visit)
- Photo documentation (before/after, 2x per visit)
- Safety briefings with site personnel

**Reporting Section:**
- CMMS/Maximo data entry (+15-30 min per visit)
- Work order closeout procedures
- Detailed reporting requirements

**Site Access Section:**
- Security check-in procedures (+10-15 min)
- Badging/escort requirements
- DOE/Government facility protocols

**Impact:** These add 30-50% to base labor hours and are MANDATORY

---

## CORRECTED SERVICE DEFINITIONS

### Service A - Comprehensive Inspection Checklist
**CRITICAL CORRECTION:** Service A is **NOT hardcoded as quarterly**

**What Service A Really Is:**
- Visual inspection of generator and components
- Gauge readings and system checks
- Battery testing and connections
- Wiring/mounting inspections
- Fluid level checks (NOT fluid changes)
- NFPA 110 compliance verification

**Keywords:** inspection, check, visual, comprehensive, before starting, gauges, battery test, wiring, mounting, NFPA 110, preventive inspection

**Frequency:** VARIES BY RFP (annual, semi-annual, quarterly, or as part of PM visit)

**Excludes:** Oil changes, filter changes, coolant flush, load testing

**Recognition Pattern:**
```
RFP Language: "Before starting engine, inspect the following:"
  - Visual inspection of generator
  - Check gauges and meters
  - Test battery voltage
  - Inspect wiring and connections
  - Check fluid levels

THIS IS SERVICE A as part of comprehensive PM visit
```

---

### Service B - Oil & Filter Service
**What It Is:**
- Drain crankcase oil
- Replace with new oil (manufacturer spec)
- Remove and replace oil filters
- Remove and replace fuel filters
- Oil sample collection (for Service D)

**Keywords:** oil change, oil service, drain oil, replace oil, oil filter, fuel filter, lubrication service, crankcase

**Frequency:** Typically annual (some diesel generators need semi-annual)

**Includes:** Oil sampling collection (physical act of taking sample)

**Does NOT Include:** Laboratory analysis of sample (that's Service D)

---

### Service C - Coolant Service
**What It Is:**
- Check coolant condition with test strip/kit
- Flush and replace coolant if needed
- Inspect hoses for cracks/wear
- Inspect belts for wear/tension
- Replace hoses and belts per schedule

**Keywords:** coolant, antifreeze, radiator, cooling system, hoses, belts, coolant flush, coolant replacement

**Frequency:** Annual inspection, replacement every 2-3 years (or per RFP)

---

### Service D - Oil, Fuel & Coolant Analysis
**CRITICAL DISTINCTION:** Service D is SEPARATE from sample collection

**What It Is:**
- **Laboratory testing** of fluid samples
- Oil analysis for wear metals, contamination, viscosity
- Fuel analysis for contamination, water, bacteria
- Coolant analysis for pH, freeze protection, corrosion inhibitors
- Detailed written report with recommendations

**Keywords:** analysis, testing, laboratory, lab, sample testing, fluid analysis, diagnostic testing, oil analysis, fuel analysis, coolant analysis

**Frequency:** Typically matches Service B frequency (annual or semi-annual)

**Recognition Pattern:**
```
RFP Section 4c: "Take oil sample for analysis"
  → This is COLLECTION (part of Service B)

RFP Section 6: "Fuel, Oil and Coolant Sampling"
  "Contractor shall provide analysis results with recommendations"
  → This is ANALYSIS (Service D - separate requirement)
```

**Case Study - LBNL Error:**
- AI saw "Take oil sample" in Section 4c
- AI correctly mapped sample collection to Service B
- AI **FAILED** to read Section 6
- AI **MISSED** Service D requirement entirely
- **Cost Impact:** Underbid by ~$2,000-3,000

---

### Service E - Load Bank Testing
**What It Is:**
- Connect resistive load bank to generator
- Exercise at 100% rated load (or per RFP spec)
- Duration: typically 2 hours minimum
- Monitor all systems under load
- Document performance

**Keywords:** load bank, load test, full load, 100% load, rated load, resistive load, performance test, capacity test, load testing

**Frequency:** Annual (NFPA 110 requires annual at minimum)

**Time Requirements:**
- Setup/breakdown: 1-2 hours
- Test duration: 2 hours (minimum)
- Reporting: 0.5 hours
- **Total:** 4-6 hours per generator

---

### Service F - Engine Tune-Up (Diesel)
**Keywords:** diesel tune, tune-up, injector service, valve adjustment, diesel engine tune

**Frequency:** Varies (annual, every 2 years, or per maintenance schedule)

---

### Service G - Gas Engine Tune-Up
**Keywords:** gas tune, spark plug, ignition, natural gas, propane, gas engine tune-up

**Frequency:** Varies (annual or per maintenance schedule)

---

### Service H - Generator Electrical Testing
**Keywords:** electrical test, insulation, resistance, exciter, AVR, megger, winding test

**Frequency:** Every 5 years (or per RFP)

---

### Service I - Transfer Switch Service
**Keywords:** transfer switch, ATS, automatic transfer, switch testing, transfer test

**Frequency:** Annual (often specified as "ADD ALT" - optional service)

---

### Service J - Thermal Imaging Scan
**Keywords:** thermal, infrared, IR scan, thermography, thermal imaging

**Frequency:** Annual or periodic

---

### Service K - Custom/Special Services
**Use Cases:**
- DPF regeneration (diesel particulate filter)
- Emissions testing
- Specialized repairs
- Emergency response services
- Non-standard work

**Recognition Patterns:**
- "DPF regeneration shall be completed annually for (10) systems"
- "ADD ALT" pricing for optional work
- "As-directed" services
- "Emergency call-out" requirements

---

## COMPREHENSIVE PM VISIT RECOGNITION RULES

### Pattern #1: Checklist Structure = ONE Visit
```
Annual PM includes:
  Before Starting:
    - Inspect battery
    - Check fluid levels
    - Visual inspection
  During Operation:
    - Load bank test
    - Monitor gauges
  After Shutdown:
    - Oil and filter change
    - Coolant service
    - Take samples
```

**AI Instruction:**
This describes **ONE annual visit** with multiple tasks.
DO NOT create separate Service A (inspection), Service B (oil), Service C (coolant), Service E (load bank) visits.

**Correct Mapping:**
- Services: A, B, C, E (all included in ONE comprehensive visit)
- Frequency: 1x per year per generator
- Total visits: 1 per generator annually

---

### Pattern #2: Frequency Language Validation
**Explicit Frequencies (Extract these):**
- "annual PM services" → 1x per year
- "quarterly inspections" → 4x per year
- "semi-annual oil changes" → 2x per year
- "every six months" → 2x per year
- "bi-weekly checks" → 26x per year

**Implicit/Ambiguous (Flag for review):**
- "preventive maintenance per NFPA 110" → COULD be quarterly, need human review
- "routine maintenance" → frequency not specified
- "regular service intervals" → frequency not specified

**NEVER Hallucinate:**
- ❌ "NFPA 110 mentioned" → "quarterly inspections" (WRONG)
- ❌ Task checklist → each task = separate visit (WRONG)
- ❌ Multiple services described → infer quarterly (WRONG)

---

### Pattern #3: Section 6 Trap
Many government RFPs have a **separate section** for testing/analysis:

```
Section 4: Preventive Maintenance Procedures
  4a. Before Starting Engine
  4b. During Operation (includes "take oil sample")
  4c. After Shutdown

Section 6: Sampling and Analysis Requirements  ← AI MISSES THIS
  "Contractor shall provide oil, fuel, and coolant analysis with recommendations"
```

**AI Instruction:**
- Read ENTIRE SOW before declaring services complete
- Section 4 = physical PM tasks
- Section 6 = lab analysis requirements (Service D)
- Both are SEPARATE and REQUIRED

---

## OVERHEAD COST MULTIPLIER DETECTION

### Training Requirements (Personnel Section)
**Recognition Patterns:**
- "Technicians shall complete NFPA 70E training"
- "QEW2 (Qualified Electrical Worker) certification required"
- "Site-specific EHS training required before work begins"
- "Cost for training to be absorbed by Subcontractor"

**Impact Calculation:**
- NFPA 70E: $500-800 per tech (8-hour course)
- QEW2: $1,200-1,500 per tech (2-day course)
- Site-specific: 4-8 hours per tech
- **Absorption Cost:** $2,000-3,000 per tech (one-time or annual renewal)
- **Bid Impact:** Include as overhead or one-time fee

---

### LOTO Procedures (Safety Section)
**Recognition Patterns:**
- "Lockout/Tagout procedures per [standard]"
- "Technicians shall follow Pub 3000, Ch 18 LOTO Program"
- "All work on energized equipment requires LOTO"

**Time Impact:**
- LOTO setup: 15-20 minutes per generator
- Documentation: 5-10 minutes
- **Total:** 20-30 minutes added to EVERY service visit

**Calculation:** Base 4-hour PM → 4.5 hours actual

---

### CMMS Data Entry (Reporting Section)
**Recognition Patterns:**
- "Contractor shall enter work orders in Maximo system"
- "All work must be documented in CMMS"
- "Detailed service reports required in customer system"
- "Photos uploaded to work tracking tablet"

**Time Impact:**
- System login and navigation: 5 minutes
- Work order data entry: 10-15 minutes
- Photo upload and annotation: 5-10 minutes
- **Total:** 20-30 minutes per visit

**Calculation:** Add 0.5 hours to every service visit labor

---

### Security Check-In (Site Access Section)
**Recognition Patterns:**
- "DOE facility - security clearance required"
- "Technicians shall check in at Security Office"
- "Badging and escort required for all contractors"
- "Background checks required (cost to contractor)"

**Time Impact:**
- Check-in process: 10-15 minutes per visit
- Background check processing: $100-200 per tech
- Badge issuance: 30 minutes (first visit only)

**Calculation:** Add 0.25 hours to first visit, 0.2 hours to subsequent visits

---

### Government Oversight (Safety/Compliance Section)
**Recognition Patterns:**
- "Work shall be supervised by LBNL staff"
- "Pre-job briefing required with facility personnel"
- "Contractor shall coordinate with [facility] prior to work"
- "Stringent safety requirements" or "enhanced safety protocols"

**Time Impact:**
- Pre-job briefing: 15-20 minutes
- Facility coordination: 10-15 minutes per visit
- Documentation review: 10 minutes
- **Overhead Multiplier:** 20-30% added to ALL labor

**Calculation:** Base 4 hours → 4.8-5.2 hours actual

---

## SPECIAL SERVICES DETECTION

### DPF Regeneration
**Recognition Pattern:**
```
"Diesel Particulate Filter (DPF) regeneration shall be completed annually for (10) systems"
```

**Service Mapping:** Service K (Custom)

**Specifications:**
- 2-hour regeneration test
- Monitor exhaust temperature
- Verify soot burn-off
- May require filter replacement (expensive)

**Labor:** 3-4 hours per system
**Parts:** $0 (regen only) or $2,000-5,000 (filter replacement)

**Calculation:**
- 10 systems × 3.5 hours = 35 hours
- Potential parts: 10 × $3,000 = $30,000 (if filters needed)

---

### ATS Transfer Testing (ADD ALT)
**Recognition Pattern:**
```
"ADD ALT: Automatic Transfer Switch testing"
"Optional: ATS service and testing"
```

**Service Mapping:** Service I (Transfer Switch Service)

**Specifications:**
- Test automatic transfer from utility to generator
- Test transfer back to utility
- Timing verification
- Contact inspection and cleaning

**Labor:** 2-3 hours per ATS
**Frequency:** Annual (if customer opts in)

**Bid Strategy:** Price separately as "ADD ALT" line item

---

## EVIDENCE-BASED EXTRACTION PROTOCOL

### Mandatory Evidence for Every Service
```json
{
  "service": "B - Oil & Filter Service",
  "frequency": 1,
  "frequencyQuote": "annual PM services",
  "sourcePage": "SOW Page 1, Section 4",
  "sourceSection": "4c - After Shutdown",
  "rfpText": "Drain crankcase oil and replace with new oil. Remove and replace oil and fuel filters. Take oil sample for analysis.",
  "keywords": ["drain crankcase", "replace oil", "oil filter", "fuel filter"],
  "confidence": 0.95,
  "isComprehensiveVisit": true,
  "visitStructure": "Part of annual PM visit (Before/During/After)"
}
```

### Validation Checks (AI Must Perform)
1. **Frequency Quote Validation:**
   - Search for `frequencyQuote` in full RFP text
   - If NOT FOUND → Flag as CRITICAL hallucination
   - Example: "quarterly oil changes" not in document → ERROR

2. **Source Page Validation:**
   - Verify page number exists
   - Verify section reference is valid
   - Cite exact location for human review

3. **Sanity Checks:**
   - Total visits/year > 6 → CRITICAL WARNING
   - Cost per generator > $15,000 → CRITICAL WARNING
   - Services include A+B+C+D+E all quarterly → CRITICAL WARNING

4. **Comprehensive Visit Detection:**
   - RFP uses "Before/During/After" structure → ONE visit
   - Task checklist with 10+ items → ONE visit (not 10 visits)
   - Services described together in one section → ONE visit

---

## CALCULATOR API INTEGRATION (CORRECTED)

### API Endpoint
```
POST http://localhost:3002/api/calculate
```

### Correct Payload Structure
```json
{
  "customerType": "government",
  "taxExempt": true,
  "prevailingWage": true,
  "county": "Alameda",
  "distance": 49,
  "generators": [
    {
      "name": "Generator 101-A",
      "kw": 250,
      "fuelType": "Diesel",
      "cylinders": 6,
      "services": {
        "A": 1,
        "B": 1,
        "C": 1,
        "D": 1,
        "E": 1
      }
    }
  ]
}
```

**CRITICAL:** Services object uses frequencies as values, NOT boolean flags

### Overhead Adjustments (Post-API)
After receiving API response, adjust for overhead:

```javascript
const baseLabor = apiResponse.calculation.generators[0].labor;

// Add LOTO time
const lotoHours = 0.5; // 30 min per visit
const totalVisits = Object.values(services).reduce((a,b) => a+b, 0);
const lotoAddition = lotoHours * totalVisits * laborRate;

// Add CMMS time
const cmmsHours = 0.5; // 30 min per visit
const cmmsAddition = cmmsHours * totalVisits * laborRate;

// Add oversight multiplier
const oversightMultiplier = 1.25; // 25% increase

const adjustedLabor = (baseLabor + lotoAddition + cmmsAddition) * oversightMultiplier;
```

---

## RISK ASSESSMENT (ENHANCED)

### Legal Compliance Risk (NEW)
**Score 1-10:**
- **10 (Critical):** Prevailing wage + multiple certifications + DOE facility
- **7-9 (High):** Prevailing wage or specialized licenses required
- **4-6 (Medium):** Standard commercial requirements with some specialization
- **1-3 (Low):** No special requirements

**Red Flags:**
- "Prevailing wage" anywhere in document
- "DIR registration required"
- "Certified payroll"
- "Public works"
- DOE/Federal facility
- Multiple required certifications

---

## TESTING PROTOCOL (ANTI-HALLUCINATION)

### Test with Known RFP (LBNL ANR-6-2025)
**Ground Truth (from actual RFP reading):**
- Services: A, B, C, D, E (all 1x annual)
- DPF regeneration: 10 systems
- Training: NFPA 70E, QEW2, LBNL EHS
- Overhead: LOTO, CMMS, Security, Oversight
- Total visits per generator: 1 annual PM visit
- Analysis: Separate requirement in Section 6

**AI Extraction Must Produce:**
```json
{
  "services": {
    "A": {"frequency": 1, "source": "Section 4a checklist"},
    "B": {"frequency": 1, "source": "Section 4c oil change"},
    "C": {"frequency": 1, "source": "Section 4c coolant"},
    "D": {"frequency": 1, "source": "Section 6 analysis"},
    "E": {"frequency": 1, "source": "Section 4b load bank"}
  },
  "specialServices": {
    "DPF": {"systems": 10, "source": "Section 4b"}
  },
  "overhead": {
    "training": {
      "required": ["NFPA 70E", "QEW2", "LBNL EHS"],
      "cost": "absorbed by subcontractor"
    },
    "loto": {"timeAdder": 0.5, "source": "Pub 3000 Ch 18"},
    "cmms": {"timeAdder": 0.5, "source": "Maximo system"},
    "security": {"timeAdder": 0.25, "source": "DOE facility"},
    "oversight": {"multiplier": 1.25, "source": "LBNL supervision"}
  },
  "totalVisitsPerGenerator": 1,
  "estimatedCostPerGenerator": 13500
}
```

### Validation Tests
1. **Hallucination Detection:** Run extraction, search for all `frequencyQuote` values in RFP text
2. **Completeness Check:** Verify Section 6 was read (look for "sampling" or "analysis")
3. **Sanity Check:** Total visits ≤ 6, cost ≤ $15K per generator
4. **Evidence Check:** Every service has page number and exact quote

---

## SUCCESS METRICS

### 100% Detail Capture
- ✅ All services from ALL sections identified
- ✅ All overhead requirements detected
- ✅ All special services recognized
- ✅ All training costs identified
- ✅ All time adders calculated

### Zero Hallucinations
- ✅ All frequencies validated against source text
- ✅ No invented "quarterly" services
- ✅ No task checklists misinterpreted as separate visits

### Complete Evidence Trail
- ✅ Page numbers for every requirement
- ✅ Exact quotes from RFP
- ✅ Confidence scores on all mappings
- ✅ Sanity check warnings displayed

### Accurate Pricing
- ✅ Within 10% of manual calculation
- ✅ All overhead costs included
- ✅ No missing requirements
- ✅ Conservative estimates (better to overbid than underbid)

---

## WHEN IN DOUBT

### Default Behaviors for Uncertainty
1. **Frequency unclear?** → Flag for manual review, provide evidence for both interpretations
2. **Service mapping ambiguous?** → Provide top 3 matches with confidence scores
3. **Overhead requirement unclear?** → Include conservative estimate with note
4. **Special service mentioned?** → Flag as "Custom Service K" for pricing review

### Fail-Safe Principle
**"Better to flag 10 false positives than miss 1 true requirement"**

Missing a requirement = legal liability
Flagging unnecessary review = 5 minutes of human time

Always err on the side of caution.

---

## CHANGELOG FROM v1.0

### Critical Fixes
1. **Service A Definition:** Removed hardcoded "quarterly" frequency
2. **PM Visit Recognition:** Added Before/During/After pattern detection
3. **Complete Document Scanning:** Enforced reading ALL sections
4. **Service D Distinction:** Separated sample collection from lab analysis
5. **Overhead Detection:** Added LOTO, CMMS, security, training, oversight
6. **Special Services:** Added DPF, ATS, emergency services detection
7. **Evidence Requirements:** Mandatory source citations and validation
8. **Sanity Checks:** Automated warnings for unreasonable values

### New Sections
- Anti-Hallucination Protocols
- Comprehensive PM Visit Recognition Rules
- Overhead Cost Multiplier Detection
- Special Services Detection
- Evidence-Based Extraction Protocol
- Legal Compliance Risk Assessment

### Test Results
- **v1.0 LBNL Test:** $769K (34% overbid) - hallucinated quarterly services
- **v1.5 LBNL Test:** $503K (underbid) - missed Service A, D, overhead
- **v2.0 Target:** $550-600K (accurate) - all services + overhead

---

## MISSION STATEMENT

This tool exists to protect the company from catastrophic bidding errors that could result in:
- Breach of contract
- Financial losses
- Reputation damage
- Business closure

Every extraction must be treated as if the company's survival depends on it.

Because it does.
