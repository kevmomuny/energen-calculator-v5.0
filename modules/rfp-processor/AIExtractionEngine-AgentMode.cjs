/**
 * AIExtractionEngine-AgentMode.cjs
 *
 * AI-powered RFP extraction using Claude Code Task agents instead of direct API calls
 * This version runs through your Claude Code session and doesn't consume API credits
 *
 * @module AIExtractionEngine-AgentMode
 * @author Energen Systems Inc.
 * @version 2.0.0 (Agent Mode)
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

/**
 * System prompt for extraction (used by agent)
 */
const EXTRACTION_PROMPT_TEMPLATE = `You are an expert analyst specializing in government RFP document analysis.

TASK: Extract structured information from this RFP document and return ONLY valid JSON.

Extract these fields:
1. Contact Information (primaryContact, agency, alternateContacts)
2. Project Details (bidNumber, projectTitle, location, description, projectType)
3. Schedule (bidDueDate, contractStartDate, contractEndDate, duration, keyDates)
4. Services (array with description, frequency, details, quantity)
5. Stipulations (type, required, details, impact, confidence)
6. Payment Terms (invoicing, paymentNet, retainage, depositRequired)
7. Bond Requirements (bidBond, performanceBond, paymentBond)
8. Required Documents (name, type, fillable, required, pages, description)
9. Insurance Requirements (type, coverage, required)
10. Quality Report (fieldsExtracted, fieldsRequiringReview, ambiguities, extractionQuality)

CRITICAL RULES:
- Return ONLY the JSON object (no markdown, no explanations)
- Use ISO 8601 format for dates (YYYY-MM-DD)
- Set null for missing fields
- Pages field must be string, not number (e.g., "19-20")
- All string values must be in quotes

JSON STRUCTURE:
{
  "contactInformation": {
    "primaryContact": {"name": "", "title": "", "email": "", "phone": ""},
    "agency": {"name": "", "department": "", "address": "", "city": "", "state": "", "zip": ""},
    "alternateContacts": []
  },
  "projectDetails": {
    "bidNumber": "",
    "projectTitle": "",
    "location": "",
    "description": "",
    "projectType": ""
  },
  "schedule": {
    "bidDueDate": "",
    "contractStartDate": "",
    "contractEndDate": "",
    "duration": "",
    "keyDates": []
  },
  "services": [],
  "stipulations": [],
  "paymentTerms": {
    "invoicing": "",
    "paymentNet": "",
    "retainage": "",
    "depositRequired": false,
    "depositAmount": ""
  },
  "bondRequirements": {
    "bidBond": {"required": false, "amount": "", "percentage": 0},
    "performanceBond": {"required": false, "amount": "", "percentage": 0},
    "paymentBond": {"required": false, "amount": "", "percentage": 0}
  },
  "requiredDocuments": [],
  "insuranceRequirements": [],
  "qualityReport": {
    "fieldsExtracted": 0,
    "fieldsRequiringReview": [],
    "ambiguities": [],
    "extractionQuality": "high"
  }
}

===== RFP DOCUMENT TEXT =====
{{RFP_TEXT}}
===== END DOCUMENT =====

Return the JSON now:`;

/**
 * AIExtractionEngine in Agent Mode
 * Uses Claude Code agents instead of direct API calls
 */
class AIExtractionEngine {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || './output/extractions',
      agentMode: true,
      ...config
    };

    this.stats = {
      totalExtractions: 0,
      successfulExtractions: 0,
      failedExtractions: 0
    };

    console.log('✅ AIExtractionEngine initialized (AGENT MODE)');
    console.log(`   Mode: Claude Code Task Agent (no API credits used)`);
    console.log(`   Output: ${this.config.outputDir}`);
  }

  /**
   * Extract data using Claude Code agent instead of API
   */
  async extractFromText(pdfText, metadata = {}) {
    console.log('\n🤖 Starting AI extraction (Agent Mode)...');
    console.log(`   Text length: ${pdfText.length} characters`);
    console.log(`   📝 Writing extraction task for agent...`);

    const startTime = Date.now();
    this.stats.totalExtractions++;

    try {
      // Create temp file with extraction task
      const tempDir = path.join(this.config.outputDir, 'temp');
      await fsPromises.mkdir(tempDir, { recursive: true });

      const taskFile = path.join(tempDir, `extraction-task-${Date.now()}.txt`);
      const outputFile = path.join(tempDir, `extraction-output-${Date.now()}.json`);

      // Write task with RFP text
      const prompt = EXTRACTION_PROMPT_TEMPLATE.replace('{{RFP_TEXT}}', pdfText);
      await fsPromises.writeFile(taskFile, prompt, 'utf8');

      console.log(`   ✅ Task file created: ${taskFile}`);
      console.log(`   📤 Expected output: ${outputFile}`);
      console.log(`\n   ⚠️  MANUAL STEP REQUIRED:`);
      console.log(`   Please run this extraction manually using Claude Code:`);
      console.log(`   1. Read the task file: ${taskFile}`);
      console.log(`   2. Extract the structured data as JSON`);
      console.log(`   3. Write the result to: ${outputFile}`);
      console.log(`\n   Waiting for output file to appear...`);

      // Wait for output file (with timeout)
      const maxWait = 300000; // 5 minutes
      const checkInterval = 2000; // Check every 2 seconds
      let waited = 0;

      while (waited < maxWait) {
        if (fs.existsSync(outputFile)) {
          console.log(`   ✅ Output file detected!`);
          break;
        }
        await this.sleep(checkInterval);
        waited += checkInterval;

        if (waited % 10000 === 0) {
          console.log(`   ⏳ Still waiting... (${waited/1000}s elapsed)`);
        }
      }

      if (!fs.existsSync(outputFile)) {
        throw new Error('Timeout: Output file not created within 5 minutes');
      }

      // Read the extraction result
      const extractedContent = await fsPromises.readFile(outputFile, 'utf8');
      let extractedData;

      try {
        extractedData = JSON.parse(extractedContent);
      } catch (e) {
        // Try to extract JSON from markdown blocks
        const jsonMatch = extractedContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                         extractedContent.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error(`Could not parse JSON from output: ${e.message}`);
        }
      }

      // Add metadata
      extractedData.extractionId = `ext_${Date.now()}`;
      extractedData.timestamp = new Date().toISOString();
      extractedData.metadata = {
        mode: 'agent',
        processingTime: Date.now() - startTime,
        ...metadata
      };

      // Validate
      this.validateOutput(extractedData);

      // Calculate confidence
      extractedData.confidence = this.calculateConfidence(extractedData);

      this.stats.successfulExtractions++;

      console.log(`   ✅ Extraction successful!`);
      console.log(`   ⏱️  Time: ${Date.now() - startTime}ms`);

      return extractedData;

    } catch (error) {
      this.stats.failedExtractions++;
      console.error(`   ❌ Extraction failed: ${error.message}`);

      return {
        extractionId: `ext_error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        error: error.message,
        success: false,
        metadata
      };
    }
  }

  /**
   * Validate extraction output
   */
  validateOutput(extractionData) {
    const requiredFields = [
      'contactInformation',
      'projectDetails',
      'schedule',
      'services',
      'stipulations',
      'paymentTerms',
      'bondRequirements',
      'requiredDocuments'
    ];

    for (const field of requiredFields) {
      if (!(field in extractionData)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(extractionData.services)) {
      throw new Error('services must be an array');
    }
    if (!Array.isArray(extractionData.stipulations)) {
      throw new Error('stipulations must be an array');
    }
    if (!Array.isArray(extractionData.requiredDocuments)) {
      throw new Error('requiredDocuments must be an array');
    }

    console.log('   ✅ Output validation passed');
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(extractionData) {
    let totalConfidence = 0;
    let fieldCount = 0;

    const sections = [
      extractionData.contactInformation,
      extractionData.projectDetails,
      extractionData.schedule,
      extractionData.paymentTerms
    ];

    for (const section of sections) {
      if (section && typeof section === 'object') {
        const values = Object.values(section);
        const nonNullValues = values.filter(v => v !== null && v !== '');
        totalConfidence += nonNullValues.length / values.length;
        fieldCount++;
      }
    }

    if (extractionData.services && extractionData.services.length > 0) {
      totalConfidence += 1.0;
      fieldCount++;
    }
    if (extractionData.stipulations && extractionData.stipulations.length > 0) {
      totalConfidence += 1.0;
      fieldCount++;
    }

    const avgConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Save extraction to file
   */
  async saveExtraction(extractionData, outputPath = null) {
    try {
      await fsPromises.mkdir(this.config.outputDir, { recursive: true });

      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const bidNumber = extractionData.projectDetails?.bidNumber || 'unknown';
        const filename = `extraction_${bidNumber}_${timestamp}.json`;
        outputPath = path.join(this.config.outputDir, filename);
      }

      await fsPromises.writeFile(
        outputPath,
        JSON.stringify(extractionData, null, 2),
        'utf8'
      );

      console.log(`   💾 Saved to: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error(`   ❌ Failed to save extraction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalExtractions > 0
        ? (this.stats.successfulExtractions / this.stats.totalExtractions) * 100
        : 0
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { AIExtractionEngine };
