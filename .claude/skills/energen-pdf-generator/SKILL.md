---
skill_name: energen-pdf-generator
description: Generate professionally formatted, brand-compliant PDF documents from Markdown using bundled CLI wrappers
version: 1.1.0
author: Energen Systems Inc.
created: 2025-10-17
updated: 2025-10-18
tags: [pdf, markdown, formatting, branding, documents]
---

# Energen PDF Generator Skill

Convert Markdown content to professionally formatted PDF documents with Energen branding and scalable formatting tiers.

## Purpose

This skill provides **bundled CLI wrapper scripts** for the Energen Markdown-to-PDF Formatter, enabling:
- Conversion of Markdown files to branded PDF documents
- Selection of 4 scaling tiers (Compact, Standard, Comfortable, Presentation)
- Application of 4 document templates (Default, Minimal, Formal, Plain)
- Batch processing of multiple files
- Brand-compliant output with Energen colors, logos, and contact information

## Use Cases

1. **RFP Response Generation**: Convert RFP evaluation markdown to professional PDFs
2. **Technical Documentation**: Generate compact technical docs from markdown
3. **Executive Summaries**: Create comfortable-tier executive summaries
4. **Presentations**: Format presentation materials with large fonts
5. **Batch Processing**: Convert multiple markdown files simultaneously

## Quick Start

### Generate Single PDF

```bash
# From project root
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "document.md" \
  --output "document.pdf" \
  --template "energen-default" \
  --tier "standard"
```

### Batch Generate PDFs

```bash
# From project root
node .claude/skills/energen-pdf-generator/scripts/batch-generate.cjs \
  --input "docs/" \
  --output "docs/pdf/" \
  --template "energen-minimal" \
  --tier "comfortable"
```

### Show Help

```bash
# Single PDF help
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs

# Batch PDF help
node .claude/skills/energen-pdf-generator/scripts/batch-generate.cjs
```

## Bundled Scripts

The skill includes two wrapper scripts that validate the external project and provide clear error messages:

### 1. `scripts/generate-pdf.cjs`
- Generates single PDF from markdown
- Validates energen-md-formatter availability
- Shows usage instructions
- Provides clear error feedback

### 2. `scripts/batch-generate.cjs`
- Batch processes entire directories
- Creates output directory if needed
- Shows progress for each file
- Reports summary statistics

## External Project Location

**Path**: `C:/ECalc/active/energen-md-formatter`

**Note:** The wrapper scripts automatically check if this project exists and provide setup instructions if not.

## Scaling Tiers

| Tier | Body Size | Use Case | Margins | Line Height |
|------|-----------|----------|---------|-------------|
| **compact** | 9pt | Dense technical docs | 36pt (0.5") | 1.3 |
| **standard** | 11pt | General business docs | 54pt (0.75") | 1.5 |
| **comfortable** | 12pt | Executive summaries | 72pt (1") | 1.6 |
| **presentation** | 14pt | Presentations, training | 90pt (1.25") | 1.8 |

## Document Templates

| Template | Description | Features |
|----------|-------------|----------|
| **energen-default** | Full branding | Header + Footer + TOC |
| **energen-minimal** | Clean with branding | Footer only |
| **energen-formal** | Complete formal | Cover + Header + Footer + TOC |
| **plain** | No branding | Content only |

## Supported Markdown Features

- Headers (H1-H6)
- Lists (ordered, unordered, nested)
- Tables with auto-sizing
- Code blocks with syntax highlighting
- Images with captions
- Links and references
- Block quotes
- Horizontal rules
- Custom attributes
- Auto-generated table of contents

## Usage Examples

### Example 1: Generate RFP Evaluation PDF

```bash
# After RFP evaluation completes, convert markdown to PDF
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "output/rfp-evaluations/P2540009/executive-summary.md" \
  --output "output/rfp-evaluations/P2540009/executive-summary.pdf" \
  --template "energen-formal" \
  --tier "comfortable"
```

### Example 2: Batch Convert Documentation

```bash
# Convert all markdown docs in a folder
node .claude/skills/energen-pdf-generator/scripts/batch-generate.cjs \
  --input "docs/" \
  --output "docs/pdf/" \
  --template "energen-default" \
  --tier "standard"
```

### Example 3: Generate Compact Technical Specification

```bash
# Create compact technical doc
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "tech-spec.md" \
  --output "tech-spec.pdf" \
  --template "energen-minimal" \
  --tier "compact"
```

### Example 4: Presentation Materials

```bash
# Generate presentation-tier PDFs
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "training.md" \
  --output "training.pdf" \
  --template "energen-default" \
  --tier "presentation"
```

## Integration with Other Skills

### With energen-rfp-evaluator

```bash
# 1. Use RFP evaluator to generate markdown
# (generates executive-summary.md, compliance-checklist.md, etc.)

# 2. Convert markdown to branded PDF
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "output/rfp-evaluations/P2540009/executive-summary.md" \
  --output "output/rfp-evaluations/P2540009/executive-summary.pdf" \
  --tier "comfortable"
```

### With energen-code-investigator

```bash
# 1. Use code investigator to generate analysis report (markdown)

# 2. Convert to compact technical PDF
node .claude/skills/energen-pdf-generator/scripts/generate-pdf.cjs \
  --input "analysis-report.md" \
  --output "analysis-report.pdf" \
  --tier "compact" \
  --template "energen-minimal"
```

## Troubleshooting

### Error: "Energen MD Formatter not found"

**Cause:** External project not available at `C:/ECalc/active/energen-md-formatter`

**Solutions:**
1. Clone/download the energen-md-formatter project
2. Place it at the expected location
3. Or update `MD_FORMATTER_PATH` in the wrapper scripts

### Error: "CLI tool not found"

**Cause:** External project not set up (npm packages not installed)

**Solution:**
```bash
cd C:/ECalc/active/energen-md-formatter
npm install
```

### Error: "Permission denied"

**Cause:** Output directory not writable

**Solution:**
- Ensure output directory exists and is writable
- Check file permissions
- Run with appropriate user permissions

### Error: "PDFKit error" or "Module not found"

**Cause:** Missing dependencies in external project

**Solution:**
```bash
cd C:/ECalc/active/energen-md-formatter
npm install
npm run lint
npm test
```

### Error: "Template not found"

**Cause:** Invalid template name or template configuration missing

**Solution:**
- Verify template name: `energen-default`, `energen-minimal`, `energen-formal`, or `plain`
- Check `C:/ECalc/active/energen-md-formatter/src/config/templates.json`

## Configuration

### Brand Settings
Edit: `C:/ECalc/active/energen-md-formatter/src/config/default-settings.json`
- Company name, tagline
- Contact information
- Logo path
- Brand colors

### Scaling Rules
Edit: `C:/ECalc/active/energen-md-formatter/src/config/scaling-rules.json`
- Font sizes for each tier
- Margins, spacing
- Header/footer dimensions

### Templates
Edit: `C:/ECalc/active/energen-md-formatter/src/config/templates.json`
- Template configurations
- Header/footer settings
- Cover page options

## Technology Stack (External Project)

- **Frontend**: React 18, TailwindCSS, Zustand
- **PDF Engine**: PDFKit
- **Markdown Parser**: Markdown-it + plugins
- **Desktop**: Electron
- **Build Tool**: Vite

## Related Skills

- **energen-rfp-evaluator**: Generate RFP evaluations (outputs markdown for this skill)
- **energen-code-investigator**: Generate code documentation (can be formatted with this skill)
- **energen-bug-reporter**: Generate bug reports (can be formatted with this skill)

## Support

**Wrapper Scripts**: See `.claude/skills/energen-pdf-generator/scripts/`
**External Project**: See `C:/ECalc/active/energen-md-formatter/README.md`
**Developer Guide**: See `C:/ECalc/active/energen-md-formatter/DEVELOPMENT.md`
**Template System**: See `C:/ECalc/active/energen-md-formatter/TEMPLATE_SYSTEM_README.md`

---

## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added bundled wrapper scripts (generate-pdf.cjs, batch-generate.cjs)
- ✅ Scripts validate external project availability
- ✅ Added comprehensive usage examples
- ✅ Improved error handling with clear feedback
- ✅ Added integration examples with other skills
- ✅ Enhanced troubleshooting section

### v1.0.0 (2025-10-17)
- Initial release with external project documentation
- Documented CLI tools and usage patterns
- Defined scaling tiers and templates

---

*This skill provides bundled CLI wrappers for the Energen MD Formatter, enabling automated PDF generation workflows from Claude Code.*
