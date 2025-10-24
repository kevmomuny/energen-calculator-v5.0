#!/usr/bin/env node
/**
 * Fill RFP Forms
 * Main CLI script for automated form filling
 *
 * Takes RFP evaluation data and company information, then:
 * 1. Discovers fillable forms in RFP package
 * 2. Fills Excel pricing sheets
 * 3. Fills Word reference/certification forms
 * 4. Adds digital signatures
 * 5. Generates submission-ready documents
 *
 * Usage:
 *   node fill-rfp-forms.cjs <rfp-evaluation-dir> [company-data.json]
 *
 * Example:
 *   node fill-rfp-forms.cjs "C:/path/to/Request for Proposal No. ANR-6-2025 Genertor Services"
 *   node fill-rfp-forms.cjs "C:/path/to/rfp" "C:/path/to/company-data.json"
 */

const fs = require('fs').promises;
const path = require('path');
const FormExtractor = require('../lib/FormExtractor.cjs');
const ExcelFormFiller = require('../lib/ExcelFormFiller.cjs');
const WordFormFiller = require('../lib/WordFormFiller.cjs');
const SignatureManager = require('../lib/SignatureManager.cjs');

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║           ENERGEN RFP AUTOMATED FORM FILLER             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Parse arguments
    const rfpDir = process.argv[2];
    const companyDataPath = process.argv[3] || path.join(__dirname, '../data/company-data.json');

    if (!rfpDir) {
        console.error('❌ Usage: node fill-rfp-forms.cjs <rfp-evaluation-dir> [company-data.json]');
        console.error('\nExample:');
        console.error('  node fill-rfp-forms.cjs "C:/path/to/Request for Proposal No. ANR-6-2025 Genertor Services"');
        process.exit(1);
    }

    try {
        // Step 1: Load company data
        console.log('📂 Loading company data...');
        const companyData = await loadCompanyData(companyDataPath);
        console.log(`   ✅ Loaded company: ${companyData.companyInfo.legalName}`);

        // Step 2: Load RFP evaluation data
        console.log('\n📂 Loading RFP evaluation data...');
        const rfpEvaluation = await loadRFPEvaluation(rfpDir);
        console.log(`   ✅ RFP: ${rfpEvaluation.metadata.rfpNumber}`);
        console.log(`   ✅ Generators: ${rfpEvaluation.generators?.length || 0}`);

        // Step 3: Discover fillable forms
        console.log('\n🔍 Discovering fillable forms...');
        const extractor = new FormExtractor();
        const forms = await extractor.discoverForms(rfpDir);

        if (forms.metadata.totalFormsFound === 0) {
            console.log('\n⚠️  No fillable forms found in RFP directory');
            console.log('   Looking for:');
            console.log('   - Excel files with orange/yellow highlighted cells');
            console.log('   - Word files with underlines or placeholders');
            console.log('   - PDF files with form fields');
            return;
        }

        // Step 4: Create output directory
        const outputDir = path.join(rfpDir, 'filled-forms');
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`\n📁 Output directory: ${outputDir}`);

        // Step 5: Fill Excel forms
        if (forms.excel.length > 0) {
            console.log('\n📊 Filling Excel pricing sheets...');
            const excelFiller = new ExcelFormFiller(companyData);

            for (const excelForm of forms.excel) {
                const outputPath = path.join(
                    outputDir,
                    `FILLED-${excelForm.fileName}`
                );

                try {
                    const result = await excelFiller.fillPricingForm(
                        excelForm,
                        rfpEvaluation,
                        outputPath
                    );

                    // Add signatures if applicable
                    if (result.success) {
                        await addSignaturesToExcel(outputPath, companyData);
                    }

                    // Validate filled form
                    const validation = await excelFiller.validateFilledForm(outputPath);
                    if (!validation.valid) {
                        console.log(`   ⚠️  Validation errors:`);
                        validation.errors.forEach(err => {
                            console.log(`      - ${err.sheet}!${err.cell}: ${err.error}`);
                        });
                    }

                } catch (error) {
                    console.error(`   ❌ Error filling ${excelForm.fileName}: ${error.message}`);
                }
            }
        }

        // Step 6: Fill Word forms
        if (forms.word.length > 0) {
            console.log('\n📝 Filling Word forms...');
            const wordFiller = new WordFormFiller(companyData);

            for (const wordForm of forms.word) {
                const outputPath = path.join(
                    outputDir,
                    `FILLED-${wordForm.fileName}`
                );

                try {
                    const result = await wordFiller.fillForm(
                        wordForm,
                        rfpEvaluation,
                        outputPath
                    );

                    console.log(`   ${result.note}`);

                } catch (error) {
                    console.error(`   ❌ Error filling ${wordForm.fileName}: ${error.message}`);
                }
            }
        }

        // Step 7: Generate submission package report
        await generateSubmissionReport(forms, outputDir, rfpEvaluation, companyData);

        console.log('\n✅ SUCCESS! Forms filled and ready for review');
        console.log(`\n📁 All filled forms saved to: ${outputDir}`);
        console.log('\n📋 Next steps:');
        console.log('   1. Review all filled forms for accuracy');
        console.log('   2. Convert Word HTML files to DOCX (use LibreOffice)');
        console.log('   3. Manually verify signatures are correct');
        console.log('   4. Check all pricing calculations');
        console.log('   5. Package forms according to RFP submission requirements');

    } catch (error) {
        console.error('\n❌ Error filling forms:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * Load company data from JSON file
 */
async function loadCompanyData(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const companyData = JSON.parse(data);

        // Validate required fields
        if (!companyData.companyInfo || !companyData.companyInfo.legalName) {
            throw new Error('Invalid company data: missing companyInfo.legalName');
        }

        return companyData;

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`\n❌ Company data file not found: ${filePath}`);
            console.error('\nPlease create company-data.json with your company information.');
            console.error('Use the template: .claude/skills/energen-rfp-evaluator/data/company-data-template.json');
        }
        throw error;
    }
}

/**
 * Load RFP evaluation data
 */
async function loadRFPEvaluation(rfpDir) {
    // Try different possible locations
    const possiblePaths = [
        path.join(rfpDir, 'bid-scope-package/rfp-bid-scope.json'),
        path.join(rfpDir, 'bid-pricing-package/generators-for-v5-calc.json'),
        path.join(rfpDir, 'full-evaluation-comprehensive.json')
    ];

    for (const filePath of possiblePaths) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Try next path
            continue;
        }
    }

    throw new Error(`Could not find RFP evaluation data in: ${rfpDir}`);
}

/**
 * Add signatures to Excel workbook
 */
async function addSignaturesToExcel(filePath, companyData) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const signatureManager = new SignatureManager(companyData);

    // Try to add signature to first sheet at bottom
    const firstSheet = workbook.worksheets[0];
    if (firstSheet) {
        const lastRow = firstSheet.rowCount;

        // Add signature 3 rows below last content
        const signatureRow = lastRow + 3;

        try {
            await signatureManager.addSignatureToExcel(
                workbook,
                firstSheet.name,
                `B${signatureRow}`,
                'authorizedRepresentative'
            );

            // Save updated workbook
            await workbook.xlsx.writeFile(filePath);

        } catch (error) {
            // Signature addition optional - don't fail if it doesn't work
            console.log(`   ℹ️  Could not add signature: ${error.message}`);
        }
    }
}

/**
 * Generate submission package report
 */
async function generateSubmissionReport(forms, outputDir, rfpEvaluation, companyData) {
    let report = '# RFP SUBMISSION PACKAGE\n\n';
    report += `**RFP Number:** ${rfpEvaluation.metadata?.rfpNumber || 'Unknown'}\n`;
    report += `**Prepared For:** ${rfpEvaluation.metadata?.projectTitle || 'Unknown'}\n`;
    report += `**Prepared By:** ${companyData.companyInfo.legalName}\n`;
    report += `**Submission Date:** ${new Date().toLocaleDateString()}\n\n`;
    report += '---\n\n';

    report += '## FILLED FORMS\n\n';

    if (forms.excel.length > 0) {
        report += `### Excel Pricing Sheets (${forms.excel.length})\n\n`;
        for (const form of forms.excel) {
            report += `- ✅ FILLED-${form.fileName}\n`;
            report += `  - Fillable cells: ${form.fillableCells.length}\n`;
            report += `  - Sheets: ${form.sheets.map(s => s.name).join(', ')}\n`;
        }
        report += '\n';
    }

    if (forms.word.length > 0) {
        report += `### Word Forms (${forms.word.length})\n\n`;
        for (const form of forms.word) {
            report += `- ✅ FILLED-${form.fileName}\n`;
            report += `  - Fillable fields: ${form.fillableFields.length}\n`;
            report += `  - **Note:** Saved as HTML - convert to DOCX before submission\n`;
        }
        report += '\n';
    }

    report += '## SUBMISSION CHECKLIST\n\n';
    report += '### Before Submission:\n\n';
    report += '- [ ] Review all filled forms for accuracy\n';
    report += '- [ ] Verify company information is correct\n';
    report += '- [ ] Check all pricing calculations\n';
    report += '- [ ] Confirm signatures are present and correct\n';
    report += '- [ ] Convert Word HTML files to DOCX format\n';
    report += '- [ ] Ensure all required forms are included\n';
    report += '- [ ] Check file naming conventions per RFP requirements\n';
    report += '- [ ] Create submission package per RFP instructions\n';
    report += '- [ ] Verify submission deadline\n\n';

    report += '### Company Information Included:\n\n';
    report += `- **Legal Name:** ${companyData.companyInfo.legalName}\n`;
    report += `- **DUNS:** ${companyData.companyInfo.dunsNumber || 'Not provided'}\n`;
    report += `- **CAGE Code:** ${companyData.companyInfo.cageCode || 'Not provided'}\n`;

    if (companyData.licenses?.california?.c10Electrical?.number) {
        report += `- **CA C-10 License:** ${companyData.licenses.california.c10Electrical.number}\n`;
    }

    report += '\n### Authorized Representative:\n\n';
    const signer = companyData.signatures.authorizedRepresentative;
    report += `- **Name:** ${signer.name}\n`;
    report += `- **Title:** ${signer.title}\n`;
    report += `- **Email:** ${signer.email}\n`;
    report += `- **Phone:** ${signer.phone}\n`;

    report += '\n---\n\n';
    report += '*Generated by Energen RFP Automated Form Filler*\n';

    const reportPath = path.join(outputDir, 'SUBMISSION-PACKAGE-README.md');
    await fs.writeFile(reportPath, report);

    console.log(`\n📄 Submission package report: ${reportPath}`);
}

main().catch(console.error);
