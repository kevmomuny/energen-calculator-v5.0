/**
 * evaluate-rfp-comprehensive.cjs - Enhanced Multi-Pass RFP Evaluator
 *
 * Uses MultiPassExtractionEngine for zero-hallucination comprehensive analysis.
 *
 * Key Improvements over evaluate-rfp.cjs:
 * 1. Multi-pass extraction (main + traps + secondary docs)
 * 2. Cross-document conflict detection and resolution
 * 3. Specialized trap detection for hidden requirements
 * 4. ALL PDFs processed (not just first one)
 * 5. Document hierarchy awareness (addenda > contracts > main RFP)
 *
 * Usage:
 *   node evaluate-rfp-comprehensive.cjs "path/to/rfp/folder"
 *   node evaluate-rfp-comprehensive.cjs "path/to/rfp.pdf"
 *
 * @version 2.0.0
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const pdfParse = require('pdf-parse');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// Import modules
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
  console.log('     ENERGEN RFP COMPREHENSIVE EVALUATOR v2.0');
  console.log('     Multi-Pass Zero-Hallucination Analysis');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Validate input
    if (!inputPath) {
      throw new Error('Input path required. Usage: node evaluate-rfp-comprehensive.cjs "path/to/rfp"');
    }

    const absolutePath = path.resolve(inputPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Input path not found: ${absolutePath}`);
    }

    const stats = await fsPromises.stat(absolutePath);
    const isDirectory = stats.isDirectory();

    console.log(`📁 Input: ${absolutePath}`);
    console.log(`   Type: ${isDirectory ? 'Directory' : 'File'}\n`);

    // Step 1: Find and classify ALL PDF files
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

    // Extract and classify all PDFs
    console.log(`\n   Extracting text from ${pdfFiles.length} PDF(s)...\n`);

    const pdfDocuments = [];

    for (const pdfPath of pdfFiles) {
      const fileName = path.basename(pdfPath);
      console.log(`   📄 Processing: ${fileName}`);

      try {
        const dataBuffer = await fsPromises.readFile(pdfPath);
        const data = await pdfParse(dataBuffer);

        const classification = classifyDocumentType(fileName);

        pdfDocuments.push({
          fileName: fileName,
          filePath: pdfPath,
          text: data.text,
          pageCount: data.numpages,
          type: classification.type,
          priority: classification.priority
        });

        console.log(`      ✅ Extracted ${data.numpages} pages (${data.text.length.toLocaleString()} chars)`);
        console.log(`      📋 Classified as: ${classification.type.toUpperCase()} (priority: ${classification.priority})`);

        if (data.text.length < 500) {
          console.log(`      ⚠️  Warning: Very little text. PDF may be scanned images.`);
        }
      } catch (error) {
        console.log(`      ❌ Failed to extract: ${error.message}`);
      }
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
        console.log(`   Continuing without equipment data...`);
      }
    } else {
      console.log(`   ℹ️  No equipment files found (*.xlsx, *.csv)`);
    }

    // Step 4: Risk assessment (now with trap data)
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
    console.log(`   High confidence: ${serviceMapping.summary.highConfidence}`);
    console.log(`   Needs review: ${serviceMapping.summary.requiresReview}`);

    // Step 6: Create output directory
    const outputDir = path.join(__dirname, '../../../../output/rfp-evaluations', rfpId);
    await fsPromises.mkdir(outputDir, { recursive: true });
    console.log(`\n📂 Output directory: ${outputDir}`);

    // Step 7: Save comprehensive evaluation
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: GENERATING COMPREHENSIVE OUTPUTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const fullEvaluation = {
      metadata: {
        rfpId,
        evaluationDate: new Date().toISOString(),
        inputPath: absolutePath,
        version: '2.0.0',
        documentsProcessed: pdfDocuments.length,
        evaluationEngine: 'multi-pass-comprehensive'
      },
      extraction,
      multiPassResults: comprehensiveExtraction,
      equipmentData,
      riskAssessment,
      serviceMapping
    };

    // Save full comprehensive evaluation
    const evalPath = path.join(outputDir, 'full-evaluation-comprehensive.json');
    await fsPromises.writeFile(evalPath, JSON.stringify(fullEvaluation, null, 2), 'utf8');
    console.log(`   ✅ 1/8: full-evaluation-comprehensive.json`);

    // Save trap detection results separately for easy review
    const trapPath = path.join(outputDir, 'hidden-requirements-traps.json');
    await fsPromises.writeFile(trapPath, JSON.stringify(comprehensiveExtraction.passes.pass2_traps, null, 2), 'utf8');
    console.log(`   ✅ 2/8: hidden-requirements-traps.json`);

    // Save conflicts (if any)
    if (comprehensiveExtraction.conflicts.length > 0) {
      const conflictPath = path.join(outputDir, 'conflicts-detected.json');
      await fsPromises.writeFile(conflictPath, JSON.stringify({
        conflicts: comprehensiveExtraction.conflicts,
        resolved: comprehensiveExtraction.resolvedConflicts
      }, null, 2), 'utf8');
      console.log(`   ✅ 3/8: conflicts-detected.json`);
    } else {
      console.log(`   ⊝  3/8: conflicts-detected.json (no conflicts found)`);
    }

    // Save equipment list
    if (equipmentData) {
      const equipPath = path.join(outputDir, 'equipment-list.json');
      await fsPromises.writeFile(equipPath, JSON.stringify(equipmentData, null, 2), 'utf8');
      console.log(`   ✅ 4/8: equipment-list.json`);
    } else {
      console.log(`   ⊝  4/8: equipment-list.json (no data)`);
    }

    // Save risk assessment
    const riskPath = path.join(outputDir, 'risk-assessment.json');
    await fsPromises.writeFile(riskPath, JSON.stringify(riskAssessment, null, 2), 'utf8');
    console.log(`   ✅ 5/8: risk-assessment.json`);

    // Save service mapping
    const servicePath = path.join(outputDir, 'service-mapping.json');
    await fsPromises.writeFile(servicePath, JSON.stringify(serviceMapping, null, 2), 'utf8');
    console.log(`   ✅ 6/8: service-mapping.json`);

    // Generate executive summary
    const summaryMd = await generateSummary(fullEvaluation);
    const summaryPath = path.join(outputDir, 'executive-summary.md');
    await fsPromises.writeFile(summaryPath, summaryMd, 'utf8');
    console.log(`   ✅ 7/8: executive-summary.md`);

    // Generate compliance checklist
    const checklistMd = await createChecklist(extraction);
    const checklistPath = path.join(outputDir, 'compliance-checklist.md');
    await fsPromises.writeFile(checklistPath, checklistMd, 'utf8');
    console.log(`   ✅ 8/8: compliance-checklist.md`);

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('     COMPREHENSIVE EVALUATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Success! All outputs saved to:`);
    console.log(`   ${outputDir}\n`);
    console.log(`📊 Comprehensive Summary:`);
    console.log(`   - Documents analyzed: ${pdfDocuments.length}`);
    console.log(`   - Services mapped: ${serviceMapping.mappedServices.length}`);
    console.log(`   - Hidden traps found: ${comprehensiveExtraction.passes.pass2_traps.summary?.totalTrapsFound || 0}`);
    console.log(`   - Conflicts detected: ${comprehensiveExtraction.conflicts.length}`);
    console.log(`   - Risk level: ${riskAssessment.riskLevel}`);
    console.log(`   - Overall confidence: ${(comprehensiveExtraction.confidence * 100).toFixed(1)}%`);
    console.log(`   - Processing time: ${elapsed}s\n`);

    // Highlight critical traps
    const criticalTraps = comprehensiveExtraction.passes.pass2_traps.summary?.criticalMissableItems || [];
    if (criticalTraps.length > 0) {
      console.log(`⚠️  CRITICAL HIDDEN REQUIREMENTS FOUND:`);
      criticalTraps.forEach((trap, i) => {
        console.log(`   ${i + 1}. ${trap}`);
      });
      console.log('');
    }

    return {
      success: true,
      outputDir,
      rfpId,
      summary: {
        documentsProcessed: pdfDocuments.length,
        services: serviceMapping.mappedServices.length,
        trapsFound: comprehensiveExtraction.passes.pass2_traps.summary?.totalTrapsFound || 0,
        conflicts: comprehensiveExtraction.conflicts.length,
        riskLevel: riskAssessment.riskLevel,
        confidence: comprehensiveExtraction.confidence
      }
    };

  } catch (error) {
    console.error('\n❌ COMPREHENSIVE EVALUATION FAILED');
    console.error(`   Error: ${error.message}`);
    console.error(`\n${error.stack}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find equipment files in directory
 */
async function findEquipmentFiles(directory) {
  try {
    const files = await fsPromises.readdir(directory);
    return files.filter(f => {
      const lower = f.toLowerCase();
      return (lower.endsWith('.xlsx') || lower.endsWith('.csv')) &&
             (lower.includes('equipment') || lower.includes('generator') || lower.match(/^\d+-/));
    }).map(f => path.join(directory, f));
  } catch (error) {
    return [];
  }
}

// CLI execution
if (require.main === module) {
  const inputPath = process.argv[2];

  evaluateRFPComprehensive(inputPath)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = evaluateRFPComprehensive;
