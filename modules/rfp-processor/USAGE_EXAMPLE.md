# DocumentSplitter Usage Guide

## Overview
The DocumentSplitter service provides comprehensive PDF processing capabilities for analyzing, classifying, and splitting RFP/RFQ documents into manageable sections.

## Installation
Dependencies are already installed:
- `pdf-lib` - PDF manipulation
- `pdf-parse` - Text extraction

## Basic Usage

### 1. Simple Analysis
```javascript
const DocumentSplitter = require('./DocumentSplitter.cjs');

const splitter = new DocumentSplitter();

// Analyze a PDF document
const result = await splitter.analyzePDF('path/to/document.pdf');

console.log('Document Type:', result.classification.type);
console.log('Confidence:', result.classification.confidence + '%');
console.log('Sections Found:', result.sections.length);
```

### 2. Complete Workflow (Analyze + Split)
```javascript
const splitter = new DocumentSplitter();

// Analyze and split in one call
const result = await splitter.processAndSplit('path/to/rfp-document.pdf');

console.log('Classification:', result.classification.type);
console.log('Split Files Created:', result.sections.length);

result.sections.forEach((section, idx) => {
  console.log(`${idx + 1}. ${section.title}`);
  console.log(`   Pages: ${section.startPage}-${section.endPage}`);
  console.log(`   Output: ${section.outputPath}`);
});
```

### 3. Extract Specific Pages
```javascript
const splitter = new DocumentSplitter();

// Extract pages 10-20 to a new PDF
await splitter.extractPages(
  'input.pdf',
  10,  // start page
  20,  // end page
  'output/pages-10-20.pdf'
);
```

### 4. Custom Configuration
```javascript
const splitter = new DocumentSplitter({
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxPages: 1000,
  logLevel: 'debug',
  outputDir: '/custom/output/path',
});
```

## API Reference

### Methods

#### `loadPDF(pdfPath)`
Loads a PDF document using pdf-lib.
- **Returns:** `Promise<PDFDocument>`
- **Throws:** Error if file too large or corrupted

#### `extractMetadata(pdfDoc)`
Extracts metadata from loaded PDF.
- **Returns:** `Promise<Object>` with title, author, pages, dates, etc.

#### `extractText(pdfPath)`
Extracts all text from PDF.
- **Returns:** `Promise<Object>` with text, page count, metadata

#### `classifyDocument(text, metadata)`
Classifies document type (RFP, RFQ, IFB, etc.).
- **Returns:** `Object` with type, confidence, score

#### `identifySections(text, pageCount)`
Identifies document sections.
- **Returns:** `Promise<Array>` of section objects

#### `splitBySections(pdfPath, sections)`
Splits PDF into separate files by sections.
- **Returns:** `Promise<Array>` of sections with output paths

#### `extractPages(pdfPath, startPage, endPage, outputPath)`
Extracts specific page range to new PDF.
- **Returns:** `Promise<void>`

#### `analyzePDF(pdfPath)`
Complete analysis workflow.
- **Returns:** `Promise<Object>` with all analysis results

#### `processAndSplit(pdfPath)`
Complete workflow: analyze and split.
- **Returns:** `Promise<Object>` with analysis + split results

## Output Structure

### Analysis Result
```javascript
{
  metadata: {
    title: 'Request for Proposal...',
    author: 'Agency Name',
    pages: 50,
    size: 2048000,
    creationDate: '2025-01-15T...',
    modificationDate: '2025-01-20T...'
  },
  classification: {
    type: 'RFP',
    confidence: 85,
    score: 42
  },
  sections: [
    {
      title: 'TABLE OF CONTENTS',
      type: 'tableOfContents',
      startPage: 2,
      endPage: 3,
      pageCount: 2,
      outputPath: '/path/to/output/doc_tableOfContents_p2-3_123456.pdf'
    },
    // ... more sections
  ],
  textExtracted: true,
  textLength: 45000,
  processingTime: 523,
  success: true,
  splitComplete: true  // Only in processAndSplit
}
```

## Document Classification

Supported document types:
- **RFP** - Request for Proposal
- **RFQ** - Request for Quote
- **IFB** - Invitation for Bid
- **RFI** - Request for Information
- **SOW** - Statement of Work

## Section Types Detected

- Cover Page
- Table of Contents
- Instructions to Bidders
- Technical Specifications
- Bid Forms / Price Sheets
- Terms and Conditions
- Insurance Requirements
- Certifications
- Attachments / Exhibits

## Error Handling

```javascript
try {
  const result = await splitter.analyzePDF('document.pdf');
  
  if (!result.success) {
    console.error('Analysis failed:', result.error);
  }
  
  // Check for section extraction errors
  result.sections.forEach(section => {
    if (section.error) {
      console.error(`Section ${section.title} failed: ${section.error}`);
    }
  });
  
} catch (error) {
  console.error('Fatal error:', error.message);
}
```

## Configuration Options

### File Limits
- `maxFileSize`: Maximum PDF size (default: 50MB)
- `maxPages`: Maximum page count (default: 500)
- `processingTimeout`: Timeout in ms (default: 120000)

### Paths
- `tempDir`: Temporary file storage
- `outputDir`: Split PDF output location
- `logFile`: Log file path

### Logging
- `logLevel`: 'debug', 'info', 'warn', 'error' (default: 'info')
- `logToFile`: Enable file logging (default: true)

## Integration Example

```javascript
// In your RFP processing workflow
const DocumentSplitter = require('./modules/rfp-processor/DocumentSplitter.cjs');

async function processRFPDocument(uploadedFilePath) {
  const splitter = new DocumentSplitter();
  
  // Step 1: Analyze and split
  const result = await splitter.processAndSplit(uploadedFilePath);
  
  if (!result.success) {
    throw new Error(`Document processing failed: ${result.error}`);
  }
  
  // Step 2: Process each section separately
  for (const section of result.sections) {
    if (section.type === 'bidForm') {
      // Extract bid form data with AI
      await processBidForm(section.outputPath);
    } else if (section.type === 'specifications') {
      // Extract technical requirements
      await extractSpecifications(section.outputPath);
    }
  }
  
  return {
    documentType: result.classification.type,
    sectionsProcessed: result.sections.length,
    sections: result.sections.map(s => ({
      title: s.title,
      type: s.type,
      pages: s.pageCount,
      path: s.outputPath
    }))
  };
}
```

## Performance

- PDF Loading: ~5-50ms depending on file size
- Text Extraction: ~10-200ms depending on page count
- Section Identification: ~5-20ms
- PDF Splitting: ~5ms per section
- **Total Processing**: Typically 50-500ms for documents under 100 pages

## Testing

Run the included test suite:
```bash
node modules/rfp-processor/test-document-splitter.cjs
```

This will:
1. Create a sample RFP PDF
2. Test all functionality
3. Generate split PDFs in `output/rfp-splits/`

## Next Phase Features (Phase 2)

- OCR for scanned documents
- Image extraction from PDFs
- Table detection and extraction
- Form field recognition
- Multi-document ZIP processing
- Enhanced section classification using AI
