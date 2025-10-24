/**
 * MultiPassExtractionEngine.cjs
 *
 * Orchestrates multiple AI extraction passes with different specialized prompts
 * to achieve zero-hallucination, comprehensive RFP analysis.
 *
 * Architecture:
 * - Pass 1: Main document extraction (contacts, schedule, services, bonds)
 * - Pass 2: Trap detection (hidden requirements affecting pricing/compliance)
 * - Pass 3: Secondary documents (sample contracts, SOW, addenda)
 * - Pass 4: Cross-validation (detect conflicts across documents)
 * - Pass 5: Conflict resolution (resolve contradictions with evidence)
 *
 * @version 1.0.0
 */

const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
// Resolve from project root (go up 4 levels from lib folder)
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const { AIExtractionEngine } = require(path.join(PROJECT_ROOT, 'modules/rfp-processor/AIExtractionEngine.cjs'));
const { TRAP_DETECTION_PROMPT } = require(path.join(__dirname, '../prompts/trap-detection-prompt.js'));

class MultiPassExtractionEngine {
  /**
   * Initialize multi-pass extraction engine
   * @param {Object} config - Configuration
   * @param {string} config.apiKey - Anthropic API key
   * @param {boolean} config.enableCaching - Use prompt caching (default: true)
   * @param {number} config.maxRetries - Retry attempts (default: 3)
   */
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      enableCaching: config.enableCaching !== false,
      maxRetries: config.maxRetries || 3,
      model: 'claude-3-7-sonnet-20250219',
      ...config
    };

    if (!this.config.apiKey) {
      throw new Error('ANTHROPIC_API_KEY required for MultiPassExtractionEngine');
    }

    // Initialize base extraction engine
    this.baseExtractor = new AIExtractionEngine({
      apiKey: this.config.apiKey,
      enableCaching: this.config.enableCaching,
      model: this.config.model
    });

    // Initialize Anthropic client for specialized prompts
    this.client = new Anthropic({
      apiKey: this.config.apiKey
    });

    // Statistics tracking
    this.stats = {
      totalPasses: 0,
      passResults: [],
      trapsFound: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      totalCost: 0.00
    };

    console.log('✅ MultiPassExtractionEngine initialized');
    console.log(`   Model: ${this.config.model}`);
    console.log(`   Caching: ${this.config.enableCaching ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Execute comprehensive multi-pass extraction
   * @param {Array<Object>} pdfDocuments - Array of {text, fileName, type}
   * @param {Object} metadata - RFP metadata
   * @returns {Promise<Object>} - Comprehensive extraction results
   */
  async extractComprehensive(pdfDocuments, metadata = {}) {
    console.log('\n🔄 Starting Multi-Pass Extraction...');
    console.log(`   Documents: ${pdfDocuments.length}`);

    const startTime = Date.now();
    const results = {
      metadata: {
        rfpId: metadata.rfpId || 'unknown',
        extractionDate: new Date().toISOString(),
        documentsProcessed: pdfDocuments.length,
        ...metadata
      },
      passes: {},
      conflicts: [],
      finalData: {},
      confidence: 0,
      processingTime: 0
    };

    try {
      // PASS 1: Main Document Extraction
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PASS 1: Main Document Extraction');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const mainDoc = pdfDocuments.find(d => d.type === 'main') || pdfDocuments[0];
      results.passes.pass1_main = await this.baseExtractor.extractFromText(
        mainDoc.text,
        {
          fileName: mainDoc.fileName,
          source: metadata.rfpId,
          passType: 'main-document'
        }
      );

      console.log(`   ✅ Pass 1 complete (Confidence: ${(results.passes.pass1_main.confidence * 100).toFixed(1)}%)`);
      this.stats.totalPasses++;

      // PASS 2: Trap Detection
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PASS 2: Trap Detection (Hidden Requirements)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Combine all document text for comprehensive trap detection
      const allText = pdfDocuments.map(d => d.text).join('\n\n--- NEXT DOCUMENT ---\n\n');

      results.passes.pass2_traps = await this.runTrapDetection(allText, {
        rfpId: metadata.rfpId,
        documentCount: pdfDocuments.length
      });

      this.stats.trapsFound = results.passes.pass2_traps.summary?.totalTrapsFound || 0;
      console.log(`   ✅ Pass 2 complete (Traps found: ${this.stats.trapsFound})`);
      this.stats.totalPasses++;

      // PASS 3: Secondary Documents
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PASS 3: Secondary Documents (Contracts, SOW, Addenda)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const secondaryDocs = pdfDocuments.filter(d => d.type !== 'main');
      results.passes.pass3_secondary = [];

      for (const doc of secondaryDocs) {
        console.log(`   Processing: ${doc.fileName}`);
        const extraction = await this.baseExtractor.extractFromText(
          doc.text,
          {
            fileName: doc.fileName,
            documentType: doc.type,
            passType: 'secondary-document'
          }
        );
        results.passes.pass3_secondary.push(extraction);
        this.stats.totalPasses++;
      }

      console.log(`   ✅ Pass 3 complete (${secondaryDocs.length} documents processed)`);

      // PASS 4: Cross-Document Validation
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PASS 4: Cross-Document Validation');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      results.conflicts = this.detectConflicts(
        results.passes.pass1_main,
        results.passes.pass3_secondary,
        results.passes.pass2_traps
      );

      this.stats.conflictsDetected = results.conflicts.length;
      console.log(`   ✅ Pass 4 complete (Conflicts detected: ${this.stats.conflictsDetected})`);

      // PASS 5: Conflict Resolution
      if (results.conflicts.length > 0) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('PASS 5: Conflict Resolution');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const resolved = this.resolveConflicts(results.conflicts, pdfDocuments);
        results.resolvedConflicts = resolved;
        this.stats.conflictsResolved = resolved.filter(c => c.resolved).length;

        console.log(`   ✅ Pass 5 complete (Resolved: ${this.stats.conflictsResolved}/${this.stats.conflictsDetected})`);
      }

      // FINAL: Merge All Data
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('FINAL: Merging All Extraction Data');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      results.finalData = this.mergeExtractionResults(
        results.passes.pass1_main,
        results.passes.pass2_traps,
        results.passes.pass3_secondary,
        results.resolvedConflicts
      );

      // Calculate overall confidence
      results.confidence = this.calculateOverallConfidence(results);

      // Processing time
      results.processingTime = Date.now() - startTime;

      console.log(`   ✅ Merge complete`);
      console.log(`\n📊 Final Statistics:`);
      console.log(`   Overall Confidence: ${(results.confidence * 100).toFixed(1)}%`);
      console.log(`   Traps Found: ${this.stats.trapsFound}`);
      console.log(`   Conflicts Detected: ${this.stats.conflictsDetected}`);
      console.log(`   Conflicts Resolved: ${this.stats.conflictsResolved}`);
      console.log(`   Processing Time: ${(results.processingTime / 1000).toFixed(1)}s`);

      return results;

    } catch (error) {
      console.error(`\n❌ Multi-pass extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run trap detection pass with specialized prompt
   */
  async runTrapDetection(documentText, metadata) {
    console.log('   Running specialized trap detection...');

    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 16000,
        temperature: 0.0,
        system: [
          {
            type: 'text',
            text: TRAP_DETECTION_PROMPT,
            cache_control: this.config.enableCaching ? { type: 'ephemeral' } : undefined
          }
        ],
        messages: [
          {
            role: 'user',
            content: `# DOCUMENT(S) TO ANALYZE\n\n${documentText}\n\n---\n\nAnalyze the above document(s) and extract all hidden requirements and traps as specified.`
          }
        ]
      });

      // Track usage
      const usage = response.usage;
      const inputCost = (usage.input_tokens / 1000000) * 3.00;
      const outputCost = (usage.output_tokens / 1000000) * 15.00;
      const cacheCost = usage.cache_read_input_tokens
        ? (usage.cache_read_input_tokens / 1000000) * 0.30
        : 0;
      const cost = inputCost + outputCost + cacheCost;
      this.stats.totalCost += cost;

      console.log(`   Input tokens: ${usage.input_tokens.toLocaleString()}`);
      console.log(`   Output tokens: ${usage.output_tokens.toLocaleString()}`);
      if (usage.cache_read_input_tokens) {
        console.log(`   🚀 Cache hit: ${usage.cache_read_input_tokens.toLocaleString()} tokens`);
      }
      console.log(`   💰 Cost: $${cost.toFixed(4)}`);
      console.log(`   ⏱️  Time: ${Date.now() - startTime}ms`);

      // Parse JSON response
      const content = response.content[0].text;
      let trapData;

      try {
        trapData = JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          trapData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not parse trap detection JSON response');
        }
      }

      return {
        ...trapData,
        metadata: {
          processingTime: Date.now() - startTime,
          cost,
          tokensUsed: usage.input_tokens + usage.output_tokens,
          ...metadata
        }
      };

    } catch (error) {
      console.error(`   ⚠️  Trap detection failed: ${error.message}`);
      return {
        trapDetectionResults: {},
        summary: { totalTrapsFound: 0, error: error.message },
        metadata
      };
    }
  }

  /**
   * Detect conflicts across multiple document extractions
   */
  detectConflicts(mainExtraction, secondaryExtractions, trapData) {
    console.log('   Analyzing for conflicts...');

    const conflicts = [];

    // Check payment terms conflicts
    const mainPayment = mainExtraction.paymentTerms?.paymentNet;
    for (const secondary of secondaryExtractions) {
      const secPayment = secondary.paymentTerms?.paymentNet;
      if (mainPayment && secPayment && mainPayment !== secPayment) {
        conflicts.push({
          type: 'payment_terms',
          field: 'paymentNet',
          values: [
            { source: 'Main RFP', value: mainPayment, confidence: mainExtraction.confidence },
            { source: secondary.metadata.fileName, value: secPayment, confidence: secondary.confidence }
          ],
          severity: 'high',
          resolved: false
        });
      }
    }

    // Check date conflicts
    const mainBidDue = mainExtraction.schedule?.bidDueDate;
    for (const secondary of secondaryExtractions) {
      const secBidDue = secondary.schedule?.bidDueDate;
      if (mainBidDue && secBidDue && mainBidDue !== secBidDue) {
        conflicts.push({
          type: 'bid_due_date',
          field: 'bidDueDate',
          values: [
            { source: 'Main RFP', value: mainBidDue, confidence: mainExtraction.confidence },
            { source: secondary.metadata.fileName, value: secBidDue, confidence: secondary.confidence }
          ],
          severity: 'critical',
          resolved: false
        });
      }
    }

    // Check bond requirement conflicts
    const mainBonds = mainExtraction.bondRequirements;
    for (const secondary of secondaryExtractions) {
      const secBonds = secondary.bondRequirements;
      if (mainBonds?.bidBond?.percentage !== secBonds?.bidBond?.percentage) {
        conflicts.push({
          type: 'bond_requirements',
          field: 'bidBond.percentage',
          values: [
            { source: 'Main RFP', value: mainBonds?.bidBond?.percentage, confidence: mainExtraction.confidence },
            { source: secondary.metadata.fileName, value: secBonds?.bidBond?.percentage, confidence: secondary.confidence }
          ],
          severity: 'high',
          resolved: false
        });
      }
    }

    console.log(`   Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * Resolve conflicts using document hierarchy and evidence
   */
  resolveConflicts(conflicts, pdfDocuments) {
    console.log('   Resolving conflicts using document hierarchy...');

    // Document hierarchy (higher = more authoritative)
    const HIERARCHY = {
      'addendum': 10,
      'amendment': 10,
      'addenda': 10,
      'sample-contract': 7,
      'contract': 7,
      'sow': 5,
      'scope-of-work': 5,
      'main': 3,
      'default': 1
    };

    const resolved = conflicts.map(conflict => {
      // Determine document types
      const valuePriorities = conflict.values.map(v => {
        const docType = this.inferDocumentType(v.source, pdfDocuments);
        const priority = HIERARCHY[docType] || HIERARCHY['default'];
        return { ...v, docType, priority };
      });

      // Sort by priority (highest first)
      valuePriorities.sort((a, b) => b.priority - a.priority);

      // If top two have same priority, use confidence
      if (valuePriorities.length > 1 &&
          valuePriorities[0].priority === valuePriorities[1].priority) {
        valuePriorities.sort((a, b) => b.confidence - a.confidence);
      }

      const winner = valuePriorities[0];

      return {
        ...conflict,
        resolved: true,
        resolvedValue: winner.value,
        resolvedSource: winner.source,
        resolution: `Using value from ${winner.source} (${winner.docType}, priority ${winner.priority})`,
        alternativeValues: valuePriorities.slice(1)
      };
    });

    return resolved;
  }

  /**
   * Infer document type from filename
   */
  inferDocumentType(fileName, pdfDocuments) {
    const lower = fileName.toLowerCase();

    if (lower.includes('addend') || lower.includes('amendment')) return 'addendum';
    if (lower.includes('contract')) return 'sample-contract';
    if (lower.includes('sow') || lower.includes('scope')) return 'sow';

    // Check if it's the main document
    const doc = pdfDocuments.find(d => d.fileName === fileName);
    if (doc?.type === 'main') return 'main';

    return 'default';
  }

  /**
   * Merge all extraction results into final comprehensive data
   */
  mergeExtractionResults(mainData, trapData, secondaryData, resolvedConflicts) {
    console.log('   Merging extraction results...');

    // Start with main extraction
    const merged = JSON.parse(JSON.stringify(mainData));

    // Apply resolved conflicts
    if (resolvedConflicts) {
      resolvedConflicts.forEach(conflict => {
        if (conflict.resolved) {
          // Update field with resolved value
          this.setNestedValue(merged, conflict.field, conflict.resolvedValue);
        }
      });
    }

    // Add trap detection results as new section
    merged.hiddenRequirements = trapData.trapDetectionResults || {};
    merged.hiddenRequirementsSummary = trapData.summary || {};

    // Merge service data from secondary documents
    if (secondaryData && secondaryData.length > 0) {
      merged.additionalServices = [];
      secondaryData.forEach(sec => {
        if (sec.services && sec.services.length > 0) {
          sec.services.forEach(svc => {
            // Add if not already in main services
            const exists = merged.services.some(s =>
              s.description === svc.description
            );
            if (!exists) {
              merged.additionalServices.push({
                ...svc,
                source: sec.metadata.fileName
              });
            }
          });
        }
      });
    }

    // Add comprehensive stipulations from all sources
    merged.allStipulations = [
      ...(merged.stipulations || []),
      ...(this.extractStipulationsFromTraps(trapData))
    ];

    return merged;
  }

  /**
   * Extract stipulations from trap detection results
   */
  extractStipulationsFromTraps(trapData) {
    const stipulations = [];
    const traps = trapData.trapDetectionResults || {};

    // Prevailing wage
    if (traps.laborTraps?.prevailingWage?.found) {
      stipulations.push({
        type: 'prevailing_wage',
        required: true,
        details: traps.laborTraps.prevailingWage.details,
        impact: traps.laborTraps.prevailingWage.extractedData,
        confidence: traps.laborTraps.prevailingWage.confidence,
        source: 'trap-detection',
        pageNumber: traps.laborTraps.prevailingWage.pageNumber
      });
    }

    // Emergency response
    if (traps.laborTraps?.emergencyResponse?.found) {
      stipulations.push({
        type: 'emergency_response',
        required: true,
        details: traps.laborTraps.emergencyResponse.details,
        impact: traps.laborTraps.emergencyResponse.extractedData,
        confidence: traps.laborTraps.emergencyResponse.confidence,
        source: 'trap-detection',
        pageNumber: traps.laborTraps.emergencyResponse.pageNumber
      });
    }

    // Add more trap-based stipulations...

    return stipulations;
  }

  /**
   * Set nested object value by path (e.g., "bondRequirements.bidBond.percentage")
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(results) {
    const mainConf = results.passes.pass1_main?.confidence || 0;
    const trapConf = results.passes.pass2_traps?.summary?.totalTrapsFound > 0 ? 0.9 : 0.7;
    const secConf = results.passes.pass3_secondary?.length > 0
      ? results.passes.pass3_secondary.reduce((sum, s) => sum + (s.confidence || 0), 0) / results.passes.pass3_secondary.length
      : 0.5;

    // Reduce confidence if unresolved conflicts exist
    const conflictPenalty = results.conflicts.length > 0 && this.stats.conflictsResolved < results.conflicts.length
      ? 0.1
      : 0;

    const avg = (mainConf + trapConf + secConf) / 3;
    return Math.max(0, Math.min(1, avg - conflictPenalty));
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = { MultiPassExtractionEngine };
