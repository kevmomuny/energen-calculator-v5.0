/**
 * evaluate-rfp.cjs - Main RFP Evaluation Orchestrator
 *
 * Coordinates the full RFP evaluation workflow:
 * 1. Extract data using AIExtractionEngine
 * 2. Parse equipment files if present
 * 3. Run risk assessment
 * 4. Map services to Energen categories
 * 5. Generate executive summary
 * 6. Create compliance checklist
 * 7. Save all outputs
 *
 * Usage:
 *   node evaluate-rfp.cjs "path/to/rfp/folder"
 *   node evaluate-rfp.cjs "path/to/rfp.pdf"
 *
 * @version 1.0.0
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const pdfParse = require('pdf-parse');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// Import modules
const { AIExtractionEngine } = require('../../../../modules/rfp-processor/AIExtractionEngine.cjs');
const analyzeEquipment = require('./analyze-equipment.cjs');
const assessRisks = require('./assess-risks.cjs');
const mapServices = require('./map-services-to-energen.cjs');
const generateSummary = require('./generate-executive-summary.cjs');
const createChecklist = require('./create-compliance-checklist.cjs');

/**
 * Main evaluation function
 */
async function evaluateRFP(inputPath) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('     ENERGEN RFP EVALUATION ENGINE v1.0');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Validate input
    if (!inputPath) {
      throw new Error('Input path required. Usage: node evaluate-rfp.cjs "path/to/rfp"');
    }

    const absolutePath = path.resolve(inputPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Input path not found: ${absolutePath}`);
    }

    const stats = await fsPromises.stat(absolutePath);
    const isDirectory = stats.isDirectory();

    console.log(`📁 Input: ${absolutePath}`);
    console.log(`   Type: ${isDirectory ? 'Directory' : 'File'}\n`);

    // Step 1: Find and read PDF files
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: EXTRACTING RFP DATA');
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

    // Extract text from main RFP PDF (use first/primary PDF)
    const mainPDF = pdfFiles[0];
    console.log(`   📄 Primary document: ${path.basename(mainPDF)}`);

    // Read PDF text using pdf-parse
    let pdfText = '';
    try {
      console.log(`   📖 Extracting text from PDF...`);
      const dataBuffer = await fsPromises.readFile(mainPDF);
      const data = await pdfParse(dataBuffer);
      pdfText = data.text;
      console.log(`   ✅ Extracted ${data.numpages} pages, ${pdfText.length.toLocaleString()} characters`);

      if (pdfText.length < 500) {
        console.log(`   ⚠️  Warning: Very little text extracted. PDF may be scanned images.`);
      }
    } catch (error) {
      throw new Error(`Failed to extract PDF text: ${error.message}`);
    }

    // Initialize AI Extraction Engine
    const extractor = new AIExtractionEngine({
      apiKey: process.env.ANTHROPIC_API_KEY,
      enableCaching: true,
      outputDir: path.join(__dirname, '../../../../output/extractions')
    });

    // Extract structured data
    const extraction = await extractor.extractFromText(pdfText, {
      fileName: path.basename(mainPDF),
      pageCount: Math.ceil(pdfText.length / 2000),
      source: rfpId
    });

    if (!extraction || extraction.error) {
      throw new Error(`Extraction failed: ${extraction?.error || 'Unknown error'}`);
    }

    console.log(`   ✅ Extraction complete (Confidence: ${(extraction.confidence * 100).toFixed(1)}%)`);

    // Step 2: Parse equipment files
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: PARSING EQUIPMENT LIST');
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

    // Step 3: Risk assessment
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: ASSESSING RISKS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const riskAssessment = await assessRisks(extraction, equipmentData);
    console.log(`   ✅ Risk assessment complete`);
    console.log(`   Overall Risk: ${riskAssessment.overallScore.toFixed(2)}/10 (${riskAssessment.riskLevel})`);

    // Step 4: Service mapping
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: MAPPING SERVICES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const serviceMapping = await mapServices(extraction.services);
    console.log(`   ✅ Mapped ${serviceMapping.mappedServices.length} services`);
    console.log(`   High confidence: ${serviceMapping.summary.highConfidence}`);
    console.log(`   Needs review: ${serviceMapping.summary.requiresReview}`);

    // Step 5: Create output directory
    const outputDir = path.join(__dirname, '../../../../output/rfp-evaluations', rfpId);
    await fsPromises.mkdir(outputDir, { recursive: true });
    console.log(`\n📂 Output directory: ${outputDir}`);

    // Step 6: Save full evaluation JSON
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: GENERATING OUTPUTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const fullEvaluation = {
      metadata: {
        rfpId,
        evaluationDate: new Date().toISOString(),
        inputPath: absolutePath,
        version: '1.0.0'
      },
      extraction,
      equipmentData,
      riskAssessment,
      serviceMapping
    };

    const evalPath = path.join(outputDir, 'full-evaluation.json');
    await fsPromises.writeFile(evalPath, JSON.stringify(fullEvaluation, null, 2), 'utf8');
    console.log(`   ✅ 1/6: full-evaluation.json`);

    // Save equipment list
    if (equipmentData) {
      const equipPath = path.join(outputDir, 'equipment-list.json');
      await fsPromises.writeFile(equipPath, JSON.stringify(equipmentData, null, 2), 'utf8');
      console.log(`   ✅ 2/6: equipment-list.json`);
    } else {
      console.log(`   ⊝  2/6: equipment-list.json (skipped - no data)`);
    }

    // Save risk assessment
    const riskPath = path.join(outputDir, 'risk-assessment.json');
    await fsPromises.writeFile(riskPath, JSON.stringify(riskAssessment, null, 2), 'utf8');
    console.log(`   ✅ 3/6: risk-assessment.json`);

    // Save service mapping
    const servicePath = path.join(outputDir, 'service-mapping.json');
    await fsPromises.writeFile(servicePath, JSON.stringify(serviceMapping, null, 2), 'utf8');
    console.log(`   ✅ 4/6: service-mapping.json`);

    // Generate executive summary
    const summaryMd = await generateSummary(fullEvaluation);
    const summaryPath = path.join(outputDir, 'executive-summary.md');
    await fsPromises.writeFile(summaryPath, summaryMd, 'utf8');
    console.log(`   ✅ 5/6: executive-summary.md`);

    // Generate compliance checklist
    const checklistMd = await createChecklist(extraction);
    const checklistPath = path.join(outputDir, 'compliance-checklist.md');
    await fsPromises.writeFile(checklistPath, checklistMd, 'utf8');
    console.log(`   ✅ 6/6: compliance-checklist.md`);

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('     EVALUATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Success! All outputs saved to:`);
    console.log(`   ${outputDir}\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Services mapped: ${serviceMapping.mappedServices.length}`);
    console.log(`   - Risk level: ${riskAssessment.riskLevel}`);
    console.log(`   - Confidence: ${(extraction.confidence * 100).toFixed(1)}%`);
    console.log(`   - Processing time: ${elapsed}s\n`);

    return {
      success: true,
      outputDir,
      rfpId,
      summary: {
        services: serviceMapping.mappedServices.length,
        riskLevel: riskAssessment.riskLevel,
        confidence: extraction.confidence
      }
    };

  } catch (error) {
    console.error('\n❌ EVALUATION FAILED');
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

  evaluateRFP(inputPath)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = evaluateRFP;
