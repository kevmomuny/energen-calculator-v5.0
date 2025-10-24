/**
 * Example: Convert RFP Evaluation Markdown to PDF
 *
 * This script demonstrates how to convert RFP evaluation output
 * from the energen-rfp-evaluator skill into a professional PDF.
 *
 * Usage:
 *   node examples/rfp-to-pdf.js "P2540009-Fish-and-Game-Lake-Merced"
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get RFP name from command line
const rfpName = process.argv[2] || 'P2540009-Fish-and-Game-Lake-Merced';

// Paths
const basePath = 'C:/ECalc/active/energen-calculator-v5.0/output/rfp-evaluations';
const rfpPath = path.join(basePath, rfpName);
const mdPath = path.join(rfpPath, 'executive-summary.md');
const pdfPath = path.join(rfpPath, 'executive-summary.pdf');
const cliPath = 'C:/ECalc/active/energen-md-formatter/cli/generate-pdf.js';

console.log('🔄 Converting RFP evaluation to PDF...\n');
console.log(`📁 Input:  ${mdPath}`);
console.log(`📄 Output: ${pdfPath}\n`);

// Run PDF generator
const proc = spawn('node', [
  cliPath,
  '-i', mdPath,
  '-o', pdfPath,
  '--template', 'energen-formal',
  '--tier', 'comfortable'
], {
  stdio: 'inherit'
});

proc.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ PDF generation complete!');
    console.log(`📄 PDF saved to: ${pdfPath}`);
  } else {
    console.error(`\n❌ PDF generation failed with code ${code}`);
  }
});
