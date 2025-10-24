# Energen PDF Generator Skill

Quick reference for using the Energen Markdown-to-PDF Formatter from Claude Code.

## Quick Start

### Generate a PDF from markdown:

```bash
node C:/ECalc/active/energen-md-formatter/cli/generate-pdf.js \
  -i "input.md" \
  -o "output.pdf" \
  --template "energen-default" \
  --tier "standard"
```

### Common Workflows

#### 1. Convert RFP Evaluation to PDF
```bash
node C:/ECalc/active/energen-md-formatter/cli/generate-pdf.js \
  -i "output/rfp-evaluations/[RFP-NAME]/executive-summary.md" \
  -o "output/rfp-evaluations/[RFP-NAME]/executive-summary.pdf" \
  --template "energen-formal" \
  --tier "comfortable"
```

#### 2. Batch Convert Documentation
```bash
node C:/ECalc/active/energen-md-formatter/cli/batch-generate.js \
  -i "docs/" \
  -o "docs/pdf/" \
  --template "energen-default" \
  --tier "standard"
```

#### 3. Generate Technical Spec
```bash
node C:/ECalc/active/energen-md-formatter/cli/generate-pdf.js \
  -i "spec.md" \
  -o "spec.pdf" \
  --template "energen-minimal" \
  --tier "compact"
```

## Templates

- `energen-default`: Full header/footer with branding
- `energen-minimal`: Footer-only branding
- `energen-formal`: Cover page + TOC + branding
- `plain`: No branding

## Tiers

- `compact`: 9pt body, dense layout (technical docs)
- `standard`: 11pt body, balanced (business docs)
- `comfortable`: 12pt body, generous spacing (executive summaries)
- `presentation`: 14pt body, extra spacing (presentations)

## Setup Required

**CLI tools need to be created first!** See SKILL.md for implementation details.

```bash
cd C:/ECalc/active/energen-md-formatter
mkdir cli
# Create generate-pdf.js and batch-generate.js
npm install yargs  # Required for CLI parsing
```

## Integration with Other Skills

This skill works great with:
- **energen-rfp-evaluator**: Convert evaluation markdown to PDF
- **energen-code-investigator**: Format code documentation

## Project Location

`C:/ECalc/active/energen-md-formatter`
