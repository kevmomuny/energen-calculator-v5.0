# RFP AUTOMATED FORM FILLER - DESIGN & IMPLEMENTATION PLAN

**Purpose:** Extract sample forms from RFP packages, fill them with Energen company data and bid pricing, add signatures, generate submission-ready documents.

**Status:** Planning Phase
**Created:** 2025-10-23

---

## 1. FORMS DISCOVERED IN ANR-6-2025 RFP

### Excel Forms (Pricing)
**File:** `5-Offerors Pricing.xlsx`
- **Structure:** 72 rows × 13 columns
- **Fillable Cells:** ~150 cells with orange highlighting
- **Content:**
  - Supplier name and date (header)
  - Per-unit pricing for 39 generators (rows 12-51)
  - Years 1 & 2 pricing + 3 option years (columns)
  - Unit of measure: EA/Year (each per year)
  - Sections: Annual PM, ADD ALT (ATS Testing), T&M labor rates, materials markup

### Word Forms (Certifications & References)
**File:** `6-Offeror's References.docx`
- Previous project references
- Customer contact information
- Project descriptions and values

**File:** `7-Rep Cert Form.docx`
- Representations and certifications
- Legal entity information
- Tax ID, DUNS, SAM registration
- Compliance certifications

---

## 2. REQUIRED DATA SOURCES

### Company Master Data (Static - Rarely Changes)
```json
{
  "companyInfo": {
    "legalName": "Energen Systems, Inc.",
    "dba": "Energen",
    "address": {
      "street": "123 Main Street",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    },
    "taxId": "XX-XXXXXXX",
    "dunsNumber": "XXXXXXXXX",
    "cageCode": "XXXXX",
    "samRegistration": {
      "status": "Active",
      "expirationDate": "2026-01-15"
    },
    "licenses": [
      {
        "type": "C-10 Electrical Contractor",
        "number": "XXXXXX",
        "state": "CA",
        "expirationDate": "2026-06-30"
      }
    ],
    "insurance": {
      "generalLiability": {
        "carrier": "ABC Insurance",
        "policyNumber": "GL-XXXXX",
        "coverage": "$2,000,000 per occurrence",
        "expiration": "2026-03-01"
      },
      "workersComp": {
        "carrier": "XYZ Insurance",
        "policyNumber": "WC-XXXXX",
        "expiration": "2026-03-01"
      }
    },
    "contacts": {
      "ceo": {
        "name": "John Smith",
        "title": "CEO",
        "email": "jsmith@energen.com",
        "phone": "(555) 123-4567"
      },
      "proposalContact": {
        "name": "Jane Doe",
        "title": "Proposal Manager",
        "email": "jdoe@energen.com",
        "phone": "(555) 123-4568"
      }
    },
    "signatures": {
      "ceo": {
        "imageFile": "signatures/ceo-signature.png",
        "name": "John Smith",
        "title": "Chief Executive Officer",
        "dateFormat": "auto"
      },
      "proposalManager": {
        "imageFile": "signatures/proposal-mgr-signature.png",
        "name": "Jane Doe",
        "title": "Proposal Manager",
        "dateFormat": "auto"
      }
    }
  },
  "references": [
    {
      "customerName": "City of Oakland",
      "contactName": "Bob Johnson",
      "contactTitle": "Facilities Manager",
      "contactPhone": "(510) 555-1234",
      "contactEmail": "bjohnson@oaklandca.gov",
      "projectName": "Municipal Generator Maintenance",
      "projectValue": "$450,000",
      "projectDuration": "2022-2024",
      "projectDescription": "Annual PM services for 25 generators at city facilities",
      "unitsServiced": 25
    },
    {
      "customerName": "UC Berkeley",
      "contactName": "Sarah Chen",
      "contactTitle": "Energy Manager",
      "contactPhone": "(510) 555-5678",
      "contactEmail": "schen@berkeley.edu",
      "projectName": "Campus Emergency Power Systems Maintenance",
      "projectValue": "$380,000",
      "projectDuration": "2021-2023",
      "projectDescription": "Preventative maintenance and emergency service for campus backup generators",
      "unitsServiced": 18
    },
    {
      "customerName": "Stanford Medical Center",
      "contactName": "Mike Williams",
      "contactTitle": "Director of Facilities",
      "contactPhone": "(650) 555-9012",
      "contactEmail": "mwilliams@stanfordmed.org",
      "projectName": "Hospital Critical Power Maintenance",
      "projectValue": "$620,000",
      "projectDuration": "2020-2024",
      "projectDescription": "24/7 emergency service and quarterly maintenance for medical center generators",
      "unitsServiced": 32
    }
  ]
}
```

### Bid-Specific Data (Dynamic - Per RFP)
```json
{
  "bidData": {
    "rfpNumber": "ANR-6-2025",
    "submissionDate": "2025-11-15",
    "pricing": {
      "annualPM": {
        "byKwRange": {
          "20-30kW": 5960,
          "80-150kW": 7297,
          "151-350kW": 8634,
          "351-500kW": 10271,
          "1300kW": 13245
        }
      },
      "addAlternate": {
        "atsTest": {
          "byKwRange": {
            "20-30kW": 450,
            "80-150kW": 600,
            "151-350kW": 750,
            "351-500kW": 900,
            "1300kW": 1200
          }
        }
      },
      "laborRates": {
        "regularHours": 191,
        "afterHours": 286.50,
        "weekendHoliday": 382,
        "emergencyCallout": 500
      },
      "materialsMarkup": 1.20,
      "escalation": {
        "optionYear3": 1.03,
        "optionYear4": 1.03,
        "optionYear5": 1.03
      }
    },
    "equipmentList": [
      {
        "unitNumber": "02 EG 068",
        "kw": 300,
        "kwRange": "151-350kW",
        "annualPMPrice": 8634,
        "atsTestPrice": 750
      }
      // ... 38 more units
    ]
  }
}
```

---

## 3. TOOL ARCHITECTURE

### Components

#### A. Form Extractor
**Purpose:** Identify and catalog fillable forms in RFP package

**Inputs:**
- RFP directory path
- RFP evaluation JSON (from existing skill)

**Outputs:**
- Form inventory JSON:
```json
{
  "forms": [
    {
      "filename": "5-Offerors Pricing.xlsx",
      "type": "excel",
      "purpose": "pricing",
      "fillableFields": 150,
      "structure": {
        "sheets": ["Pricing"],
        "highlightedCells": ["A5", "A6", "C13:C51", "F13:F51", ...],
        "formulaCells": ["C52", "F52", ...]
      }
    },
    {
      "filename": "6-Offeror's References.docx",
      "type": "word",
      "purpose": "references",
      "fillableFields": "detected",
      "structure": {
        "paragraphs": 45,
        "tables": 1,
        "formFields": ["company_name", "reference_1_contact", ...]
      }
    }
  ]
}
```

**Implementation:**
```javascript
class FormExtractor {
    async extractForms(rfpDir) {
        const forms = [];

        // Find Excel files with "pricing" or "price" in name
        const excelFiles = await glob('**/*(price|pricing)*.xlsx', {cwd: rfpDir});
        for (const file of excelFiles) {
            forms.push(await this.analyzeExcelForm(file));
        }

        // Find Word files with "reference", "cert", "rep" in name
        const wordFiles = await glob('**/*(reference|cert|rep)*.docx', {cwd: rfpDir});
        for (const file of wordFiles) {
            forms.push(await this.analyzeWordForm(file));
        }

        return {forms, extractedAt: new Date().toISOString()};
    }

    async analyzeExcelForm(file) {
        // Load workbook
        // Identify highlighted cells (fillable)
        // Identify formula cells (calculated)
        // Map cell purpose by proximity to labels
        // Return structure
    }

    async analyzeWordForm(file) {
        // Unpack OOXML
        // Find form fields, content controls, highlighted text
        // Identify tables and their purpose
        // Return structure
    }
}
```

#### B. Form Filler Engine
**Purpose:** Fill forms with company and bid data

**Inputs:**
- Form inventory (from extractor)
- Company master data JSON
- Bid-specific data JSON
- RFP bid scope (from existing skill)

**Outputs:**
- Filled forms ready for signature and submission

**Implementation:**
```javascript
class FormFiller {
    constructor(companyData, bidData) {
        this.company = companyData;
        this.bid = bidData;
        this.fillStrategies = {
            'excel': new ExcelFillStrategy(),
            'word': new WordFillStrategy(),
            'pdf': new PDFFillStrategy()
        };
    }

    async fillAllForms(formInventory, outputDir) {
        const filledForms = [];

        for (const form of formInventory.forms) {
            const strategy = this.fillStrategies[form.type];
            const filled = await strategy.fill(form, this.company, this.bid);
            filledForms.push(filled);
        }

        return filledForms;
    }
}

class ExcelFillStrategy {
    async fill(formInfo, companyData, bidData) {
        const wb = loadWorkbook(formInfo.filename);
        const sheet = wb.active;

        // Fill company info
        this.fillCell(sheet, 'A5', companyData.companyInfo.legalName);
        this.fillCell(sheet, 'A6', new Date().toLocaleDateString());

        // Fill pricing for each generator
        for (const unit of bidData.equipmentList) {
            const row = this.findUnitRow(sheet, unit.unitNumber);

            // Years 1 & 2
            this.fillCell(sheet, `C${row}`, unit.annualPMPrice);

            // Option years with escalation
            this.fillCell(sheet, `F${row}`, unit.annualPMPrice * bidData.pricing.escalation.optionYear3);
            this.fillCell(sheet, `I${row}`, unit.annualPMPrice * bidData.pricing.escalation.optionYear4);
            this.fillCell(sheet, `L${row}`, unit.annualPMPrice * bidData.pricing.escalation.optionYear5);
        }

        // Fill T&M rates
        // Fill materials markup

        // Save filled workbook
        wb.save(outputPath);

        // Recalculate formulas
        await this.recalculateFormulas(outputPath);

        return {filename: outputPath, status: 'filled'};
    }

    async recalculateFormulas(excelFile) {
        // Use LibreOffice to recalculate all formulas
        execSync(`soffice --headless --convert-to xlsx:"Calc MS Excel 2007 XML" ${excelFile}`);
    }
}

class WordFillStrategy {
    async fill(formInfo, companyData, bidData) {
        // Unpack OOXML
        await unpackDocument(formInfo.filename, tempDir);

        // Load document with Document library
        const doc = new Document(path.join(tempDir, 'word/document.xml'));

        // Fill references table
        const refsTable = doc.get_node('//w:tbl[1]');
        for (let i = 0; i < companyData.references.length; i++) {
            const ref = companyData.references[i];
            const row = refsTable.rows[i + 1]; // Skip header

            this.fillCell(row.cells[0], ref.customerName);
            this.fillCell(row.cells[1], ref.contactName);
            this.fillCell(row.cells[2], ref.contactPhone);
            this.fillCell(row.cells[3], ref.projectValue);
            this.fillCell(row.cells[4], ref.projectDuration);
        }

        // Fill company info paragraphs
        this.findAndReplace(doc, '[COMPANY NAME]', companyData.companyInfo.legalName);
        this.findAndReplace(doc, '[TAX ID]', companyData.companyInfo.taxId);
        this.findAndReplace(doc, '[DUNS]', companyData.companyInfo.dunsNumber);

        // Save document
        doc.save();

        // Pack OOXML
        await packDocument(tempDir, outputPath);

        return {filename: outputPath, status: 'filled'};
    }
}
```

#### C. Signature Manager
**Purpose:** Add digital signatures to filled forms

**Inputs:**
- Filled forms
- Signature image files
- Signer information

**Outputs:**
- Signed documents ready for submission

**Implementation:**
```javascript
class SignatureManager {
    constructor(signatureConfig) {
        this.signatures = signatureConfig;
    }

    async signDocument(documentPath, signerRole) {
        const signer = this.signatures[signerRole];

        if (documentPath.endsWith('.docx')) {
            return await this.signWordDocument(documentPath, signer);
        } else if (documentPath.endsWith('.xlsx')) {
            return await this.signExcelDocument(documentPath, signer);
        } else if (documentPath.endsWith('.pdf')) {
            return await this.signPDFDocument(documentPath, signer);
        }
    }

    async signWordDocument(docPath, signer) {
        // Unpack OOXML
        // Find signature block (usually at end)
        // Insert signature image
        // Add name and title text
        // Add date
        // Pack OOXML

        const doc = new Document(docPath);
        const sigBlock = doc.get_node('//w:p[contains(., "Signature")]');

        // Insert image after signature line
        doc.insert_image_after(sigBlock, signer.imageFile);

        // Add typed name
        doc.insert_paragraph_after(sigBlock, signer.name);
        doc.insert_paragraph_after(sigBlock, signer.title);
        doc.insert_paragraph_after(sigBlock, new Date().toLocaleDateString());

        doc.save();
    }

    async signPDFDocument(pdfPath, signer) {
        // Use pdf-lib to add signature image to PDF
        const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        // Load signature image
        const sigImage = await pdfDoc.embedPng(fs.readFileSync(signer.imageFile));

        // Find signature location (look for "Signature:" text)
        // Place image
        lastPage.drawImage(sigImage, {
            x: signatureX,
            y: signatureY,
            width: 200,
            height: 50
        });

        // Add date
        lastPage.drawText(new Date().toLocaleDateString(), {
            x: dateX,
            y: dateY,
            size: 12
        });

        fs.writeFileSync(pdfPath, await pdfDoc.save());
    }
}
```

---

## 4. DATA FLOW

```
RFP Package (Folder)
    ↓
[Form Extractor] → Identifies all fillable forms
    ↓
Form Inventory JSON
    ↓
[Form Filler Engine] ← Company Master Data JSON
    ↓                  ← Bid-Specific Data JSON
    ↓                  ← Bid Scope JSON (from existing skill)
    ↓
Filled Forms (no signatures)
    ↓
[Signature Manager] ← Signature Config & Image Files
    ↓
Signed Forms (submission-ready)
    ↓
Submission Package
```

---

## 5. INTEGRATION WITH EXISTING SKILL

### Current RFP Evaluator Output
```json
{
  "bidScope": {...},
  "generators": [...],
  "pricing": {...},
  "costFactors": {...}
}
```

### Enhanced Output (Add Forms Section)
```json
{
  "bidScope": {...},
  "generators": [...],
  "pricing": {...},
  "costFactors": {...},
  "forms": {
    "inventory": {...},
    "filled": [...],
    "signed": [...],
    "submissionPackage": "path/to/package.zip"
  }
}
```

---

## 6. IMPLEMENTATION PHASES

### Phase 1: Company Data Repository
- [ ] Create company-data.json schema
- [ ] Build company data editor/validator
- [ ] Store signature image files
- [ ] Version control for company data

### Phase 2: Form Extractor
- [ ] Excel form analyzer (highlight detection)
- [ ] Word form analyzer (form fields, tables)
- [ ] PDF form analyzer (form fields)
- [ ] Form inventory JSON generator

### Phase 3: Form Filler - Excel
- [ ] Pricing sheet filler
- [ ] Formula preservation
- [ ] LibreOffice recalculation integration
- [ ] Validation (no #REF!, #DIV/0! errors)

### Phase 4: Form Filler - Word
- [ ] References form filler
- [ ] Certification form filler
- [ ] OOXML manipulation
- [ ] Table cell filling

### Phase 5: Signature Manager
- [ ] Word document signing
- [ ] PDF document signing
- [ ] Excel document signing (if needed)
- [ ] Date stamping

### Phase 6: Integration & Testing
- [ ] End-to-end workflow
- [ ] Error handling
- [ ] Validation and QA
- [ ] User documentation

---

## 7. USAGE WORKFLOW

```bash
# Step 1: Extract forms from RFP
node extract-rfp-forms.cjs "path/to/rfp-directory"
# Output: forms-inventory.json

# Step 2: Generate bid pricing (existing skill)
node generate-rfp-bid-scope.cjs "path/to/rfp-evaluation"
# Output: bid-scope-package/rfp-bid-scope.json

# Step 3: Fill forms with company data and bid pricing
node fill-rfp-forms.cjs \
  --forms forms-inventory.json \
  --company data/company-data.json \
  --bid bid-scope-package/rfp-bid-scope.json \
  --output filled-forms/
# Output: filled-forms/*.xlsx, *.docx

# Step 4: Add signatures
node sign-rfp-forms.cjs \
  --forms filled-forms/ \
  --signer ceo \
  --output signed-forms/
# Output: signed-forms/*.xlsx, *.docx, *.pdf

# Step 5: Create submission package
node create-submission-package.cjs \
  --forms signed-forms/ \
  --rfp ANR-6-2025 \
  --output ANR-6-2025-Energen-Submission.zip
# Output: ANR-6-2025-Energen-Submission.zip
```

---

## 8. TECHNICAL REQUIREMENTS

### Node.js Libraries
- `openpyxl` (via Python bridge) - Excel manipulation
- `docx` (python-docx via bridge) - Word manipulation
- `pdf-lib` - PDF manipulation
- `archiver` - ZIP creation

### Python Libraries
- `openpyxl` - Excel read/write
- `python-docx` - Word read/write
- `pypdf` / `reportlab` - PDF manipulation
- `Pillow` - Image processing for signatures

### External Tools
- `LibreOffice` - Formula recalculation
- `pandoc` - Document conversion
- `qpdf` - PDF manipulation

---

## 9. SECURITY CONSIDERATIONS

### Sensitive Data Protection
- Company tax ID, DUNS - store encrypted
- Signature images - restricted access
- Customer contact info - compliance with privacy laws
- Pricing data - mark as confidential

### Access Control
- Company data repository: Read-only for most users
- Signature files: Authorized signers only
- Filled forms: Project-specific access

---

## 10. NEXT STEPS

1. **Review with user:** Confirm approach and priorities
2. **Create company-data.json schema:** Define exact structure
3. **Gather Energen company data:** Collect real information
4. **Build Phase 1 (Company Data):** Repository and validator
5. **Build Phase 2 (Form Extractor):** Prototype on ANR-6-2025 forms
6. **Iterate based on real RFP forms**

---

**End of Design Document**
**Author:** Claude + User Collaboration
**Date:** 2025-10-23
