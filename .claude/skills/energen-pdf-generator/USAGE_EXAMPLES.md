# Usage Examples - Energen PDF Generator

## Example 1: Convert RFP Executive Summary

**Command:**
```bash
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "output/rfp-evaluations/P2540009/executive-summary.md" \
  --output "output/rfp-evaluations/P2540009/executive-summary.pdf" \
  --template "energen-formal" \
  --tier "comfortable"
```

**Result:** Professional PDF with cover page, TOC, branded headers/footers

---

## Example 2: Batch Convert Documentation

**Command:**
```bash
node .claude/skills/energen-pdf-generator/scripts/batch-generate.cjs \
  --input "docs/" \
  --output "docs/pdf/" \
  --template "energen-default" \
  --tier "standard"
```

**Result:** All `.md` files in `docs/` converted to branded PDFs in `docs/pdf/`

---

## Example 3: Compact Technical Spec

**Command:**
```bash
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "API-SPEC.md" \
  --output "API-SPEC.pdf" \
  --template "energen-minimal" \
  --tier "compact"
```

**Result:** Dense 9pt technical document with minimal branding

---

## Example 4: Presentation Materials

**Command:**
```bash
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "training.md" \
  --output "training.pdf" \
  --tier "presentation"
```

**Result:** Large 14pt fonts suitable for projection

---

**Last Updated:** October 18, 2025
