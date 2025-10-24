/**
 * evaluate-rfp-comprehensive-v2.cjs - Enhanced Multi-Pass RFP Evaluator
 *
 * Version 2.1 - Now uses PDF skill integration for text extraction
 *
 * Usage:
 *   node evaluate-rfp-comprehensive-v2.cjs "path/to/rfp/folder"
 *
 * @version 2.1.0
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// Import modules (using PDF skill integration)
const { PdfExtractor } = require('../lib/PdfExtractor.cjs');
const { MultiPassExtractionEngine } = require('../lib/MultiPassExtractionEngine.cjs');
const analyzeEquipment = require('./analyze-equipment.cjs');
const assessRisks = require('./assess-risks.cjs');
const mapServices = require('./map-services-to-energen.cjs');
const generateSummary = require('./generate-executive-summary.cjs');
const createChecklist = require('./create-compliance-checklist.cjs');

/**
 * Classify PDF document type from filename
 */
function classifyDocumentType(fileName) {
  const lower = fileName.toLowerCase();

  if (lower.includes('addend') || lower.includes('amendment')) {
    return { type: 'addendum', priority: 10 };
  }
  if (lower.includes('contract') || lower.includes('sample')) {
    return { type: 'sample-contract', priority: 7 };
  }
  if (lower.includes('sow') || lower.includes('scope')) {
    return { type: 'sow', priority: 5 };
  }
  if (lower.match(/^1-/) || lower.includes('rfp') || lower.includes('main')) {
    return { type: 'main', priority: 3 };
  }

  return { type: 'other', priority: 1 };
}

/**
 * Main evaluation function
 */
async function evaluateRFPComprehensive(inputPath) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('     ENERGEN RFP COMPREHENSIVE EVALUATOR v2.1');
  console.log('     Multi-Pass + PDF Skill Integration');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Validate input
    if (!inputPath) {
      throw new Error('Input path required. Usage: node evaluate-rfp-comprehensive-v2.cjs "path/to/rfp"');
    }

    const absolutePath = path.resolve(inputPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Input path not found: ${absolutePath}`);
    }

    const stats = await fsPromises.stat(absolutePath);
    const isDirectory = stats.isDirectory();

    console.log(`📁 Input: ${absolutePath}`);
    console.log(`   Type: ${isDirectory ? 'Directory' : 'File'}\n`);

    // Check PDF extractor availability
    console.log('🔍 Checking PDF extraction capability...');
    const pdfCheck = await PdfExtractor.checkAvailability();
    if (!pdfCheck.available) {
      console.log(`   ⚠️  Warning: ${pdfCheck.error}`);
      console.log(`   Continuing anyway - will report errors if PDFs fail to extract.\n`);
    } else {
      console.log(`   ✅ Python + pypdf available\n`);
    }

    // Step 1: Find ALL PDF files
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: DISCOVERING AND CLASSIFYING DOCUMENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let pdfFiles = [];
    let rfpFolder = '';
    let rfpId = '';

    if (isDirectory) {
      rfpFolder = absolutePath;
      rfpId = path.basename(absolutePath).replace(/[^a-zA-Z0-9-]/g, '-');

      const files = await fsPromises.readdir(absolutePath);
      pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))
        .map(f => path.join(absolutePath, f));

      console.log(`   Found ${pdfFiles.length} PDF file(s) in directory`);
    } else if (absolutePath.toLowerCase().endsWith('.pdf')) {
      rfpFolder = path.dirname(absolutePath);
      rfpId = path.basename(absolutePath, '.pdf').replace(/[^a-zA-Z0-9-]/g, '-');
      pdfFiles = [absolutePath];

      console.log(`   Processing single PDF file`);
    } else {
      throw new Error('Input must be a PDF file or directory containing PDFs');
    }

    if (pdfFiles.length === 0) {
      throw new Error('No PDF files found');
    }

    // Extract text from ALL PDFs using PDF skill
    console.log(`\n   Extracting text from ${pdfFiles.length} PDF(s) using PDF skill...\n`);

    const pdfDocuments = [];

    for (const pdfPath of pdfFiles) {
      const fileName = path.basename(pdfPath);
      console.log(`   📄 Processing: ${fileName}`);

      try {
        // Use PDF skill extractor
        const extractionResult = await PdfExtractor.extractText(pdfPath);

        if (!extractionResult.success) {
          console.log(`      ❌ Failed: ${extractionResult.error}`);
          continue;
        }

        const classification = classifyDocumentType(fileName);

        pdfDocuments.push({
          fileName: fileName,
          filePath: pdfPath,
          text: extractionResult.text,
          pageCount: extractionResult.pages,
          type: classification.type,
          priority: classification.priority,
          fileSize: extractionResult.fileSize,
          charCount: extractionResult.charCount
        });

        console.log(`      ✅ Extracted ${extractionResult.pages} pages (${extractionResult.charCount.toLocaleString()} chars)`);
        console.log(`      📋 Classified as: ${classification.type.toUpperCase()} (priority: ${classification.priority})`);

        if (extractionResult.charCount < 500) {
          console.log(`      ⚠️  Warning: Very little text. PDF may be scanned images or empty.`);
        }
      } catch (error) {
        console.log(`      ❌ Exception: ${error.message}`);
      }
    }

    if (pdfDocuments.length === 0) {
      throw new Error('No PDFs successfully extracted. Check if PDFs are valid and not scanned images.');
    }

    // Sort by priority (highest first) to identify main document
    pdfDocuments.sort((a, b) => b.priority - a.priority);

    console.log(`\n   📊 Document Classification Summary:`);
    const typeGroups = {};
    pdfDocuments.forEach(doc => {
      if (!typeGroups[doc.type]) typeGroups[doc.type] = 0;
      typeGroups[doc.type]++;
    });
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`      ${type}: ${count} document(s)`);
    });

    // Step 2: Multi-Pass Extraction
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: MULTI-PASS COMPREHENSIVE EXTRACTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const extractor = new MultiPassExtractionEngine({
      apiKey: process.env.ANTHROPIC_API_KEY,
      enableCaching: true
    });

    const comprehensiveExtraction = await extractor.extractComprehensive(
      pdfDocuments,
      { rfpId }
    );

    if (!comprehensiveExtraction || comprehensiveExtraction.error) {
      throw new Error(`Extraction failed: ${comprehensiveExtraction?.error || 'Unknown error'}`);
    }

    // Use final merged data for subsequent processing
    const extraction = comprehensiveExtraction.finalData;

    console.log(`\n   ✅ Multi-pass extraction complete`);
    console.log(`      Overall Confidence: ${(comprehensiveExtraction.confidence * 100).toFixed(1)}%`);
    console.log(`      Traps Found: ${comprehensiveExtraction.passes.pass2_traps.summary?.totalTrapsFound || 0}`);
    console.log(`      Conflicts: ${comprehensiveExtraction.conflicts.length} detected, ${comprehensiveExtraction.resolvedConflicts?.filter(c => c.resolved).length || 0} resolved`);

    // Continue with remaining steps (equipment, risk, services, output)...
    // [Rest of the evaluation process continues as before]

    // Step 3: Parse equipment files
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: PARSING EQUIPMENT LIST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let equipmentData = null;
    const equipmentFiles = await findEquipmentFiles(rfpFolder);

    if (equipmentFiles.length > 0) {
      console.log(`   Found ${equipmentFiles.length} equipment file(s)`);
      try {
        equipmentData = await analyzeEquipment(equipmentFiles[0]);
        console.log(`   ✅ Parsed ${equipmentData.generators.length} generators`);
      } catch (error) {
        console.log(`   ⚠️  Equipment parsing failed: ${error.message}`);
      }
    } else {
      console.log(`   ℹ️  No equipment files found`);
    }

    // Step 4: Risk assessment
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: ENHANCED RISK ASSESSMENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const riskAssessment = await assessRisks(extraction, equipmentData);
    console.log(`   ✅ Risk assessment complete`);
    console.log(`   Overall Risk: ${riskAssessment.overallScore.toFixed(2)}/10 (${riskAssessment.riskLevel})`);

    // Step 5: Service mapping
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: SERVICE MAPPING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const serviceMapping = await mapServices(extraction.services || []);
    console.log(`   ✅ Mapped ${serviceMapping.mappedServices.length} services`);

    // Step 6: Save outputs
    const outputDir = path.join(__dirname, '../../../../output/rfp-evaluations', rfpId);
    await fsPromises.mkdir(outputDir, { recursive: true });

    const fullEvaluation = {
      metadata: {
        rfpId,
        evaluationDate: new Date().toISOString(),
        version: '2.1.0',
        pdfSkillIntegration: true
      },
      extraction,
      multiPassResults: comprehensiveExtraction,
      equipmentData,
      riskAssessment,
      serviceMapping
    };

    // Save all outputs
    await fsPromises.writeFile(
      path.join(outputDir, 'full-evaluation-comprehensive.json'),
      JSON.stringify(fullEvaluation, null, 2),
      'utf8'
    );

    await fsPromises.writeFile(
      path.join(outputDir, 'hidden-requirements-traps.json'),
      JSON.stringify(comprehensiveExtraction.passes.pass2_traps, null, 2),
      'utf8'
    );

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('     EVALUATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Success! Outputs saved to: ${outputDir}`);
    console.log(`⏱️  Processing time: ${elapsed}s\n`);

    return { success: true, outputDir, rfpId };

  } catch (error) {
    console.error('\n❌ EVALUATION FAILED');
    console.error(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function findEquipmentFiles(directory) {
  try {
    const files = await fsPromises.readdir(directory);
    return files.filter(f => {
      const lower = f.toLowerCase();
      return (lower.endsWith('.xlsx') || lower.endsWith('.csv')) &&
             (lower.includes('equipment') || lower.includes('generator'));
    }).map(f => path.join(directory, f));
  } catch (error) {
    return [];
  }
}

// CLI execution
if (require.main === module) {
  const inputPath = process.argv[2];
  evaluateRFPComprehensive(inputPath)
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = evaluateRFPComprehensive;
