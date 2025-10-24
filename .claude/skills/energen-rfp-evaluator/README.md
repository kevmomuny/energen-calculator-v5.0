# Energen RFP Evaluator Skill

Comprehensive RFP evaluation and bid package generation for generator maintenance services.

## Quick Start

```bash
# Full RFP evaluation (all steps)
node .claude/skills/energen-rfp-evaluator/scripts/evaluate-rfp.cjs \
  "Request for Proposal No. ANR-6-2025 Genertor Services"

# Individual components
node .claude/skills/energen-rfp-evaluator/scripts/analyze-equipment.cjs "4-Equipment List.xlsx"
node .claude/skills/energen-rfp-evaluator/scripts/assess-risks.cjs "extraction.json"
node .claude/skills/energen-rfp-evaluator/scripts/map-services-to-energen.cjs "extraction.json"
node .claude/skills/energen-rfp-evaluator/scripts/generate-executive-summary.cjs "full-evaluation.json"
node .claude/skills/energen-rfp-evaluator/scripts/create-compliance-checklist.cjs "extraction.json"
```

## What It Does

### 1. Data Extraction (AIExtractionEngine)
- Contacts, schedules, services, stipulations
- Payment terms, bonds, insurance requirements
- Required documents and certifications
- Confidence scoring for all fields

### 2. Risk Assessment (5 Dimensions)
- **Financial**: Bonds, payment terms, retainage, contract value
- **Operational**: Distance, generator count, timeline, resources
- **Compliance**: Prevailing wage, certifications, insurance
- **Competitive**: Evaluation criteria, incumbents, bidders
- **Technical**: Equipment complexity, specialized services

**Output**: 1-10 score per dimension, weighted overall score, color-coded risk level

### 3. Service Mapping
- Maps RFP services to Energen A-K categories
- Confidence scoring with alternative matches
- Labor hour estimation
- Pricing range calculation

### 4. Equipment Analysis
- Parses Excel/CSV equipment lists
- Extracts generator specs (kW, make, model, serial)
- Classifies by kW range
- Generates Zoho import JSON

### 5. Executive Summary
- One-page "at-a-glance" report
- Risk score visualization
- Service breakdown table
- Critical dates timeline
- Go/No-Go recommendation

### 6. Decision Support
- Go/No-Go matrix with 6 weighted criteria
- Profit margin, resources, risk, strategic fit, relationship, terms
- Automated scoring with thresholds
- Action recommendations

### 7. Compliance Checklist
- Required documents tracker
- Certifications needed
- Insurance requirements
- Bond procurement
- Submission instructions

## Output Files

For RFP `ANR-6-2025`:

1. `ANR-6-2025_full-evaluation.json` - Complete evaluation (all data)
2. `ANR-6-2025_executive-summary.md` - One-page report
3. `ANR-6-2025_compliance-checklist.md` - Submission checklist
4. `ANR-6-2025_risk-assessment.json` - Detailed risk analysis
5. `ANR-6-2025_service-mapping.json` - Service → Energen mapping
6. `ANR-6-2025_equipment-list.json` - Parsed generator assets

## Directory Structure

```
.claude/skills/energen-rfp-evaluator/
├── SKILL.md                    # Complete skill documentation
├── README.md                   # This file
├── scripts/
│   ├── evaluate-rfp.cjs        # Main orchestrator (all steps)
│   ├── analyze-equipment.cjs   # Equipment list parser
│   ├── assess-risks.cjs        # Risk assessment engine
│   ├── generate-executive-summary.cjs
│   ├── map-services-to-energen.cjs
│   └── create-compliance-checklist.cjs
├── resources/
│   ├── risk-matrix.json        # Risk scoring criteria
│   ├── decision-matrix.json    # Go/No-Go criteria
│   ├── service-mapping-rules.json
│   ├── evaluation-template.md
│   ├── executive-summary-template.md
│   └── compliance-checklist-template.md
└── examples/
    ├── example-anr-6-2025.json
    ├── example-executive-summary.md
    └── example-risk-assessment.json
```

## Integration Points

- **AIExtractionEngine**: `modules/rfp-processor/AIExtractionEngine.cjs`
- **ServiceMappingEngine**: `modules/rfp-processor/ServiceMappingEngine.cjs`
- **Energen Calculator API**: `http://localhost:3002/api/calculate`
- **Zoho CRM**: `modules/zoho-integration/ZohoMCPServer.js`
- **Google Maps API**: Distance calculations

## Requirements

- Node.js 14+
- ANTHROPIC_API_KEY (for AI extraction)
- Access to Energen Calculator API
- XLSX library for Excel parsing
- pdf-parse library for PDF extraction

## Risk Score Interpretation

| Score | Level | Color | Action |
|-------|-------|-------|--------|
| 0-3.0 | LOW | 🟢 | Proceed standard process |
| 3.1-5.0 | MEDIUM | 🟡 | Proceed with mitigation plan |
| 5.1-7.0 | HIGH | 🟠 | Executive review required |
| 7.1-10.0 | VERY HIGH | 🔴 | Consider no-bid, board approval needed |

## Service Mapping Confidence

| Confidence | Meaning | Action |
|------------|---------|--------|
| 0.90-1.00 | High - Clear match | Auto-approve |
| 0.75-0.89 | Medium - Good match | Quick review |
| 0.60-0.74 | Low - Uncertain | Manual review required |
| 0.00-0.59 | Very Low - Ambiguous | Manual mapping required |

## Example Usage

### Full Evaluation
```bash
cd C:/ECalc/active/energen-calculator-v5.0
node .claude/skills/energen-rfp-evaluator/scripts/evaluate-rfp.cjs \
  "Request for Proposal No. ANR-6-2025 Genertor Services"

# Output:
# ✓ Data extraction complete (confidence: 0.92)
# ✓ Equipment list parsed (35 generators)
# ✓ Services mapped (3 services, avg confidence: 0.89)
# ✓ Risk assessment complete (score: 5.8/10 - YELLOW)
# ✓ Executive summary generated
# ✓ Compliance checklist created
#
# Files saved to: data/rfp-evaluations/ANR-6-2025/
```

### Equipment List Only
```bash
node .claude/skills/energen-rfp-evaluator/scripts/analyze-equipment.cjs \
  "4-Equipment List 10-1-2025.xlsx"

# Output:
# ✓ Parsed 35 generators
# ✓ kW ranges: 151-250 (12), 251-400 (18), 401-500 (5)
# ✓ Zoho import JSON generated
```

### Risk Assessment Only
```bash
node .claude/skills/energen-rfp-evaluator/scripts/assess-risks.cjs \
  "data/rfp-extractions/ext_1759951012191.json"

# Output:
# Risk Assessment: ANR-6-2025
# ================================
# Financial:    6.5/10 ⚠️  (Bonds + prevailing wage)
# Operational:  4.2/10 ✓   (Manageable distance/count)
# Compliance:   8.0/10 ⚠️  (Prevailing wage required)
# Competitive:  5.5/10 ⚠️  (Unknown customer)
# Technical:    3.5/10 ✓   (Standard generators)
# --------------------------------
# Overall:      5.8/10 🟡 MEDIUM RISK
#
# Recommendation: Proceed with mitigation plan
```

## Verification Standards

Per anti-hallucination protocol:

1. **Confidence Scores**: Every extracted field includes 0.0-1.0 confidence
2. **Evidence Citations**: All data cites page numbers from source RFP
3. **Calculation Transparency**: All costs show complete calculation steps
4. **Quality Metrics**: Extraction reports fields extracted, requiring review, ambiguities

## Common Issues

**AIExtractionEngine fails:**
- Check ANTHROPIC_API_KEY in .env
- Verify Claude 3.7 Sonnet model access
- Check prompt caching settings

**Service mapping low confidence:**
- Review RFP service descriptions
- Check for specialized terminology
- Add custom mappings to service-mapping-rules.json

**Equipment list parsing errors:**
- Verify Excel format (.xlsx, .xls, .csv)
- Check column headers match expected format
- Handle merged cells manually

**Risk scores seem incorrect:**
- Validate input data completeness
- Check thresholds in risk-matrix.json
- Compare against manual assessment

## Next Steps After Evaluation

1. ✓ Review executive summary
2. ✓ Validate service mappings
3. ✓ Verify equipment list accuracy
4. ✓ Assess risk mitigation needs
5. ✓ Complete compliance checklist
6. ✓ Calculate final pricing (Energen Calculator)
7. ✓ Create Zoho customer + generator records
8. ✓ Generate bid package documents
9. ✓ Executive review (if required by risk level)
10. ✓ Submit proposal

## Support

- Full documentation: `SKILL.md`
- Risk scoring: `resources/risk-matrix.json`
- Decision criteria: `resources/decision-matrix.json`
- Example outputs: `examples/`
- AIExtractionEngine: `modules/rfp-processor/AIExtractionEngine.cjs`
- ServiceMappingEngine: `modules/rfp-processor/ServiceMappingEngine.cjs`
