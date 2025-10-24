/**
 * Phase 1 Setup Verification Script
 * Run this to verify all Phase 1 components are properly installed
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('RFP Processor - Phase 1 Setup Verification');
console.log('='.repeat(60));

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${description}`);
    checks.passed++;
    return true;
  } else {
    console.log(`✗ ${description} - NOT FOUND`);
    checks.failed++;
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    console.log(`✓ ${description}`);
    checks.passed++;
    return true;
  } else {
    console.log(`✗ ${description} - NOT FOUND`);
    checks.failed++;
    return false;
  }
}

function checkModule(moduleName) {
  try {
    require.resolve(moduleName);
    console.log(`✓ ${moduleName} installed`);
    checks.passed++;
    return true;
  } catch (e) {
    console.log(`✗ ${moduleName} NOT installed`);
    checks.failed++;
    return false;
  }
}

console.log('\n1. Core Service Files:');
checkFile('RFPProcessingService.cjs', 'RFPProcessingService.cjs');
checkFile('AIExtractionEngine.cjs', 'AIExtractionEngine.cjs');
checkFile('ServiceMappingEngine.cjs', 'ServiceMappingEngine.cjs');
checkFile('DocumentSplitter.cjs', 'DocumentSplitter.cjs');
checkFile('FormGenerator.cjs', 'FormGenerator.cjs');
checkFile('ValidationService.cjs', 'ValidationService.cjs');

console.log('\n2. Configuration Files:');
checkFile('config.cjs', 'config.cjs');
checkFile('index.cjs', 'index.cjs');

console.log('\n3. Schema Files:');
checkFile('schemas/rfp-extraction-schema.json', 'rfp-extraction-schema.json');
checkFile('schemas/service-mapping-schema.json', 'service-mapping-schema.json');

console.log('\n4. Working Directories:');
checkDirectory('../../temp/rfp-processing', 'temp/rfp-processing');
checkDirectory('../../temp/rfp-uploads', 'temp/rfp-uploads');
checkDirectory('../../output/rfp-processed', 'output/rfp-processed');

console.log('\n5. Required Dependencies:');
checkModule('@anthropic-ai/sdk');
checkModule('pdf-lib');
checkModule('pdf-parse');
checkModule('archiver');
checkModule('multer');
checkModule('express');

console.log('\n6. Module Loading Test:');
try {
  const rfpProcessor = require('./index.cjs');
  if (rfpProcessor.RFPProcessingService && 
      rfpProcessor.AIExtractionEngine &&
      rfpProcessor.config) {
    console.log('✓ Module exports working correctly');
    checks.passed++;
  } else {
    console.log('✗ Module exports incomplete');
    checks.failed++;
  }
} catch (e) {
  console.log(`✗ Module loading failed: ${e.message}`);
  checks.failed++;
}

console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY:');
console.log(`Passed: ${checks.passed}`);
console.log(`Failed: ${checks.failed}`);
console.log(`Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n✓ Phase 1 Setup Complete - Ready for Phase 2 Implementation');
  process.exit(0);
} else {
  console.log('\n✗ Setup Incomplete - Please address failures above');
  process.exit(1);
}
