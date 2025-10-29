/**
 * RFP Pricing Exporter
 * Fills actual RFP bid templates with calculator-generated pricing
 *
 * @module RFPPricingExporter
 * @version 1.0.0
 */

const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');

/**
 * Exports calculator-verified pricing to RFP bid templates
 * Supports multiple template formats with flexible configuration
 */
class RFPPricingExporter {
  constructor() {
    this.companyInfo = {
      name: 'Energen Systems Inc.',
      license: '1143462',
      address: '150 Mason Circle, Suite K',
      city: 'Concord',
      state: 'CA',
      zip: '94520',
      phone: '(925) 289-8969',
      email: 'service@energensystems.com',
      website: 'https://energensystems.com'
    };
  }

  /**
   * Fill LBNL-style pricing template
   * Template structure: Generator pricing in rows 13-48, columns C/F/I for different years
   *
   * @param {string} templatePath - Path to Excel template
   * @param {Array<Object>} pricingResults - Results from CalculatorAPIClient.calculateBatch()
   * @param {string} outputPath - Where to save filled template
   * @param {Object} options - Export options
   * @param {number} options.escalationRate - Annual escalation rate for option years (default: 0.03)
   * @param {boolean} options.fillOptionYears - Fill option year columns (default: true)
   * @returns {Promise<Object>} Export summary
   */
  async fillLBNLTemplate(templatePath, pricingResults, outputPath, options = {}) {
    console.log('\n📄 Filling LBNL bid template...');
    console.log(`   Template: ${path.basename(templatePath)}`);
    console.log(`   Output: ${path.basename(outputPath)}`);

    const escalationRate = options.escalationRate || 0.03;
    const fillOptionYears = options.fillOptionYears !== false;

    try {
      // Load template
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.getWorksheet('Pricing') || workbook.getWorksheet(1);

      if (!sheet) {
        throw new Error('Could not find Pricing worksheet in template');
      }

      // Fill company information (typical locations)
      this._fillCompanyInfo(sheet);

      // Fill generator pricing (rows 13-48 typically)
      let filledCount = 0;
      let skippedCount = 0;
      let row = 13; // Starting row for generator pricing

      for (const result of pricingResults) {
        if (!result.success) {
          console.log(`   ⚠️  Row ${row}: Skipping ${result.generator.unitNumber || 'Unknown'} - ${result.error}`);
          skippedCount++;
          row++;
          continue;
        }

        const annualPrice = result.calculation.totalAnnualPrice;
        const unitNumber = result.generator.unitNumber || result.generator.number || `Unit ${row - 12}`;

        // Fill generator number/description (Column B)
        const cellB = sheet.getCell(`B${row}`);
        if (!cellB.value || cellB.value === '') {
          cellB.value = unitNumber;
        }

        // Years 1-2 pricing (Column C)
        const cellC = sheet.getCell(`C${row}`);
        cellC.value = annualPrice;
        cellC.numFmt = '$#,##0.00';

        // Unit (Column D)
        const cellD = sheet.getCell(`D${row}`);
        if (!cellD.value) {
          cellD.value = 'EA/Year';
        }

        // Option year pricing with escalation
        if (fillOptionYears) {
          // Option Year 3 (Columns F-G)
          const cellF = sheet.getCell(`F${row}`);
          cellF.value = annualPrice * (1 + escalationRate);
          cellF.numFmt = '$#,##0.00';

          // Option Year 4 (Columns I-J)
          const cellI = sheet.getCell(`I${row}`);
          cellI.value = annualPrice * Math.pow(1 + escalationRate, 2);
          cellI.numFmt = '$#,##0.00';
        }

        filledCount++;
        row++;

        // Stop if we exceed expected range
        if (row > 48) break;
      }

      // Fill date
      const dateCell = sheet.getCell('A6');
      if (dateCell) {
        dateCell.value = new Date().toLocaleDateString('en-US');
      }

      // Save filled template
      await workbook.xlsx.writeFile(outputPath);

      console.log(`\n   ✅ Template filled successfully!`);
      console.log(`      Generators filled: ${filledCount}`);
      console.log(`      Generators skipped: ${skippedCount}`);
      console.log(`      Escalation rate: ${(escalationRate * 100).toFixed(1)}%`);

      return {
        success: true,
        filledCount,
        skippedCount,
        outputPath,
        escalationRate
      };
    } catch (error) {
      console.error(`\n   ❌ Failed to fill template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill generic RFP pricing template with flexible row detection
   *
   * @param {string} templatePath - Path to Excel template
   * @param {Array<Object>} pricingResults - Calculator results
   * @param {string} outputPath - Output file path
   * @param {Object} config - Configuration for template structure
   * @param {string} config.sheetName - Sheet name (default: 'Pricing')
   * @param {number} config.startRow - First data row
   * @param {string} config.priceColumn - Column for annual price (e.g., 'C')
   * @param {string} config.unitColumn - Column for unit number (e.g., 'B')
   * @returns {Promise<Object>} Export summary
   */
  async fillGenericTemplate(templatePath, pricingResults, outputPath, config = {}) {
    console.log('\n📄 Filling generic pricing template...');

    const sheetName = config.sheetName || 'Pricing';
    const startRow = config.startRow || 1;
    const priceColumn = config.priceColumn || 'C';
    const unitColumn = config.unitColumn || 'B';

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.getWorksheet(sheetName) || workbook.getWorksheet(1);

      if (!sheet) {
        throw new Error(`Could not find worksheet: ${sheetName}`);
      }

      let filledCount = 0;
      let row = startRow;

      for (const result of pricingResults) {
        if (!result.success) {
          row++;
          continue;
        }

        // Fill unit number
        const unitCell = sheet.getCell(`${unitColumn}${row}`);
        if (!unitCell.value) {
          unitCell.value = result.generator.unitNumber || result.generator.number;
        }

        // Fill price
        const priceCell = sheet.getCell(`${priceColumn}${row}`);
        priceCell.value = result.calculation.totalAnnualPrice;
        priceCell.numFmt = '$#,##0.00';

        filledCount++;
        row++;
      }

      await workbook.xlsx.writeFile(outputPath);

      console.log(`   ✅ Filled ${filledCount} rows`);

      return {
        success: true,
        filledCount,
        outputPath
      };
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate pricing summary CSV for review
   *
   * @param {Array<Object>} pricingResults - Calculator results
   * @param {string} outputPath - CSV output path
   * @returns {Promise<void>}
   */
  async generateSummaryCSV(pricingResults, outputPath) {
    console.log('\n📊 Generating pricing summary CSV...');

    const headers = [
      'Generator',
      'kW',
      'Fuel Type',
      'Services',
      'Labor Total',
      'Parts Total',
      'Mobilization Total',
      'Tax Total',
      'Annual Total',
      'Status'
    ];

    const rows = pricingResults.map(r => {
      if (!r.success) {
        return [
          r.generator.unitNumber || r.generator.number || 'Unknown',
          r.generator.kwRating || r.generator.kw || 'N/A',
          r.generator.fuelType || 'N/A',
          'N/A',
          0,
          0,
          0,
          0,
          0,
          `ERROR: ${r.error}`
        ];
      }

      const calc = r.calculation;
      const services = Object.keys(calc.services || {}).join(', ');

      return [
        r.generator.unitNumber || r.generator.number || 'Unknown',
        r.generator.kwRating || r.generator.kw,
        r.generator.fuelType || 'Diesel',
        services,
        calc.laborTotal || 0,
        calc.partsTotal || 0,
        calc.mobilizationTotal || 0,
        calc.taxTotal || 0,
        calc.totalAnnualPrice || 0,
        'SUCCESS'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    await fs.writeFile(outputPath, csvContent, 'utf8');

    console.log(`   ✅ CSV saved: ${path.basename(outputPath)}`);
  }

  /**
   * Generate detailed pricing breakdown JSON
   *
   * @param {Array<Object>} pricingResults - Calculator results
   * @param {string} outputPath - JSON output path
   * @param {Object} metadata - Additional metadata to include
   * @returns {Promise<void>}
   */
  async generateDetailedJSON(pricingResults, outputPath, metadata = {}) {
    console.log('\n📋 Generating detailed pricing JSON...');

    const successful = pricingResults.filter(r => r.success);
    const failed = pricingResults.filter(r => !r.success);

    const totals = successful.reduce((acc, r) => {
      const calc = r.calculation;
      return {
        totalAnnual: acc.totalAnnual + (calc.totalAnnualPrice || 0),
        totalLabor: acc.totalLabor + (calc.laborTotal || 0),
        totalParts: acc.totalParts + (calc.partsTotal || 0),
        totalMobilization: acc.totalMobilization + (calc.mobilizationTotal || 0),
        totalTax: acc.totalTax + (calc.taxTotal || 0)
      };
    }, {
      totalAnnual: 0,
      totalLabor: 0,
      totalParts: 0,
      totalMobilization: 0,
      totalTax: 0
    });

    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        calculatorVersion: '5.0.0',
        ...metadata
      },
      summary: {
        totalGenerators: pricingResults.length,
        successfulCalculations: successful.length,
        failedCalculations: failed.length,
        ...totals,
        averagePerGenerator: successful.length > 0 ? totals.totalAnnual / successful.length : 0
      },
      generators: pricingResults.map(r => ({
        unitNumber: r.generator.unitNumber || r.generator.number,
        kwRating: r.generator.kwRating || r.generator.kw,
        fuelType: r.generator.fuelType,
        success: r.success,
        error: r.error || null,
        calculation: r.success ? {
          totalAnnualPrice: r.calculation.totalAnnualPrice,
          laborTotal: r.calculation.laborTotal,
          partsTotal: r.calculation.partsTotal,
          mobilizationTotal: r.calculation.mobilizationTotal,
          taxTotal: r.calculation.taxTotal,
          services: r.calculation.services
        } : null
      }))
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`   ✅ JSON saved: ${path.basename(outputPath)}`);
  }

  /**
   * Fill company information in typical template locations
   * @private
   */
  _fillCompanyInfo(sheet) {
    // Common locations for company info (adjust based on template)
    const companyNameCell = sheet.getCell('A5');
    if (companyNameCell && (!companyNameCell.value || companyNameCell.value === '')) {
      companyNameCell.value = this.companyInfo.name;
    }
  }

  /**
   * Create complete bid package with all export formats
   *
   * @param {string} templatePath - Excel template path
   * @param {Array<Object>} pricingResults - Calculator results
   * @param {string} outputDir - Output directory for all files
   * @param {string} rfpNumber - RFP identifier
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Paths to all generated files
   */
  async createCompleteBidPackage(templatePath, pricingResults, outputDir, rfpNumber, metadata = {}) {
    console.log('\n📦 Creating complete bid package...');
    console.log(`   RFP: ${rfpNumber}`);
    console.log(`   Output directory: ${outputDir}`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const files = {};

    // 1. Filled Excel template
    const excelPath = path.join(outputDir, `${rfpNumber}-Pricing-FILLED.xlsx`);
    await this.fillLBNLTemplate(templatePath, pricingResults, excelPath);
    files.excel = excelPath;

    // 2. Summary CSV
    const csvPath = path.join(outputDir, `${rfpNumber}-pricing-summary.csv`);
    await this.generateSummaryCSV(pricingResults, csvPath);
    files.csv = csvPath;

    // 3. Detailed JSON
    const jsonPath = path.join(outputDir, `${rfpNumber}-pricing-detailed.json`);
    await this.generateDetailedJSON(pricingResults, jsonPath, { rfpNumber, ...metadata });
    files.json = jsonPath;

    console.log('\n✅ Complete bid package created!');
    console.log(`   📁 Files in: ${outputDir}`);
    console.log(`      • ${path.basename(files.excel)}`);
    console.log(`      • ${path.basename(files.csv)}`);
    console.log(`      • ${path.basename(files.json)}`);

    return files;
  }
}

module.exports = { RFPPricingExporter };
