# RFP Automated Form Filler

Complete automation for filling RFP submission forms with company data and bid pricing.

## Overview

The RFP Form Filler automatically:
1. **Discovers** fillable forms in RFP packages (Excel pricing sheets, Word reference forms)
2. **Extracts** form structure (fillable cells, field locations, data types)
3. **Fills** forms with company data and bid pricing
4. **Adds** digital signatures to submission documents
5. **Validates** filled forms for errors
6. **Generates** submission-ready documents

## Quick Start

### 1. Set Up Company Data

Copy the template and fill in your company information:

```bash
cp .claude/skills/energen-rfp-evaluator/data/company-data-template.json \
   .claude/skills/energen-rfp-evaluator/data/company-data.json
```

Edit `company-data.json` with:
- Company legal name, address, contact info
- License numbers (C-10, C-38, etc.)
- Insurance policy details
- Project references
- Key personnel information
- Signature image paths

### 2. Install Dependencies

```bash
cd .claude/skills/energen-rfp-evaluator
npm install
```

Required packages:
- `exceljs` - Excel file manipulation
- `mammoth` - Word document conversion
- `sharp` - Image processing for signatures
- `docx` - Word document generation

### 3. Run Form Filler

```bash
node scripts/fill-rfp-forms.cjs "C:/path/to/RFP-evaluation-directory"
```

Or with custom company data:

```bash
node scripts/fill-rfp-forms.cjs "C:/path/to/RFP" "C:/path/to/company-data.json"
```

## How It Works

### Phase 1: Form Discovery

**FormExtractor** scans RFP directory for fillable forms:

- **Excel files**: Identifies cells with orange/yellow highlighting
- **Word files**: Detects underlines, placeholders `[TEXT]`, signature blocks
- **PDF files**: Identifies form fields (future implementation)

Example output:
```
🔍 Scanning for fillable forms...
   ✅ Excel form: 5-Offerors Pricing.xlsx (150 fillable cells)
   ✅ Word form: 6-Offerors References.docx (15 fillable fields)
   ✅ Word form: 7-Rep Cert Form.docx (25 fillable fields)
```

### Phase 2: Excel Pricing Sheet Filling

**ExcelFormFiller** fills pricing sheets with:

1. **Company Information**:
   - Legal name, address, DUNS number, CAGE code
   - Contact information, licenses

2. **Pricing Data**:
   - Per-unit pricing for each generator
   - Base year + option years pricing
   - Labor rates (regular, overtime, emergency)
   - Materials markup percentages

3. **Formula Preservation**:
   - Detects existing formulas
   - Only fills input cells (not calculated cells)
   - Preserves total calculations

Example:
```javascript
// Automatically maps generators to pricing rows
const generator = bidData.generators.find(g => g.unitNumber === 'EG 068');

// Fills pricing across years
worksheet.getCell('D15').value = generator.pricing.baseYear;      // $2,500
worksheet.getCell('E15').value = generator.pricing.optionYear1;   // $2,550
worksheet.getCell('F15').value = generator.pricing.optionYear2;   // $2,600
```

### Phase 3: Word Form Filling

**WordFormFiller** fills reference and certification forms:

1. **Reference Forms**:
   - Pulls from `companyData.projectReferences[]`
   - Fills client name, contact info, project details
   - Formats project value, dates, services provided

2. **Certification Forms**:
   - License numbers and expiration dates
   - Insurance coverage amounts
   - NFPA 70E certifications
   - Manufacturer authorizations

3. **Signature Blocks**:
   - Authorized representative name and title
   - Date of signature
   - Embedded signature image (if available)

### Phase 4: Digital Signatures

**SignatureManager** adds signatures to documents:

1. **Excel Signatures**:
   - Embeds PNG image at specified cell
   - Adds signer name, title, date below image

2. **Word Signatures**:
   - Converts image to base64
   - Embeds in HTML at signature placeholders
   - Creates formatted signature block

3. **Signature Generation** (fallback):
   - Generates signature image from text if no image available
   - Uses cursive font rendering
   - Saves as PNG for reuse

## Company Data Schema

### Required Sections

#### Company Information
```json
{
  "companyInfo": {
    "legalName": "Energen Systems, Inc.",
    "address": {
      "street": "123 Generator Lane",
      "city": "San Diego",
      "state": "CA",
      "zip": "92101"
    },
    "phone": "(619) 555-1234",
    "email": "info@energensystems.com",
    "dunsNumber": "123456789",
    "cageCode": "1ABC2"
  }
}
```

#### Licenses
```json
{
  "licenses": {
    "california": {
      "c10Electrical": {
        "number": "C10-123456",
        "expirationDate": "2026-12-31",
        "holderName": "John Smith"
      }
    }
  }
}
```

#### Insurance
```json
{
  "insurance": {
    "generalLiability": {
      "carrier": "XYZ Insurance",
      "policyNumber": "GL-123456",
      "expirationDate": "2026-12-31",
      "coveragePerOccurrence": 1000000,
      "coverageAggregate": 2000000
    }
  }
}
```

#### Project References
```json
{
  "projectReferences": [
    {
      "clientName": "University of California",
      "contactName": "Jane Doe",
      "contactTitle": "Facilities Manager",
      "contactPhone": "(510) 555-1234",
      "contactEmail": "jane.doe@university.edu",
      "projectDescription": "Annual PM for 25 emergency generators",
      "contractValue": 150000,
      "startDate": "2022-01-01",
      "endDate": "2024-12-31",
      "servicesProvided": ["Annual PM", "Emergency Service", "Load Bank Testing"],
      "numberOfGenerators": 25,
      "kwRange": "100-500 kW"
    }
  ]
}
```

#### Signatures
```json
{
  "signatures": {
    "authorizedRepresentative": {
      "name": "John Smith",
      "title": "President",
      "signatureImagePath": "C:/Energen/signatures/john-smith-signature.png",
      "email": "jsmith@energensystems.com",
      "phone": "(619) 555-1234"
    }
  }
}
```

#### Pricing (Labor Rates)
```json
{
  "pricing": {
    "laborRates": {
      "regularTime": {
        "journeymanElectrician": 125.00,
        "masterElectrician": 145.00
      },
      "overtime": {
        "multiplier": 1.5
      },
      "emergency": {
        "multiplier": 2.0
      }
    },
    "materialsMarkup": 15
  }
}
```

## Output Files

All filled forms are saved to `<rfp-directory>/filled-forms/`:

```
filled-forms/
├── FILLED-5-Offerors Pricing.xlsx
├── FILLED-6-Offerors References.docx.html  (convert to DOCX)
├── FILLED-7-Rep Cert Form.docx.html        (convert to DOCX)
└── SUBMISSION-PACKAGE-README.md
```

### Submission Package README

Generated checklist includes:
- ✅ All filled forms listed
- ✅ Company information summary
- ✅ Authorized representative details
- ☐ Pre-submission checklist (review, verify, convert files)

## Converting HTML to DOCX

Word forms are initially saved as HTML to preserve content. Convert to DOCX:

### Option 1: LibreOffice (Recommended)
```bash
soffice --headless --convert-to docx --outdir ./filled-forms ./filled-forms/*.html
```

### Option 2: Microsoft Word
1. Open HTML file in Word
2. File → Save As → Word Document (.docx)

### Option 3: Online Converters
- CloudConvert.com
- OnlineConvert.com

## Validation

The tool automatically validates filled forms:

### Excel Validation
- ✅ Formula errors detected
- ✅ Empty required cells identified
- ✅ Data type mismatches flagged

Example output:
```
   ⚠️  Validation warnings:
      - Sheet1!D15: Highlighted cell still empty
      - Sheet2!F20: Formula error: #REF!
```

### Signature Validation
```bash
const validation = await signatureManager.validateSignatures();
// Checks:
// - Signature images exist
// - Images are valid PNG/JPG
// - Minimum size requirements met
```

## Advanced Usage

### Custom Form Templates

If RFP has unique form structure:

```javascript
const extractor = new FormExtractor();

// Override fillable color detection
extractor.fillableColors.customBlue = 'FF0000FF';

// Discover forms
const forms = await extractor.discoverForms(rfpDir);
```

### Custom Field Mapping

For Word forms with non-standard placeholders:

```javascript
const wordFiller = new WordFormFiller(companyData);

// Add custom replacements
const customReplacements = {
  '[CONTRACTOR_LICENSE]': companyData.licenses.california.c10Electrical.number,
  '[INSURANCE_EXPIRES]': companyData.insurance.generalLiability.expirationDate
};

// Fill form with custom mapping
await wordFiller.fillForm(formMetadata, { ...bidData, customReplacements }, outputPath);
```

### Programmatic Usage

Use as library in other scripts:

```javascript
const { FormExtractor, ExcelFormFiller, SignatureManager } = require('.claude/skills/energen-rfp-evaluator/lib');

const companyData = require('./company-data.json');
const bidData = require('./bid-scope-package/rfp-bid-scope.json');

// Discover forms
const extractor = new FormExtractor();
const forms = await extractor.discoverForms('./rfp-directory');

// Fill Excel pricing
const excelFiller = new ExcelFormFiller(companyData);
for (const form of forms.excel) {
  await excelFiller.fillPricingForm(form, bidData, `./output/${form.fileName}`);
}
```

## Troubleshooting

### "No fillable forms found"

**Possible causes:**
- Excel cells don't have orange/yellow highlighting
- Word forms use different placeholder format
- Files are in subdirectory not scanned

**Solution:**
- Manually identify fillable cells
- Add custom color codes to FormExtractor
- Specify correct directory path

### "Company data file not found"

**Cause:** Missing `company-data.json`

**Solution:**
```bash
cp data/company-data-template.json data/company-data.json
# Then edit with your company info
```

### "Signature image not found"

**Cause:** Invalid path in `signatures.signatureImagePath`

**Solution:**
1. Use absolute paths: `C:/Energen/signatures/signature.png`
2. Or generate signature from text:
```javascript
const signatureManager = new SignatureManager(companyData);
await signatureManager.generateSignatureFromText(
  "John Smith",
  "C:/Energen/signatures/john-smith.png"
);
```

### Excel formulas showing errors

**Cause:** Filled cell is referenced by formula, but value type is wrong

**Solution:**
- Ensure pricing values are numbers, not strings
- Check currency formatting is applied
- Verify formula cell references are correct

## Integration with RFP Evaluator

The form filler integrates with existing RFP evaluation workflow:

### Complete Workflow:

1. **Evaluate RFP** (existing):
   ```bash
   node scripts/evaluate-rfp.cjs "C:/path/to/RFP"
   ```
   Output: `full-evaluation-comprehensive.json`

2. **Generate Bid Scope** (existing):
   ```bash
   node scripts/generate-rfp-bid-scope.cjs "C:/path/to/RFP"
   ```
   Output: `bid-scope-package/rfp-bid-scope.json`

3. **Calculate Pricing** (manual or via v5.0 calculator):
   - Import generators to calculator
   - Apply labor multipliers
   - Generate per-unit pricing
   - Export pricing data

4. **Fill Forms** (NEW):
   ```bash
   node scripts/fill-rfp-forms.cjs "C:/path/to/RFP"
   ```
   Output: `filled-forms/FILLED-*.xlsx`, `FILLED-*.html`

5. **Review and Submit**:
   - Open filled forms
   - Verify accuracy
   - Convert HTML to DOCX
   - Package per RFP requirements
   - Submit before deadline

## Security Considerations

### Signature Images
- Store signature images securely (encrypted drive recommended)
- Use access controls on company-data.json
- Never commit signatures to version control
- Consider watermarking signatures for traceability

### Company Data
- Limit access to `company-data.json`
- Store outside of project directory if sharing code
- Use environment variables for sensitive paths
- Encrypt at rest if storing on shared systems

### Form Validation
- Always manually review filled forms before submission
- Verify pricing calculations independently
- Check signature placement and quality
- Confirm all required fields are filled

## Future Enhancements

- [ ] PDF form filling support
- [ ] Multi-signature workflows (technical rep + authorized rep)
- [ ] Form field auto-detection using OCR
- [ ] Template library for common RFP forms
- [ ] Integration with Zoho CRM for company data sync
- [ ] Batch processing for multiple RFPs
- [ ] Digital signature with encryption (DocuSign/Adobe Sign)
- [ ] Form diff tool (compare filled vs. original)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review company-data-template.json for schema
3. Check FORM_FILLER_DESIGN.md for architecture details
4. Review code comments in lib/*.cjs files

## License

Proprietary - Energen Systems, Inc.
