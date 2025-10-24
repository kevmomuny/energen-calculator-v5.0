# Multi-Pass RFP Evaluator - Usage Guide

## Overview

The **Multi-Pass Comprehensive RFP Evaluator** is a zero-hallucination system designed to extract every detail from government RFPs that affects pricing, requirements, and compliance.

### Key Improvements Over Original

| Feature | Original (v1.0) | Multi-Pass (v2.0) |
|---------|----------------|-------------------|
| **Documents Processed** | First PDF only | ALL PDFs in folder |
| **Extraction Passes** | 1 (generic) | 5 (specialized) |
| **Hidden Requirements** | Often missed | Systematic trap detection |
| **Conflict Detection** | None | Cross-document validation |
| **Document Hierarchy** | Not aware | Addenda > Contracts > Main |
| **Page References** | Limited | Every finding cited |

---

## Architecture

### 5-Pass Extraction Strategy

```
┌─────────────────────────────────────────────────────────┐
│  PASS 1: Main Document Extraction                       │
│  Extract: contacts, schedule, services, bonds, payment  │
│  Prompt: Generic RFP extraction                         │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  PASS 2: Trap Detection                                 │
│  Extract: Hidden requirements in ALL documents          │
│  Prompt: Generator-service-specific traps               │
│  Focus: Prevailing wage, emergency response, parts,     │
│         access restrictions, liquidated damages, etc.   │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  PASS 3: Secondary Documents                            │
│  Process: Sample contracts, SOW, addenda                │
│  Extract: Additional services, terms, requirements      │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  PASS 4: Cross-Document Validation                      │
│  Detect: Conflicts (e.g., Page 3 says Net 30,           │
│          Page 47 says Net 60)                           │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  PASS 5: Conflict Resolution                            │
│  Resolve: Using document hierarchy + confidence scores  │
│  Priority: Addenda (10) > Contracts (7) > Main (3)      │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  FINAL: Merge All Data                                  │
│  Output: Comprehensive extraction with all findings     │
└─────────────────────────────────────────────────────────┘
```

---

## Usage

### Basic Usage

```bash
node .claude/skills/energen-rfp-evaluator/scripts/evaluate-rfp-comprehensive.cjs "C:/RFP-/ANR-6-2025"
```

### Expected Folder Structure

```
C:/RFP-/ANR-6-2025/
  ├── 1-RFP-Document.pdf          ← Main RFP
  ├── 2-Sample-Contract.pdf       ← Contract terms
  ├── 3-SOW.pdf                   ← Scope of Work
  ├── 4-Equipment-List.xlsx       ← Generator inventory
  ├── 5-Addendum-1.pdf            ← Changes/clarifications
  └── 6-Pricing-Form.xlsx         ← Pricing template
```

### What It Processes

| File Type | Processed? | Purpose |
|-----------|------------|---------|
| All PDFs  | ✅ Yes | Text extraction + classification |
| Excel/CSV | ✅ Yes | Equipment list parsing |
| Images    | ❌ Not yet | Phase 2 feature |

---

## Output Files

The evaluator generates **8 comprehensive output files**:

### 1. `full-evaluation-comprehensive.json`
Complete evaluation including all passes, extraction data, equipment, risk, and service mapping.

```json
{
  "metadata": {
    "rfpId": "ANR-6-2025",
    "evaluationDate": "2025-10-23T...",
    "version": "2.0.0",
    "documentsProcessed": 5
  },
  "extraction": { /* final merged data */ },
  "multiPassResults": {
    "passes": {
      "pass1_main": { /* main extraction */ },
      "pass2_traps": { /* hidden requirements */ },
      "pass3_secondary": [ /* secondary docs */ ]
    },
    "conflicts": [ /* detected conflicts */ ],
    "resolvedConflicts": [ /* resolutions */ ]
  },
  "equipmentData": { /* parsed generators */ },
  "riskAssessment": { /* risk scores */ },
  "serviceMapping": { /* RFP → Energen services */ }
}
```

### 2. `hidden-requirements-traps.json`
**CRITICAL FILE** - Contains all hidden requirements that affect pricing/compliance.

```json
{
  "trapDetectionResults": {
    "laborTraps": {
      "prevailingWage": {
        "found": true,
        "impact": "High",
        "details": "All work subject to California prevailing wage...",
        "pageNumber": "47",
        "confidence": 1.0,
        "extractedData": {
          "required": true,
          "wageDetermination": "CA-2024-001",
          "registrationRequired": ["DIR", "LCP Tracker"]
        }
      },
      "emergencyResponse": {
        "found": true,
        "impact": "High",
        "details": "Contractor shall respond to emergencies within 2 hours...",
        "pageNumber": "12",
        "extractedData": {
          "responseTime": "2 hours",
          "coverage": "24/7"
        }
      }
    },
    "partsTraps": { /* ... */ },
    "accessTraps": { /* ... */ },
    "financialTraps": { /* ... */ },
    "complianceTraps": { /* ... */ }
  },
  "summary": {
    "totalTrapsFound": 12,
    "highImpactTraps": 5,
    "criticalMissableItems": [
      "Prevailing wage required (page 47) - +45% labor cost",
      "Emergency response within 2 hours (page 12) - requires on-call staffing",
      "Contractor provides all fuel for testing (page 23) - +$150/service"
    ]
  }
}
```

### 3. `conflicts-detected.json`
Only generated if conflicts found across documents.

```json
{
  "conflicts": [
    {
      "type": "payment_terms",
      "field": "paymentNet",
      "values": [
        { "source": "Main RFP", "value": "Net 30", "confidence": 0.95 },
        { "source": "2-Sample-Contract.pdf", "value": "Net 60", "confidence": 0.98 }
      ],
      "severity": "high"
    }
  ],
  "resolved": [
    {
      "type": "payment_terms",
      "resolved": true,
      "resolvedValue": "Net 60",
      "resolvedSource": "2-Sample-Contract.pdf",
      "resolution": "Using value from 2-Sample-Contract.pdf (sample-contract, priority 7)"
    }
  ]
}
```

### 4. `equipment-list.json`
Parsed generator inventory with Zoho-compatible fields.

### 5. `risk-assessment.json`
Multi-dimensional risk scoring (financial, operational, compliance, competitive, technical).

### 6. `service-mapping.json`
RFP services mapped to Energen A-K categories with confidence scores.

### 7. `executive-summary.md`
One-page decision summary (Go/No-Go recommendation).

### 8. `compliance-checklist.md`
Submission requirements checklist with deadlines.

---

## Trap Detection Categories

The system systematically searches for **6 categories of hidden requirements**:

### 1. Labor & Wage Traps
- Prevailing wage (Davis-Bacon)
- Emergency response requirements
- After-hours/overtime requirements

**Impact:** +40-100% labor cost increase

### 2. Parts & Materials Traps
- Contractor-provided parts
- Fuel/lubricants provision
- Vendor restrictions (OEM-only)

**Impact:** +20-50% parts cost increase

### 3. Access & Logistics Traps
- Security clearance requirements
- Advance notice requirements (72hr, 48hr)
- Special access needs (rooftop, crane, confined space)

**Impact:** Delays, additional labor, equipment rental

### 4. Financial Traps
- Liquidated damages
- Retainage release terms
- Price adjustment caps (renewals)
- Extended payment timelines

**Impact:** Cash flow issues, penalties

### 5. Compliance & Liability Traps
- Warranty requirements
- Insurance additional insured clauses
- Documentation burden
- Environmental/safety certifications

**Impact:** Administrative overhead, insurance premiums

### 6. Submission Traps
- Automatic disqualification triggers
- Format requirements (must use agency forms)
- Signature/notarization needs

**Impact:** Bid rejection if missed

---

## Document Classification & Hierarchy

The system automatically classifies documents and uses hierarchy for conflict resolution:

| Document Type | Priority | Identification | Authority |
|---------------|----------|----------------|-----------|
| **Addendum** | 10 | Filename contains "addend", "amendment" | Highest - supersedes all |
| **Contract** | 7 | "contract", "sample" | High - legal terms |
| **SOW** | 5 | "sow", "scope" | Medium - technical specs |
| **Main RFP** | 3 | Starts with "1-", "rfp", "main" | Base document |
| **Other** | 1 | Everything else | Lowest |

**Conflict Resolution Example:**
```
Main RFP (page 3): Payment Net 30 (confidence 0.95, priority 3)
Contract (page 12): Payment Net 60 (confidence 0.98, priority 7)

RESOLVED → Net 60 (contract wins due to higher priority)
```

---

## Integration with Existing Workflows

### Using with Original evaluate-rfp.cjs

You can use **both** evaluators:

```bash
# Quick evaluation (1 pass, fast)
node scripts/evaluate-rfp.cjs "path/to/rfp"

# Comprehensive evaluation (5 passes, thorough)
node scripts/evaluate-rfp-comprehensive.cjs "path/to/rfp"
```

**Recommendation:** Use comprehensive evaluator for:
- Government RFPs (always have hidden requirements)
- Large contracts (>$100K)
- Multi-document packages
- When 100% accuracy is required

Use original evaluator for:
- Quick assessments
- Simple RFPs with single PDF
- Private sector bids (less traps)

---

## Cost & Performance

### API Costs (Claude 3.7 Sonnet with Caching)

**Typical 50-page government RFP with 5 documents:**

| Pass | Tokens | First Run | Cached Run |
|------|--------|-----------|------------|
| Pass 1 | ~60K | $0.20 | $0.03 |
| Pass 2 | ~80K | $0.28 | $0.04 |
| Pass 3 | ~40K | $0.14 | $0.02 |
| **Total** | ~180K | **$0.62** | **$0.09** |

**With caching enabled (default):**
- First evaluation: ~$0.62
- Subsequent evaluations (same RFP): ~$0.09
- **Savings: 85%**

### Processing Time

| RFP Size | Documents | Time (approx) |
|----------|-----------|---------------|
| Small | 1-2 PDFs, 20 pages | 45-60 sec |
| Medium | 3-5 PDFs, 50 pages | 90-120 sec |
| Large | 6+ PDFs, 100+ pages | 150-240 sec |

---

## Environment Setup

### Required

```bash
# .env file
ANTHROPIC_API_KEY=your_api_key_here
```

### Dependencies

```bash
npm install @anthropic-ai/sdk pdf-parse xlsx dotenv
```

---

## Troubleshooting

### "ANTHROPIC_API_KEY not set"
**Solution:** Add API key to `.env` file in project root.

### "No PDF files found"
**Solution:** Ensure folder contains `.pdf` files. Check path is absolute or relative to script.

### "Very little text extracted"
**Cause:** PDF is scanned images (not digital text).
**Solution:** Phase 2 will add OCR support. For now, request digital PDFs from agency.

### "Trap detection returned no traps"
**Possible reasons:**
1. RFP is unusually clean (rare for government)
2. Text extraction failed (check PDF quality)
3. Prompt needs tuning for specific RFP format

**Check:** Open `hidden-requirements-traps.json` and look at `summary.totalTrapsFound`. If 0 but you know there are hidden requirements, report issue.

### Conflicts Not Resolving Correctly
**Check:** `conflicts-detected.json` to see resolution logic. Document priority may need adjustment.

**Solution:** Manually review `alternativeValues` in resolved conflicts.

---

## Next Steps After Evaluation

1. **Review Hidden Requirements** (`hidden-requirements-traps.json`)
   - Check all HIGH impact items
   - Adjust pricing for +40-50% if prevailing wage found

2. **Check Conflicts** (`conflicts-detected.json`)
   - Validate resolution made sense
   - Note: Addenda ALWAYS win over main RFP

3. **Review Risk Assessment** (`risk-assessment.json`)
   - If RED or ORANGE → Executive review required
   - Check mitigation recommendations

4. **Validate Service Mapping** (`service-mapping.json`)
   - Review any low-confidence mappings (<0.75)
   - Confirm Service K (custom) items

5. **Use Compliance Checklist** (`compliance-checklist.md`)
   - Start gathering required documents NOW
   - Note all deadlines

6. **Price in v5.0 Calculator**
   - Use extracted data to build quote
   - Apply prevailing wage multiplier if found
   - Account for emergency response if required

---

## Future Enhancements (Coming Soon)

### Phase 2: Image Processing
- OCR for scanned PDFs
- Table detection in images
- Site map/diagram extraction

### Phase 3: v5.0 Calculator Integration
- Auto-format data for `/api/calculate`
- One-click pricing from RFP
- Zoho import ready JSON

### Phase 4: Historical Learning
- Compare to past RFPs from same agency
- Predict hidden requirements by agency
- Suggest pricing based on similar contracts

---

## Support

For issues or questions:
1. Check `output/rfp-evaluations/{rfpId}/` for detailed logs
2. Review `hidden-requirements-traps.json` for trap detection results
3. Examine `conflicts-detected.json` if data seems inconsistent

**Remember:** The goal is **zero hallucination**. If extraction confidence < 80%, manually review the RFP sections flagged.
