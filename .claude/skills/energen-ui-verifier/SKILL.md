---
name: energen-ui-verifier
description: Comprehensive, excruciatingly detailed UI/UX verification for Energen Calculator v5.0 - No false "production ready" claims
version: 1.1.0
category: testing
tags: [ui, e2e, verification, chrome-devtools, zoho, production-ready]
---

# Energen UI Verifier - Production Readiness Gate

**MISSION:** Prevent "breaks on first click" disasters through stem-to-stern workflow verification.

**CRITICAL CONTEXT:**
- Previous work declared "100% production ready" but failed on first click
- User needs EXCRUCIATINGLY DETAILED verification of EVERY element
- Complete workflow: Fresh page → Customer → Contact → Generator → Services → Calculate → PDF → Zoho
- **BROWSER AUTOMATION: Kapture MCP (primary), Chrome DevTools MCP (secondary) - See browser-automation.md** - Automated browser control for verification

**PRODUCTION READY GATE:** Exit code 0 ONLY if ALL phases pass ALL checks. Better to fail a test than declare ready when it's not.

---

## Quick Start

**For detailed phase instructions, see the `phases/` directory.**

Each phase file contains:
- Purpose and context
- UI elements to verify
- Test sequences
- Evidence requirements
- Known issues
- Pass/fail criteria

---

## Verification Phases Overview

| Phase | File | Focus | Checks |
|-------|------|-------|--------|
| **Phase 0** | [phase-0-preflight.md](phases/phase-0-preflight.md) | Pre-Flight (server, page load) | 7 checks |
| **Phase 1** | [phase-1-customer.md](phases/phase-1-customer.md) | Customer entry, logo, enrichment | 15 checks |
| **Phase 1.5** | [phase-1.5-settings.md](phases/phase-1.5-settings.md) | Settings modal + prevailing wage | 14 checks |
| **Phase 1.6** | [phase-1.6-prevailing-wage-api.md](phases/phase-1.6-prevailing-wage-api.md) | Prevailing wage API integration | 12 checks |
| **Phase 2** | [phase-2-contact.md](phases/phase-2-contact.md) | Contact information entry | 11 checks |
| **Phase 3** | [phase-3-generator.md](phases/phase-3-generator.md) | Generator specifications | 18 checks |
| **Phase 4** | [phase-4-services.md](phases/phase-4-services.md) | Service selection (A-K + Custom) | 36 checks |
| **Phase 5** | [phase-5-calculation.md](phases/phase-5-calculation.md) | Quote calc + prevailing wage | 25 checks |
| **Phase 6** | [phase-6-results.md](phases/phase-6-results.md) | Results + prevailing wage impact | 18 checks |
| **Phase 7** | [phase-7-pdf.md](phases/phase-7-pdf.md) | PDF generation | 12 checks |
| **Phase 8** | [phase-8-zoho.md](phases/phase-8-zoho.md) | Complete Zoho transfer + prevailing wage | 29 checks |
| **Phase 9** | [phase-9-integration.md](phases/phase-9-integration.md) | End-to-end integration | All phases |
| **Phase 10** | [phase-10-views.md](phases/phase-10-views.md) | View switching navigation | 6 checks |
| **Phase 11** | [phase-11-bottom-controls.md](phases/phase-11-bottom-controls.md) | Bottom-of-page controls | 8 checks |
| **Phase 12** | [phase-12-email.md](phases/phase-12-email.md) | Email quote workflow | 7 checks |
| **Phase 13** | [phase-13-duplicate.md](phases/phase-13-duplicate.md) | Duplicate quote workflow | 5 checks |
| **Phase 14** | [phase-14-revision.md](phases/phase-14-revision.md) | Create revision workflow | 6 checks |
| **Phase 15** | [phase-15-ocr.md](phases/phase-15-ocr.md) | Business card OCR | 9 checks |
| **Phase 16** | [phase-16-rfp.md](phases/phase-16-rfp.md) | RFP upload & processing | 11 checks |

**Total:** 17 phases, 241 verification checks

---

## Usage

### Invoke the Skill
```
Use energen-ui-verifier to verify production readiness
```

### Run Specific Phase
```
Use energen-ui-verifier to test Phase 4 (Service Selection) in detail
```

### Run Automated Script
```bash
node .claude/skills/energen-ui-verifier/scripts/run-ui-verification.cjs
```

---

## Progressive Disclosure Design

This skill uses **progressive disclosure** to minimize context usage:

1. **Initial Load:** Claude sees this overview (220 lines)
2. **Phase Selection:** Claude loads only the specific phase file needed (100-200 lines each)
3. **Total Context:** ~400 lines maximum vs 1,893 lines in monolithic design

**Benefits:**
- ✅ Faster skill loading
- ✅ Reduced context window usage
- ✅ Easier to navigate and maintain
- ✅ Follows 2025 Anthropic best practices

---

## Additional Resources

- **[Production Ready Criteria](phases/production-ready-criteria.md)** - Requirements for PASS
- **[Running Verification](phases/running-verification.md)** - Execution instructions
- **[Known Issues](phases/known-issues.md)** - E2E bug reference
- **[Browser Automation](phases/browser-automation.md)** - Chrome DevTools MCP usage
- **[Error Detection](phases/error-detection.md)** - Popup and error monitoring
- **[Output Files](phases/output-files.md)** - Report structure
- **[Server Restart](phases/server-restart.md)** - Process management
- **[Anti-Hallucination](phases/anti-hallucination.md)** - Evidence requirements
- **[Success Statement](phases/success-statement.md)** - Production ready declaration

---

## Anti-Hallucination Protocol

**Every claim must have evidence:**
- ✅ "Phase X PASSED" → Screenshot + console log + state verification
- ❌ "Phase X PASSED" → No evidence = INVALID CLAIM

**No assumptions:**
- ✅ "Button exists at selector X" → DevTools confirms
- ❌ "Button probably exists" → INVALID CLAIM

**Fail fast:**
- First error in any phase → STOP
- Document error with evidence
- Mark phase as FAILED
- Do NOT continue to next phase

---

## Production Ready Gate

Exit code 0 (PASS) requires ALL of the following:

### Technical Requirements
✅ All 16 phases pass without errors
✅ No console errors in any phase
✅ All API calls return 2xx responses
✅ All UI elements present and functional
✅ All form validations working
✅ All calculations accurate within 1% tolerance
✅ PDF generates with correct data
✅ Complete Zoho transfer with all links

### Data Accuracy Requirements
✅ Customer data: 100% match (form → Zoho)
✅ Generator data: 100% match (form → Zoho)
✅ Service selection: 100% match (UI → Quote)
✅ Pricing: 100% match (Calculator → PDF → Zoho)
✅ Totals: Exact match (no rounding errors > $1)

### Performance Requirements
✅ Page load: < 3 seconds
✅ Enrichment: < 5 seconds
✅ Calculation: < 10 seconds
✅ PDF generation: < 10 seconds
✅ Zoho transfer: < 15 seconds per record
✅ Complete workflow: < 60 seconds

**Anything less than 100% = NOT PRODUCTION READY**

---

## Changelog

### v1.2.0 (2025-10-27)
- ✅ Added Phase 1.6: Prevailing Wage API Integration (12 checks)
- ✅ Enhanced Phase 1.5: Prevailing wage settings verification (+6 checks)
- ✅ Enhanced Phase 5: Prevailing wage calculation validation (+3 checks)
- ✅ Enhanced Phase 6: Prevailing wage results verification (+3 checks)
- ✅ Enhanced Phase 8: Zoho prevailing wage data transfer (+5 checks)
- ✅ Total verification checks: 220 → 241 (+21 checks)
- ✅ Supports DIR 2025 prevailing wage rates with zone-based adjustments
- ✅ Validates business overhead integration ($115.00 default)
- ✅ Verifies manual override functionality with visual feedback

### v1.1.0 (2025-10-18)
- ✅ Split SKILL.md into 25 phase-specific files (progressive disclosure)
- ✅ Reduced initial context load from 1,893 to 220 lines
- ✅ Added phase overview table with file links
- ✅ Improved navigation and maintainability
- ✅ Follows 2025 Anthropic best practices

### v1.0.0 (2025-10-17)
- Initial release with monolithic SKILL.md
- 16 verification phases
- 160+ checks

---

**Version:** 1.2.0
**Last Updated:** October 27, 2025
**Status:** Production Ready
**Architecture:** Progressive Disclosure (Anthropic 2025 Best Practice)
**Latest Enhancement:** Prevailing Wage Integration (DIR 2025 Compliance)
