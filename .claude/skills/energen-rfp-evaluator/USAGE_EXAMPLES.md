# Usage Examples - Energen RFP Evaluator

## Example 1: Process LBNL RFP Package

**Command:**
```
Use energen-rfp-evaluator to process the ANR-6-2025 RFP package
```

**Input Files:**
- `1-RFP-ANR-6-2025.pdf` (main document)
- `3-SOW.pdf` (scope of work)
- `4-Equipment List 10-1-2025.xlsx` (generator assets)

**Generated Output:**
- `executive-summary.md` (one-page decision report)
- `risk-assessment.json` (5-dimensional scoring)
- `service-mapping.json` (maps to Energen A-K)
- `equipment-analysis.json` (parsed generator specs)
- `compliance-checklist.md`
- `go-no-go-recommendation.md`

---

## Example 2: Generate Bid Package

**Command:**
```
Use energen-rfp-evaluator to generate complete bid package for P2540009
```

**Steps:**
1. AI extracts all RFP requirements
2. Maps to Energen services (A, B, C, E, F, etc.)
3. Calculates pricing for each generator
4. Assesses risks (financial, operational, compliance, competitive, technical)
5. Generates executive summary
6. Creates compliance checklist

**Decision Matrix Output:**
```
Risk Score: 42/100 (MEDIUM)
Financial Risk: 6/20 (LOW)
Operational Risk: 12/20 (MEDIUM)
Compliance Risk: 4/20 (LOW)
Competitive Risk: 14/20 (HIGH)
Technical Risk: 6/20 (LOW)

Recommendation: GO (with mitigation plan for competitive risk)
```

---

**Last Updated:** October 18, 2025
