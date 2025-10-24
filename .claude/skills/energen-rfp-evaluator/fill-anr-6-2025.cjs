#!/usr/bin/env node
/**
 * Fill ANR-6-2025 RFP Forms
 * Complete form filling with actual data
 */

const fs = require('fs').promises;
const path = require('path');
const FormExtractor = require('./lib/FormExtractor.cjs');
const ExcelFormFiller = require('./lib/ExcelFormFiller.cjs');
const WordFormFiller = require('./lib/WordFormFiller.cjs');

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     ENERGEN RFP FORM FILLER - ANR-6-2025               ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const rfpDir = 'C:\\ECalc\\active\\energen-calculator-v5.0\\Request for Proposal No. ANR-6-2025 Genertor Services';
    const outputRoot = 'C:\\ECalc\\active\\energen-calculator-v5.0\\output\\rfp-evaluations\\Request-for-Proposal-No--ANR-6-2025-Genertor-Services';

    try {
        // Step 1: Load company data
        console.log('📂 Step 1: Loading company data...');
        const companyDataPath = path.join(__dirname, 'data', 'company-data.json');
        const companyData = JSON.parse(await fs.readFile(companyDataPath, 'utf8'));
        console.log(`   ✅ Company: ${companyData.companyInfo.legalName}`);

        // Step 2: Load RFP evaluation data
        console.log('\n📂 Step 2: Loading RFP data...');
        const equipmentPath = path.join(outputRoot, 'equipment-list.json');
        const bidScopePath = path.join(outputRoot, 'bid-scope-package', 'rfp-bid-scope.json');

        const equipmentData = JSON.parse(await fs.readFile(equipmentPath, 'utf8'));
        const bidScopeData = JSON.parse(await fs.readFile(bidScopePath, 'utf8'));

        console.log(`   ✅ RFP Number: ${bidScopeData.metadata.rfpNumber}`);
        console.log(`   ✅ Equipment: ${equipmentData.generators.length} generators`);
        console.log(`   ✅ Contract: ${bidScopeData.contractStructure.basePeriod} base + ${bidScopeData.contractStructure.optionYears} options`);

        // Combine data for form filling
        const rfpData = {
            metadata: bidScopeData.metadata,
            contractStructure: bidScopeData.contractStructure,
            generators: equipmentData.generators.map(gen => ({
                unitNumber: gen.unitNumber,
                kw: gen.kw,
                make: gen.make,
                model: gen.model,
                // Add mock pricing for now (would come from calculator)
                pricing: {
                    baseYear: calculateMockPricing(gen.kw),
                    optionYears: [
                        calculateMockPricing(gen.kw) * 1.02,  // 2% escalation
                        calculateMockPricing(gen.kw) * 1.04,  // 4% escalation
                        calculateMockPricing(gen.kw) * 1.06   // 6% escalation
                    ]
                }
            }))
        };

        // Step 3: Discover forms
        console.log('\n🔍 Step 3: Discovering fillable forms...');
        const extractor = new FormExtractor();
        const forms = await extractor.discoverForms(rfpDir);

        console.log(`\n   📊 Forms found:`);
        console.log(`      - Excel: ${forms.excel.length}`);
        console.log(`      - Word: ${forms.word.length}`);

        if (forms.metadata.totalFormsFound === 0) {
            console.log('\n⚠️  No fillable forms discovered');
            return;
        }

        // Step 4: Create output directory
        const outputDir = path.join(rfpDir, 'filled-forms');
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`\n📁 Step 4: Output directory created: ${outputDir}`);

        // Step 5: Fill Excel pricing form
        if (forms.excel.length > 0) {
            console.log('\n📊 Step 5: Filling Excel pricing sheet...');
            const excelFiller = new ExcelFormFiller(companyData);

            for (const excelForm of forms.excel) {
                const outputPath = path.join(outputDir, `FILLED-${excelForm.fileName}`);

                console.log(`\n   Processing: ${excelForm.fileName}`);
                console.log(`   Fillable cells: ${excelForm.fillableCells.length}`);

                const result = await excelFiller.fillPricingForm(excelForm, rfpData, outputPath);

                console.log(`   ✅ Saved: ${path.basename(outputPath)}`);

                // Validate
                const validation = await excelFiller.validateFilledForm(outputPath);
                if (validation.valid) {
                    console.log(`   ✅ Validation: PASSED`);
                } else {
                    console.log(`   ⚠️  Validation: ${validation.errors.length} errors`);
                    validation.errors.slice(0, 5).forEach(err => {
                        console.log(`      - ${err.sheet}!${err.cell}: ${err.error}`);
                    });
                }

                if (validation.warnings.length > 0) {
                    console.log(`   ℹ️  Warnings: ${validation.warnings.length} empty cells`);
                }
            }
        }

        // Step 6: Fill Word forms
        if (forms.word.length > 0) {
            console.log('\n📝 Step 6: Filling Word forms...');
            const wordFiller = new WordFormFiller(companyData);

            for (const wordForm of forms.word) {
                const outputPath = path.join(outputDir, `FILLED-${wordForm.fileName}`);

                console.log(`\n   Processing: ${wordForm.fileName}`);
                console.log(`   Fillable fields: ${wordForm.fillableFields.length}`);

                try {
                    const result = await wordFiller.fillForm(wordForm, rfpData, outputPath);
                    console.log(`   ✅ Saved: ${path.basename(result.outputPath)}`);
                    console.log(`   ℹ️  ${result.note}`);
                } catch (error) {
                    console.error(`   ❌ Error: ${error.message}`);
                }
            }
        }

        // Step 7: Generate summary report
        console.log('\n📄 Step 7: Generating submission package report...');
        await generateSummaryReport(forms, outputDir, rfpData, companyData);

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                  ✅ SUCCESS!                            ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        console.log('📁 All filled forms saved to:');
        console.log(`   ${outputDir}\n`);

        console.log('📋 Files created:');
        const files = await fs.readdir(outputDir);
        for (const file of files) {
            console.log(`   - ${file}`);
        }

        console.log('\n📝 Next steps:');
        console.log('   1. Review filled forms for accuracy');
        console.log('   2. Update company-data.json with actual info (currently has placeholders)');
        console.log('   3. Add actual pricing from calculator (currently using mock pricing)');
        console.log('   4. Convert HTML files to DOCX (use LibreOffice or Word)');
        console.log('   5. Add signature images if desired');
        console.log('   6. Package for submission\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * Calculate mock pricing based on kW rating
 * In production, this would come from the calculator
 */
function calculateMockPricing(kw) {
    // Simple tiered pricing model
    if (kw <= 150) return 1800;
    if (kw <= 250) return 2200;
    if (kw <= 350) return 2600;
    if (kw <= 500) return 3200;
    if (kw <= 800) return 4000;
    if (kw <= 1000) return 4800;
    return 5500;
}

/**
 * Generate summary report
 */
async function generateSummaryReport(forms, outputDir, rfpData, companyData) {
    let report = '# RFP SUBMISSION PACKAGE - ANR-6-2025\n\n';
    report += `**RFP Number:** ${rfpData.metadata.rfpNumber}\n`;
    report += `**Project:** ${rfpData.metadata.projectTitle}\n`;
    report += `**Prepared By:** ${companyData.companyInfo.legalName}\n`;
    report += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    report += '---\n\n';

    report += '## FILLED FORMS\n\n';

    if (forms.excel.length > 0) {
        report += `### Excel Pricing Sheets\n\n`;
        for (const form of forms.excel) {
            report += `- ✅ **FILLED-${form.fileName}**\n`;
            report += `  - Total cells filled: ${form.fillableCells.length}\n`;
            report += `  - Generators: ${rfpData.generators.length}\n\n`;
        }
    }

    if (forms.word.length > 0) {
        report += `### Word Forms\n\n`;
        for (const form of forms.word) {
            report += `- ✅ **FILLED-${form.fileName}** (HTML format)\n`;
            report += `  - **Action required:** Convert to DOCX before submission\n\n`;
        }
    }

    report += '## SUBMISSION CHECKLIST\n\n';
    report += '### Required Actions:\n\n';
    report += '- [ ] Update **company-data.json** with actual company information\n';
    report += '- [ ] Replace mock pricing with actual calculator pricing\n';
    report += '- [ ] Review all filled forms for accuracy\n';
    report += '- [ ] Convert Word HTML files to DOCX\n';
    report += '- [ ] Add signature images (optional)\n';
    report += '- [ ] Verify all required fields are complete\n';
    report += '- [ ] Package per RFP submission requirements\n\n';

    report += '### Company Information (Current):\n\n';
    report += `- **Legal Name:** ${companyData.companyInfo.legalName}\n`;
    report += `- **Address:** ${companyData.companyInfo.address.street || '[TO BE FILLED]'}\n`;
    report += `- **Phone:** ${companyData.companyInfo.phone || '[TO BE FILLED]'}\n`;
    report += `- **DUNS:** ${companyData.companyInfo.dunsNumber || '[TO BE FILLED]'}\n\n`;

    report += '### Pricing Summary:\n\n';
    report += `- **Total Generators:** ${rfpData.generators.length}\n`;
    report += `- **Pricing Type:** Mock pricing (needs replacement with actual calculator output)\n`;
    report += `- **Base Period:** ${rfpData.contractStructure.basePeriod} year(s)\n`;
    report += `- **Option Years:** ${rfpData.contractStructure.optionYears}\n\n`;

    report += '---\n\n';
    report += '*Generated by Energen RFP Automated Form Filler v2.0*\n';

    const reportPath = path.join(outputDir, 'SUBMISSION-PACKAGE-README.md');
    await fs.writeFile(reportPath, report);
    console.log(`   ✅ Report saved: SUBMISSION-PACKAGE-README.md`);
}

main();
