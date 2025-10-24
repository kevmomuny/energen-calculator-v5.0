---
name: energen-rfp-evaluator
description: Comprehensive RFP evaluation and bid package generation for generator maintenance services
version: 1.0.0
author: Energen Development Team
tags: [rfp, bid, proposal, evaluation, risk-assessment, decision-support]
---

# Energen RFP Evaluator Skill

Comprehensive RFP evaluation system that extracts data, assesses risks, maps services, and generates complete bid packages with executive summaries and decision support.

## What This Skill Does

Processes complex RFP documents to generate:
- **Complete Data Extraction** - All pertinent information from RFP documents
- **Risk Assessment** - Multi-dimensional scoring (financial, operational, compliance, competitive, technical)
- **Service Mapping** - Automatic mapping to Energen A-K service categories
- **Equipment Analysis** - Generator asset identification and parsing
- **Executive Summary** - One-page "at-a-glance" report with decision matrix
- **Compliance Checklist** - Complete submission requirements tracking
- **Bid Package** - Production-ready documentation

## Usage

```bash
# Evaluate a complete RFP
node .claude/skills/energen-rfp-evaluator/scripts/evaluate-rfp.cjs <rfp-directory>

# Analyze equipment list only
node .claude/skills/energen-rfp-evaluator/scripts/analyze-equipment.cjs <excel-file>

# Assess risks from existing extraction
node .claude/skills/energen-rfp-evaluator/scripts/assess-risks.cjs <extraction-json>

# Generate executive summary
node .claude/skills/energen-rfp-evaluator/scripts/generate-executive-summary.cjs <full-evaluation-json>

# Map services to Energen categories
node .claude/skills/energen-rfp-evaluator/scripts/map-services-to-energen.cjs <extraction-json>

# Create compliance checklist
node .claude/skills/energen-rfp-evaluator/scripts/create-compliance-checklist.cjs <extraction-json>
```

## RFP Directory Structure

**RFP Storage Location:** `C:\RFP-\`

All incoming RFP packages should be stored in separate folders under `C:\RFP-\`:

```
C:\RFP-\
  ├── ANR-6-2025/
  │   ├── 1-RFP-Document.pdf
  │   ├── 2-Sample-Contract.pdf
  │   ├── 3-SOW.pdf
  │   ├── 4-Equipment-List.xlsx
  │   └── ...
  ├── Sacramento-County-2025/
  │   ├── RFP-Main.pdf
  │   ├── Equipment.xlsx
  │   └── ...
  └── [Next RFP]/
      └── ...
```

Expected RFP package structure:
```
[RFP-Name]/
  ├── 1-RFP-Document.pdf          (Main RFP)
  ├── 2-Sample-Contract.pdf       (Contract template)
  ├── 3-SOW.pdf                   (Scope of Work)
  ├── 4-Equipment-List.xlsx       (Generator inventory)
  ├── 5-Pricing-Form.xlsx         (Pricing template)
  ├── 6-Forms/                    (Required forms)
  └── ...
```

## Output Files

For RFP ID `ANR-6-2025`, generates:

1. **`ANR-6-2025_full-evaluation.json`** - Complete structured evaluation
2. **`ANR-6-2025_executive-summary.md`** - One-page decision report
3. **`ANR-6-2025_compliance-checklist.md`** - Submission requirements
4. **`ANR-6-2025_risk-assessment.json`** - Detailed risk analysis
5. **`ANR-6-2025_service-mapping.json`** - RFP → Energen service map
6. **`ANR-6-2025_equipment-list.json`** - Parsed generator assets

## Comprehensive Data Extraction

### Uses Existing AIExtractionEngine
Leverages `modules/rfp-processor/AIExtractionEngine.cjs` (Claude 3.7 Sonnet):
- Contact information extraction
- Schedule and critical dates
- Services requested with frequencies
- Stipulations (prevailing wage, bonds, insurance)
- Payment terms and retainage
- Required documents identification
- Confidence scoring (0-1) for all fields

### Extended Extraction Capabilities
1. **Equipment List Parsing** - Excel/CSV/PDF tables
2. **Visual Data** - Charts, maps, diagrams, site layouts
3. **Implicit Requirements** - Reading between the lines
4. **Cross-Reference Validation** - Verifying data across multiple documents

## Intelligent Risk Assessment

### Risk Dimensions (1-10 scale each)

#### 1. Financial Risk
- Bond requirements (bid, performance, payment)
- Retainage percentage
- Payment terms (Net 30/45/60)
- Estimated contract value vs. capacity
- Cash flow impact

**Scoring:**
- 1-3: Low risk (standard terms, no bonds)
- 4-6: Medium risk (bonds <10%, Net 30)
- 7-10: High risk (bonds >10%, retainage >10%, Net 60+)

#### 2. Operational Risk
- Resource availability (technicians, equipment)
- Timeline feasibility (start date, duration)
- Travel distance (miles from base)
- Generator count vs. capacity
- Seasonal challenges

**Scoring:**
- 1-3: Low risk (<50 miles, <20 generators, ample time)
- 4-6: Medium risk (50-150 miles, 20-40 generators)
- 7-10: High risk (>150 miles, >40 generators, tight timeline)

#### 3. Compliance Risk
- Prevailing wage requirements
- License/certification needs
- Insurance coverage adequacy
- Environmental regulations
- Safety requirements

**Scoring:**
- 1-3: Low risk (standard commercial requirements)
- 4-6: Medium risk (some specialized certifications)
- 7-10: High risk (prevailing wage, specialized permits)

#### 4. Competitive Risk
- Evaluation criteria weights
- Incumbent advantage indicators
- Number of expected bidders
- Price vs. quality emphasis
- Past relationship with customer

**Scoring:**
- 1-3: Low risk (quality-focused, known customer)
- 4-6: Medium risk (balanced evaluation)
- 7-10: High risk (lowest price wins, unknown customer)

#### 5. Technical Risk
- Specialized equipment needs
- Unique generator models
- Custom service requirements
- Training/expertise gaps
- Parts availability concerns

**Scoring:**
- 1-3: Low risk (standard generators, routine services)
- 4-6: Medium risk (some specialized models)
- 7-10: High risk (exotic equipment, custom work)

### Overall Risk Score
Weighted average with automated recommendations:
- **0-3.0**: GREEN - Proceed with standard process
- **3.1-5.0**: YELLOW - Proceed with caution, mitigation plan required
- **5.1-7.0**: ORANGE - Executive review required before bidding
- **7.1-10.0**: RED - High risk, consider no-bid unless strategic

## Service Mapping Excellence

### Automatic RFP → Energen Service Mapping

Uses `modules/rfp-processor/ServiceMappingEngine.cjs` with enhancements:

#### Mapping Process
1. **Keyword Analysis** - Comprehensive keyword matching
2. **Frequency Detection** - Quarterly, annual, biannual patterns
3. **Context Scoring** - Understanding service combinations
4. **Confidence Calculation** - 0.0-1.0 for each mapping

#### Energen Service Categories

**Service A** - Comprehensive Inspection (Quarterly)
- Keywords: inspection, comprehensive, routine check, preventive
- Frequency: quarterly, 4x/year, every 3 months

**Service B** - Oil & Filter Service (Annual)
- Keywords: oil change, filter, lubrication, engine oil
- Frequency: annual, yearly, 1x/year

**Service C** - Coolant Service (Annual/Biannual)
- Keywords: coolant, radiator, cooling system, antifreeze
- Frequency: annual, biannual, every 2 years

**Service D** - Oil, Fuel & Coolant Analysis
- Keywords: analysis, testing, lab analysis, sample, diagnostic
- Frequency: annual, semi-annual, quarterly

**Service E** - Load Bank Testing (Annual)
- Keywords: load bank, load test, performance test, capacity test
- Frequency: annual, yearly

**Service F** - Engine Tune-Up Diesel
- Keywords: tune-up, diesel, injector, diesel engine
- Frequency: annual, periodic

**Service G** - Gas Engine Tune-Up
- Keywords: gas tune-up, spark plug, natural gas, ignition
- Frequency: annual, periodic

**Service H** - Generator Electrical Testing (Every 5 Years)
- Keywords: electrical testing, insulation test, megohm, winding
- Frequency: every 5 years, quinquennial

**Service I** - Transfer Switch Service (Annual)
- Keywords: transfer switch, ATS, automatic transfer switch
- Frequency: annual, yearly

**Service J** - Thermal Imaging Scan
- Keywords: thermal imaging, infrared, IR scan, thermography
- Frequency: annual, periodic, as-needed

**Service K** - Custom Service
- Keywords: custom, special, non-standard, other, miscellaneous
- Frequency: as-needed, one-time, variable

#### Mapping Output
```json
{
  "originalService": "Quarterly generator inspection and testing",
  "mappedTo": "ServiceA",
  "mappedName": "Comprehensive Inspection",
  "confidence": 0.95,
  "scores": {
    "keywordMatch": 0.90,
    "aliasMatch": 0.85,
    "frequencyMatch": 1.0,
    "contextMatch": 0.75,
    "total": 0.88
  },
  "alternativeMatches": [
    {"service": "ServiceE", "serviceName": "Load Bank Testing", "confidence": 0.45}
  ],
  "requiresReview": false,
  "reason": "High confidence keyword and frequency match"
}
```

### Labor Hour Estimation
For each mapped service:
1. Look up base hours from service definitions
2. Adjust for kW range
3. Multiply by generator count
4. Factor in travel time
5. Add contingency (10%)

### Pricing Range Calculation
1. Calculate labor hours × labor rate
2. Add estimated parts cost
3. Apply prevailing wage multiplier if required
4. Calculate low/mid/high estimates
5. Include tax if applicable

## Equipment Analysis

### Excel/CSV Parsing
Extracts from equipment lists:
- Building/Asset ID
- Manufacturer (Caterpillar, Cummins, Kohler, etc.)
- Model number
- Serial number
- Engine manufacturer
- Engine model
- Engine serial number
- kW rating
- Voltage
- Location/address

### kW Range Classification
Maps to Energen pricing tiers:
- 2-14 kW
- 15-30 kW
- 35-150 kW
- 151-250 kW
- 251-400 kW
- 401-500 kW
- 501-670 kW
- 671-1050 kW
- 1051-1500 kW
- 1501-2050 kW

### Missing Data Inference
Attempts to determine:
- Fuel type (Diesel/Natural Gas/Propane) from model
- Cylinder count from model specs
- DPF presence from model year and kW
- Approximate location from site names

### Zoho Generator Asset Creation
Generates JSON for direct import:
```json
{
  "name": "Generator 101 - Building A",
  "generatorModel": "C250 D5",
  "kwRating": 250,
  "serialNumber": "ABC123456",
  "customerAccountId": "zoho_account_id",
  "installationAddress": "123 Main St, City, State ZIP",
  "status": "Active",
  "fuelType": "Diesel",
  "cylinders": 6
}
```

## Executive Summary Generation

### One-Page Report Format

```markdown
# RFP EXECUTIVE SUMMARY: [RFP Number]

## QUICK FACTS
**Customer:** [Agency Name]
**Bid Due:** [Date/Time]
**Contract Period:** [Start] to [End]
**Total Generators:** [Count]
**Estimated Value:** $[Low] - $[High]

## RISK ASSESSMENT
**Overall Risk Score:** [X.X/10] - [GREEN/YELLOW/ORANGE/RED]

Financial:     ██████████ [X/10] [Note]
Operational:   ██████████ [X/10] [Note]
Compliance:    ██████████ [X/10] [Note]
Competitive:   ██████████ [X/10] [Note]
Technical:     ██████████ [X/10] [Note]

## SERVICE BREAKDOWN
| Service | Description | Frequency | Generators | Est. Hours | Est. Cost |
|---------|-------------|-----------|------------|------------|-----------|
| A | Inspection | Quarterly | 35 | 140/yr | $28,000 |
| B | Oil & Filter | Annual | 35 | 70 | $14,000 |
| ... | ... | ... | ... | ... | ... |

**Total Annual Value:** $XXX,XXX

## CRITICAL DATES
- [Date]: Mandatory site visit
- [Date]: Questions due
- [Date]: Proposals due
- [Date]: Contract start

## KEY STIPULATIONS
- ⚠️ Prevailing wage REQUIRED (+40% labor cost)
- ✓ Performance bond 10% required
- ✓ Payment terms: Net 30
- ⚠️ Tax exempt (government contract)

## GO/NO-GO RECOMMENDATION

**DECISION: [GO / NO-GO / CONDITIONAL]**

**Rationale:**
- [Positive factor 1]
- [Positive factor 2]
- [Concern 1]
- [Concern 2]

**Estimated Profit Margin:** [X]%
**Strategic Value:** [High/Medium/Low]
**Resource Requirements:** [Detailed]

## NEXT STEPS
1. [Action item 1]
2. [Action item 2]
3. ...
```

### Visual Risk Radar Chart Data
Provides data for graphing (can be rendered separately):
```json
{
  "chartType": "radar",
  "data": {
    "labels": ["Financial", "Operational", "Compliance", "Competitive", "Technical"],
    "values": [4.5, 3.2, 7.8, 5.5, 2.1]
  }
}
```

## Decision Support Matrix

### Go/No-Go Criteria Scoring

| Criterion | Weight | Score (0-10) | Weighted | Status |
|-----------|--------|--------------|----------|--------|
| Profit Margin >15% | 25% | X | X.X | ✓/✗ |
| Resources Available | 20% | X | X.X | ✓/✗ |
| Risk Score <5.0 | 20% | X | X.X | ✓/✗ |
| Strategic Fit | 15% | X | X.X | ✓/✗ |
| Customer Relationship | 10% | X | X.X | ✓/✗ |
| Contract Terms | 10% | X | X.X | ✓/✗ |
| **TOTAL** | **100%** | - | **X.X** | **GO/NO-GO** |

**Decision Thresholds:**
- 8.0-10.0: Strong GO - Pursue aggressively
- 6.0-7.9: GO - Standard pursuit
- 4.0-5.9: CONDITIONAL - Requires mitigation plan
- 0-3.9: NO-GO - Decline to bid

## Compliance Checklist Generation

### Submission Requirements Tracking

```markdown
# COMPLIANCE CHECKLIST: [RFP Number]

## REQUIRED DOCUMENTS
- [ ] Bid Form (Page 19-20) - Due: [Date/Time]
- [ ] Pricing Schedule (Excel) - Due: [Date/Time]
- [ ] Bid Bond (10%) - Due: [Date/Time]
- [ ] Insurance Certificates - Due: [Date/Time]
- [ ] License Copies - Due: [Date/Time]
- [ ] References (3 minimum) - Due: [Date/Time]
- [ ] Rep & Cert Form - Due: [Date/Time]

## CERTIFICATIONS REQUIRED
- [ ] DIR Registration (Prevailing Wage)
- [ ] Contractor License (C-10 Electrical)
- [ ] Business License
- [ ] Tax ID / EIN

## INSURANCE REQUIREMENTS
- [ ] General Liability: $2,000,000
- [ ] Workers Comp: Statutory
- [ ] Auto Liability: $1,000,000
- [ ] Additional Insured: [Agency Name]

## BOND REQUIREMENTS
- [ ] Bid Bond: 10% of bid amount
- [ ] Performance Bond: 100% (if awarded)
- [ ] Payment Bond: 100% (if awarded)

## SPECIAL REQUIREMENTS
- [ ] Prevailing wage compliance plan
- [ ] Safety program documentation
- [ ] Environmental compliance certifications
- [ ] Site-specific insurance riders

## SUBMISSION DETAILS
**Method:** [Email/Physical/Portal]
**Address:** [Full address or URL]
**Deadline:** [Date] at [Time] [Timezone]
**Contact:** [Name, Phone, Email]

## PRE-BID ACTIVITIES
- [ ] Attend mandatory site visit: [Date/Time]
- [ ] Submit questions by: [Date]
- [ ] Review addenda (check daily until bid)
```

## Integration Points

### 1. AIExtractionEngine Integration
```javascript
const { AIExtractionEngine } = require('../../modules/rfp-processor/AIExtractionEngine.cjs');

const engine = new AIExtractionEngine({
  apiKey: process.env.ANTHROPIC_API_KEY,
  enableCaching: true
});

const extracted = await engine.extractFromText(rfpText, {
  fileName: 'RFP-ANR-6-2025.pdf',
  pageCount: 50,
  source: 'California Department of Water Resources'
});
```

### 2. ServiceMappingEngine Integration
```javascript
const { ServiceMappingEngine } = require('../../modules/rfp-processor/ServiceMappingEngine.cjs');

const mapper = new ServiceMappingEngine({
  confidenceThreshold: 0.75,
  debugMode: false
});

const mappings = await mapper.mapServices(extracted.services);
```

### 3. Energen Calculator API Integration
```javascript
// Calculate pricing for each service/generator combination
const response = await fetch('http://localhost:3002/api/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerType: 'government',
    taxExempt: true,
    generators: [{
      kwRating: 250,
      fuelType: 'Diesel',
      cylinders: 6,
      services: ['A', 'B', 'C', 'D', 'E']
    }]
  })
});

const pricing = await response.json();
```

### 4. Google Maps API Integration
```javascript
// Calculate distance from Energen base to site
const distance = await calculateDistance(
  'Energen Base Address',
  'Generator Site Address'
);

// Factor travel time into labor estimate
const travelHours = Math.ceil(distance.miles / 50) * 2; // Round trip
```

### 5. Zoho CRM Integration
```javascript
// Create customer account and generator assets
const accountId = await createZohoAccount(extractedData.contactInformation);

for (const generator of equipmentList) {
  await createGeneratorAsset({
    ...generator,
    customerAccountId: accountId
  });
}
```

## Verification Standards

Per anti-hallucination protocol, all outputs include:

### 1. Confidence Scores
- Every extracted field: 0.0-1.0 confidence
- Every service mapping: confidence + alternative matches
- Every risk score: methodology + evidence

### 2. Evidence Citations
- All dates: cite page number from RFP
- All costs: show calculation steps
- All mappings: show keyword matches found
- All risks: cite specific RFP sections

### 3. Data Quality Metrics
```json
{
  "fieldsExtracted": 87,
  "fieldsWithHighConfidence": 79,
  "fieldsRequiringReview": 8,
  "ambiguities": [
    "Start date shows two different values on pages 3 and 12",
    "Insurance requirement unclear - could be $1M or $2M"
  ],
  "extractionQuality": "high"
}
```

### 4. Calculation Transparency
All cost estimates show:
- Base labor hours (with source)
- Labor rate used (standard or prevailing wage)
- Parts estimate (methodology)
- Multipliers applied (travel, complexity, contingency)
- Tax calculations (if applicable)

## Testing with ANR-6-2025

Reference RFP for validation:
- **Location:** `Request for Proposal No. ANR-6-2025 Genertor Services/`
- **Customer:** CA Department of Water Resources
- **Generators:** 35 units at LBNL
- **Services:** Quarterly A+B, annual analysis
- **Key Issues:**
  - Prevailing wage required (+40% labor)
  - Tax exempt (government)
  - Generator assets not yet in Zoho

### Expected Output Structure
```json
{
  "rfpId": "ANR-6-2025",
  "extractionDate": "2025-10-17T12:00:00Z",
  "overallRiskScore": 5.8,
  "riskLevel": "YELLOW",
  "goNoGoDecision": "CONDITIONAL",
  "estimatedValue": {
    "low": 245000,
    "mid": 287000,
    "high": 325000,
    "currency": "USD",
    "period": "annual"
  },
  "serviceMappings": [
    {
      "originalService": "Quarterly generator inspection",
      "mappedTo": "ServiceA",
      "confidence": 0.95
    },
    {
      "originalService": "Quarterly oil and filter service",
      "mappedTo": "ServiceB",
      "confidence": 0.92
    },
    {
      "originalService": "Annual oil analysis",
      "mappedTo": "ServiceD",
      "confidence": 0.88
    }
  ],
  "riskBreakdown": {
    "financial": 6.5,
    "operational": 4.2,
    "compliance": 8.0,
    "competitive": 5.5,
    "technical": 3.5
  },
  "criticalDates": [
    {"date": "2024-12-01", "event": "Mandatory site visit"},
    {"date": "2024-12-08", "event": "Questions due"},
    {"date": "2024-12-15", "event": "Proposals due 2:00 PM PST"},
    {"date": "2025-01-01", "event": "Contract start"}
  ],
  "generators": {
    "total": 35,
    "byKwRange": {
      "151-250": 12,
      "251-400": 18,
      "401-500": 5
    }
  },
  "complianceRequirements": {
    "prevailingWage": true,
    "bidBond": true,
    "performanceBond": true,
    "insuranceGA": "$2,000,000",
    "licenses": ["C-10", "DIR Registration"]
  }
}
```

## Script Descriptions

### 1. evaluate-rfp.cjs (Main Orchestrator)
**Purpose:** Complete RFP evaluation from start to finish

**Process:**
1. Scan RFP directory for files
2. Extract text from PDFs (using pdf-parse)
3. Call AIExtractionEngine for data extraction
4. Parse equipment list (Excel/CSV)
5. Run service mapping
6. Perform risk assessment
7. Calculate pricing estimates
8. Generate executive summary
9. Create compliance checklist
10. Save all output files

**Usage:**
```bash
node .claude/skills/energen-rfp-evaluator/scripts/evaluate-rfp.cjs \
  "Request for Proposal No. ANR-6-2025 Genertor Services"
```

**Output:** 6 files in `data/rfp-evaluations/ANR-6-2025/`

### 2. analyze-equipment.cjs (Equipment Parser)
**Purpose:** Parse generator equipment lists from Excel/CSV

**Process:**
1. Read Excel/CSV file
2. Extract generator specs (make, model, serial, kW, etc.)
3. Classify by kW range
4. Infer missing data (fuel type, cylinders)
5. Generate Zoho import JSON
6. Create summary by kW range

**Usage:**
```bash
node .claude/skills/energen-rfp-evaluator/scripts/analyze-equipment.cjs \
  "4-Equipment List 10-1-2025.xlsx"
```

**Output:** `{rfp-id}_equipment-list.json`

### 3. assess-risks.cjs (Risk Engine)
**Purpose:** Multi-dimensional risk assessment

**Process:**
1. Load extraction data
2. Score financial risk (bonds, payment terms, retainage)
3. Score operational risk (distance, resources, timeline)
4. Score compliance risk (prevailing wage, certifications)
5. Score competitive risk (evaluation criteria, incumbents)
6. Score technical risk (specialized equipment, custom work)
7. Calculate weighted overall score
8. Generate recommendations

**Usage:**
```bash
node .claude/skills/energen-rfp-evaluator/scripts/assess-risks.cjs \
  "data/rfp-extractions/ext_1759951012191.json"
```

**Output:** `{rfp-id}_risk-assessment.json`

### 4. generate-executive-summary.cjs (Summary Generator)
**Purpose:** Create one-page executive summary

**Process:**
1. Load full evaluation JSON
2. Extract key facts
3. Format risk scores with visual indicators
4. Create service breakdown table
5. Build critical dates timeline
6. Highlight key stipulations
7. Generate Go/No-Go recommendation
8. Output Markdown format

**Usage:**
```bash
node .claude/skills/energen-rfp-evaluator/scripts/generate-executive-summary.cjs \
  "data/rfp-evaluations/ANR-6-2025/ANR-6-2025_full-evaluation.json"
```

**Output:** `{rfp-id}_executive-summary.md`

### 5. map-services-to-energen.cjs (Service Mapper)
**Purpose:** Map RFP services to Energen categories

**Process:**
1. Load extraction data
2. Extract service descriptions and frequencies
3. Call ServiceMappingEngine for each service
4. Calculate labor hours per service
5. Estimate pricing ranges
6. Flag services requiring review
7. Generate mapping report

**Usage:**
```bash
node .claude/skills/energen-rfp-evaluator/scripts/map-services-to-energen.cjs \
  "data/rfp-extractions/ext_1759951012191.json"
```

**Output:** `{rfp-id}_service-mapping.json`

### 6. create-compliance-checklist.cjs (Checklist Generator)
**Purpose:** Generate submission requirements checklist

**Process:**
1. Load extraction data
2. Extract required documents list
3. Parse certification requirements
4. Build insurance requirements table
5. Extract bond requirements
6. Create submission instructions
7. Generate Markdown checklist

**Usage:**
```bash
node .claude/skills/energen-rfp-evaluator/scripts/create-compliance-checklist.cjs \
  "data/rfp-extractions/ext_1759951012191.json"
```

**Output:** `{rfp-id}_compliance-checklist.md`

## Resource Files

### 1. evaluation-template.md
Full evaluation report template with all sections

### 2. executive-summary-template.md
One-page summary template

### 3. risk-matrix.json
Risk scoring criteria and thresholds
```json
{
  "financial": {
    "bondRequirements": {
      "none": 1,
      "bidOnly": 2,
      "performanceOnly": 3,
      "bidAndPerformance": 5,
      "allThree": 7
    },
    "paymentTerms": {
      "net15": 2,
      "net30": 3,
      "net45": 5,
      "net60": 7,
      "net90": 9
    },
    "retainage": {
      "none": 1,
      "5percent": 4,
      "10percent": 7,
      "15percent": 9
    }
  },
  "operational": {
    "distance": {
      "0-25": 1,
      "26-50": 2,
      "51-100": 4,
      "101-150": 6,
      "151-200": 8,
      "200plus": 10
    },
    "generatorCount": {
      "1-10": 1,
      "11-20": 3,
      "21-40": 5,
      "41-60": 7,
      "61-80": 9,
      "80plus": 10
    }
  }
}
```

### 4. service-mapping-rules.json
Extended service mapping patterns
```json
{
  "patterns": {
    "prevailingWageIndicators": [
      "public works",
      "prevailing wage",
      "DIR registration",
      "certified payroll",
      "government contract"
    ],
    "emergencyServiceIndicators": [
      "24/7",
      "emergency",
      "on-call",
      "response time",
      "immediate"
    ],
    "customWorkIndicators": [
      "as-directed",
      "miscellaneous",
      "other work",
      "special projects",
      "additional services"
    ]
  }
}
```

### 5. decision-matrix.json
Go/No-Go scoring criteria
```json
{
  "criteria": [
    {
      "name": "Profit Margin >15%",
      "weight": 0.25,
      "threshold": 15,
      "unit": "percent"
    },
    {
      "name": "Resources Available",
      "weight": 0.20,
      "scoreMethod": "manual"
    },
    {
      "name": "Risk Score <5.0",
      "weight": 0.20,
      "threshold": 5.0,
      "inverted": true
    }
  ],
  "thresholds": {
    "strongGo": 8.0,
    "go": 6.0,
    "conditional": 4.0,
    "noGo": 0
  }
}
```

### 6. compliance-checklist-template.md
Checklist Markdown template

## Example Files

### 1. example-anr-6-2025.json
Complete evaluation of ANR-6-2025 RFP with all sections populated

### 2. example-executive-summary.md
Sample one-page executive summary with realistic data

### 3. example-risk-assessment.json
Sample risk assessment with scoring methodology

## Error Handling

### Common Issues

**PDF Extraction Failures:**
- Use fallback OCR if text extraction fails
- Handle scanned PDFs vs. digital PDFs
- Preserve page numbers for citations

**Excel Parsing Errors:**
- Handle merged cells
- Detect header rows automatically
- Handle multiple sheets
- Parse formulas vs. values

**Service Mapping Ambiguities:**
- Flag low-confidence mappings (<0.75)
- Provide alternative matches
- Allow manual override
- Log all mapping decisions

**Missing Data:**
- Clearly mark fields as "Not Found" vs. "Not Applicable"
- Provide confidence scores
- Flag ambiguities for human review
- Never guess or hallucinate data

## Troubleshooting

**APIExtractionEngine Failures:**
- Check ANTHROPIC_API_KEY in .env
- Verify Claude 3.7 Sonnet model availability
- Check prompt caching settings
- Review extraction output for JSON errors

**Service Mapping Low Confidence:**
- Review original RFP service descriptions
- Check for specialized terminology
- Consider adding custom mappings
- Flag for manual review

**Risk Assessment Discrepancies:**
- Verify all input data loaded correctly
- Check risk scoring thresholds in risk-matrix.json
- Review calculation methodology
- Validate against manual assessment

**Equipment List Parsing Errors:**
- Verify Excel file format (.xlsx, .xls, .csv)
- Check for non-standard column headers
- Handle merged cells and formatting
- Validate kW ratings are numeric

## Next Steps After Evaluation

1. **Review Executive Summary** - Validate Go/No-Go recommendation
2. **Verify Risk Assessment** - Confirm risk scores and mitigation plans
3. **Check Service Mappings** - Review any low-confidence mappings
4. **Validate Equipment List** - Cross-check generator counts and specs
5. **Complete Compliance Checklist** - Gather required documents
6. **Calculate Final Pricing** - Use Energen Calculator API
7. **Create Zoho Records** - Import customer and generator assets
8. **Generate Bid Package** - Compile all documentation
9. **Executive Review** - Present to leadership if required
10. **Submit Proposal** - Follow submission instructions exactly

## Additional Resources

- **Existing RFP Processor:** `modules/rfp-processor/`
- **AIExtractionEngine:** `modules/rfp-processor/AIExtractionEngine.cjs`
- **ServiceMappingEngine:** `modules/rfp-processor/ServiceMappingEngine.cjs`
- **Energen Calculator API:** `src/api/server-secure.cjs`
- **Zoho Integration:** `modules/zoho-integration/ZohoMCPServer.js`
- **Project Documentation:** `.claude/CLAUDE.md`

## Support

For issues or questions:
1. Check existing RFP extractions in `data/rfp-extractions/`
2. Review test output from evaluation scripts
3. Verify all API keys and credentials in `.env`
4. Check service mapping confidence scores
5. Validate risk assessment calculations manually


## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added USAGE_EXAMPLES.md with real RFP scenarios
- ✅ Enhanced risk assessment documentation
- ✅ Improved service mapping examples
- ✅ Added decision matrix templates

### v1.0.0 (2025-10-17)
- Initial release with AI extraction engine
- Multi-dimensional risk assessment
- Service mapping to Energen A-K categories
- Equipment list parsing
- Executive summary generation
- Go/No-Go decision support

