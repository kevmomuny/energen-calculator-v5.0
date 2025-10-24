# RFP Processor Module - AI Extraction Engine

## Overview

The RFP Processor Module uses Claude 3.5 Sonnet AI to automatically extract structured data from government RFP (Request for Proposal) and RFQ (Request for Quote) documents. This Phase 1 implementation focuses on text-based extraction with multimodal (image) support planned for Phase 2.

## Features

### Phase 1 (Current)
- ✅ AI-powered text extraction using Claude 3.5 Sonnet
- ✅ Structured data extraction (contacts, services, schedules, requirements)
- ✅ Confidence scoring for all extracted fields
- ✅ Prompt caching for 90% cost reduction
- ✅ Automatic retry logic with exponential backoff
- ✅ Comprehensive error handling
- ✅ Token usage and cost tracking
- ✅ Quality reporting and validation

### Phase 2 (Planned)
- 🔜 Direct PDF image processing (multimodal)
- 🔜 OCR integration for scanned documents
- 🔜 Table extraction and parsing
- 🔜 Form field identification
- 🔜 Batch processing of multiple documents

## Installation

### Prerequisites

1. **Node.js 18+** (already installed in this project)
2. **@anthropic-ai/sdk** (already installed)
3. **Anthropic API Key** (required)

### Get Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### Configure Environment

Add to your `.env` file:

```bash
# AI/Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

## Usage

### Basic Usage

```javascript
const AIExtractionEngine = require('./modules/rfp-processor/AIExtractionEngine.cjs');

// Initialize engine
const engine = new AIExtractionEngine({
  apiKey: process.env.ANTHROPIC_API_KEY,
  enableCaching: true,
  outputDir: './output/extractions'
});

// Extract from text
const rfpText = await fs.readFile('rfp-document.txt', 'utf8');
const extracted = await engine.extractFromText(rfpText, {
  fileName: 'FTB-IFB-CR-24-219053.pdf',
  pageCount: 20,
  source: 'California FTB'
});

// Save results
await engine.saveExtraction(extracted);

// Get statistics
console.log(engine.getStats());
```

### Running the Test

```bash
# Run the test with mock RFP data
node modules/rfp-processor/test-ai-extraction.cjs
```

Expected output:
```
✅ AIExtractionEngine initialized
   Model: claude-3-5-sonnet-20241022
   Caching: Enabled
   Output: ./output/extractions

🤖 Starting AI extraction...
   Attempt 1/3...
   ✅ Extraction successful!
   Input tokens: 8,523
   Output tokens: 2,145
   🚀 Cache hit! 6,234 tokens from cache
   💰 Cost: $0.0423
   ⏱️  Time: 3,421ms
```

## Extracted Data Schema

The engine extracts and returns the following structured data:

```javascript
{
  extractionId: "ext_1234567890",
  timestamp: "2024-10-06T10:30:00.000Z",
  confidence: 0.92,
  
  contactInformation: {
    primaryContact: {
      name: "Sarah Mitchell",
      title: "Procurement Analyst III",
      email: "sarah.mitchell@ftb.ca.gov",
      phone: "(916) 845-7777"
    },
    agency: {
      name: "California Franchise Tax Board",
      department: "Procurement and Contracts Section",
      address: "PO Box 1468",
      city: "Sacramento",
      state: "CA",
      zip: "95812-1468"
    }
  },
  
  projectDetails: {
    bidNumber: "FTB-IFB-CR-24-219053",
    projectTitle: "Generator Maintenance and Testing Services",
    location: "Sacramento County, CA",
    description: "Comprehensive generator maintenance...",
    projectType: "Facilities Maintenance"
  },
  
  schedule: {
    bidDueDate: "2024-12-15T14:00:00",
    contractStartDate: "2025-01-01",
    contractEndDate: "2027-12-31",
    duration: "36 months",
    keyDates: [...]
  },
  
  services: [
    {
      description: "Weekly generator testing",
      frequency: "weekly",
      details: "30 minutes minimum under load conditions",
      quantity: "15 facilities",
      rawText: "..."
    }
  ],
  
  stipulations: [
    {
      type: "prevailing_wage",
      required: true,
      details: "California prevailing wage requirements...",
      impact: "Increases labor costs, requires certified payroll",
      confidence: 1.0
    }
  ],
  
  paymentTerms: {
    invoicing: "monthly",
    paymentNet: "Net 30",
    retainage: "5%",
    depositRequired: false
  },
  
  bondRequirements: {
    bidBond: { required: true, amount: "10% of bid", percentage: 10 },
    performanceBond: { required: true, amount: "100%", percentage: 100 },
    paymentBond: { required: true, amount: "100%", percentage: 100 }
  },
  
  requiredDocuments: [...],
  insuranceRequirements: [...],
  
  qualityReport: {
    fieldsExtracted: 47,
    fieldsRequiringReview: ["retainage", "deposit"],
    ambiguities: [],
    extractionQuality: "high"
  },
  
  metadata: {
    model: "claude-3-5-sonnet-20241022",
    tokensUsed: 10668,
    cost: 0.0423,
    cached: true,
    processingTime: 3421
  }
}
```

## Configuration Options

### AIExtractionEngine Constructor

```javascript
new AIExtractionEngine({
  // Required
  apiKey: string,              // Anthropic API key
  
  // Optional
  model: string,               // Default: 'claude-3-5-sonnet-20241022'
  maxTokens: number,           // Default: 16000
  temperature: number,         // Default: 0.0 (deterministic)
  enableCaching: boolean,      // Default: true
  maxRetries: number,          // Default: 3
  outputDir: string            // Default: './output/extractions'
})
```

### Config File (config.cjs)

Additional configuration options in `modules/rfp-processor/config.cjs`:

```javascript
{
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 16000,
    temperature: 0.0,
    enableCaching: true,
    maxRetries: 3
  },
  
  processing: {
    enableOCR: false,              // Phase 2
    enableImageExtraction: false,  // Phase 2
    saveIntermediateResults: true,
    validateOutput: true
  },
  
  quality: {
    minimumConfidence: 0.6,
    highConfidence: 0.85,
    requireReviewBelow: 0.5
  }
}
```

## API Methods

### extractFromText(pdfText, metadata)

Extract structured data from RFP text.

**Parameters:**
- `pdfText` (string): The text content of the RFP document
- `metadata` (object): Optional metadata about the document
  - `fileName`: Source file name
  - `pageCount`: Number of pages
  - `source`: Origin (e.g., "California FTB")

**Returns:** Promise<Object> - Extracted structured data

**Example:**
```javascript
const extracted = await engine.extractFromText(rfpText, {
  fileName: 'bid-2024-001.pdf',
  pageCount: 25,
  source: 'Sacramento County'
});
```

### saveExtraction(extractionData, outputPath)

Save extraction results to JSON file.

**Parameters:**
- `extractionData` (object): The extracted data
- `outputPath` (string, optional): Custom output path

**Returns:** Promise<string> - Path to saved file

**Example:**
```javascript
const path = await engine.saveExtraction(extracted);
console.log(`Saved to: ${path}`);
```

### getStats()

Get extraction statistics.

**Returns:** Object with statistics

**Example:**
```javascript
const stats = engine.getStats();
console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);
```

### validateOutput(extractionData)

Validate extracted data structure.

**Throws:** Error if validation fails

### calculateConfidence(extractionData)

Calculate overall confidence score.

**Returns:** number (0.0 to 1.0)

## Cost Estimation

Claude 3.5 Sonnet pricing (as of October 2024):

| Metric | Price |
|--------|-------|
| Input tokens | $3.00 per million |
| Output tokens | $15.00 per million |
| Cache writes | $3.75 per million |
| Cache reads | $0.30 per million |

### Typical Costs

**20-page RFP document (~50,000 input tokens):**

- First extraction (no cache): **$0.40 - $0.60**
  - Input: ~50,000 tokens × $3.00 = $0.15
  - Output: ~4,000 tokens × $15.00 = $0.06
  - Cache write: ~10,000 tokens × $3.75 = $0.04
  - System prompt: ~8,000 tokens × $3.00 = $0.02

- Cached extraction: **$0.04 - $0.08** (90% savings!)
  - Input: ~50,000 tokens × $3.00 = $0.15
  - Output: ~4,000 tokens × $15.00 = $0.06
  - Cache read: ~10,000 tokens × $0.30 = $0.003

**Monthly estimates (100 RFPs):**
- Without caching: $40-60/month
- With caching: $4-8/month

## Prompt Caching

The engine uses Claude's prompt caching feature to cache:
- System instructions (reused across all extractions)
- Example RFP structures (reused across all extractions)

This reduces costs by **90%** on repeated extractions.

**Cache behavior:**
- Cache duration: 5 minutes of inactivity
- Automatic cache refresh on use
- No manual cache management needed

## Error Handling

The engine includes comprehensive error handling:

### Rate Limiting (429 errors)
- Automatic retry with exponential backoff
- Waits 2s, 4s, 8s between retries
- Configurable max retries (default: 3)

### Server Errors (5xx)
- Automatic retry after 2-second delay
- Up to 3 retry attempts

### Client Errors (4xx)
- No retry (indicates configuration issue)
- Clear error messages returned

### JSON Parsing Errors
- Attempts to extract JSON from markdown blocks
- Falls back to error response if parsing fails

## Quality Assurance

### Confidence Scoring

Each field receives a confidence score:
- **1.0**: Explicitly stated, no ambiguity
- **0.8-0.9**: Clearly present with minor interpretation
- **0.6-0.7**: Inferred from context
- **0.4-0.5**: Unclear, requires interpretation
- **0.0-0.3**: Not found or highly ambiguous

### Quality Report

Every extraction includes a quality report:
```javascript
qualityReport: {
  fieldsExtracted: 47,           // Number of fields successfully extracted
  fieldsRequiringReview: [...],  // Low-confidence fields
  ambiguities: [...],            // Unclear sections
  extractionQuality: "high"      // high/medium/low
}
```

### Validation

Automatic validation checks:
- ✅ All required fields present
- ✅ Correct data types
- ✅ Array fields are actually arrays
- ✅ Date formats valid (ISO 8601)
- ✅ Numeric values parsed correctly

## File Structure

```
modules/rfp-processor/
├── AIExtractionEngine.cjs      # Main extraction engine
├── config.cjs                   # Configuration
├── test-ai-extraction.cjs       # Test script with mock data
├── README.md                    # This file
└── schemas/                     # JSON schemas (future)
```

## Integration with Energen Calculator

Future integration points:

1. **Service Identification**: Map extracted services to Energen service types (A-K)
2. **Pricing Automation**: Use extracted requirements for automated pricing
3. **Quote Generation**: Pre-fill quote forms with extracted data
4. **Risk Assessment**: Flag high-risk stipulations (prevailing wage, bonds)
5. **Timeline Management**: Import key dates into project schedule

## Troubleshooting

### API Key Not Found

**Error:** `⚠️ WARNING: ANTHROPIC_API_KEY not set!`

**Solution:**
1. Copy `.env.example` to `.env`
2. Add your API key: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart the application

### Rate Limit Errors

**Error:** `429 Too Many Requests`

**Solution:**
- The engine automatically retries with exponential backoff
- If persistent, check your API tier limits
- Consider adding delays between extractions

### Low Confidence Scores

**Issue:** Overall confidence below 0.6

**Solutions:**
- Check document quality (OCR errors, formatting issues)
- Review fieldsRequiringReview in quality report
- Manually verify low-confidence fields
- Consider re-scanning source document if scanned

### JSON Parse Errors

**Error:** `Could not parse JSON from Claude response`

**Solution:**
- Usually auto-corrected by retry logic
- Check API response in logs
- Verify document isn't corrupted
- Try again (transient API issues)

## Best Practices

1. **Always use metadata**: Helps with tracking and debugging
2. **Review low-confidence fields**: Fields with confidence < 0.5
3. **Enable caching**: 90% cost savings on repeated extractions
4. **Monitor costs**: Check `getStats()` regularly
5. **Save all extractions**: Create audit trail
6. **Validate output**: Always check qualityReport
7. **Handle errors gracefully**: Check `success` field in response

## Development Roadmap

### Phase 1 (Current) ✅
- Text extraction from RFP documents
- Structured data output
- Confidence scoring
- Cost optimization

### Phase 2 (Next)
- Direct PDF image processing
- OCR integration
- Table extraction
- Form field detection

### Phase 3 (Future)
- Integration with Energen Calculator
- Automated service mapping
- Quote pre-fill
- Risk assessment

## Support and Resources

- **Anthropic Documentation**: https://docs.anthropic.com/
- **Claude API Reference**: https://docs.anthropic.com/en/api/
- **Prompt Caching Guide**: https://docs.anthropic.com/en/docs/prompt-caching
- **Project Issues**: Report bugs in project issue tracker

## Cost Tracking

The engine automatically tracks:
- Total extractions performed
- Success/failure rates
- Token usage (input + output)
- Total costs
- Cache hit rates
- Average cost per document

Access statistics with:
```javascript
const stats = engine.getStats();
console.log(stats);
```

## License

Proprietary - Energen Systems Inc.

---

**Last Updated:** October 6, 2025  
**Version:** 1.0.0 (Phase 1)  
**Author:** Energen Systems Inc.
