/**
 * Excel Form Filler
 * Fills Excel pricing sheets with bid data
 *
 * Handles:
 * - Multi-year pricing tables
 * - Per-unit pricing rows
 * - Formula preservation
 * - Company information headers
 *
 * @version 1.0.0
 */

const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');

class ExcelFormFiller {
    constructor(companyData) {
        this.companyData = companyData;
    }

    /**
     * Fill pricing Excel form with bid data
     * @param {Object} formMetadata - From FormExtractor
     * @param {Object} bidData - Pricing data from RFP evaluation
     * @param {string} outputPath - Where to save filled form
     */
    async fillPricingForm(formMetadata, bidData, outputPath) {
        console.log(`\n📝 Filling Excel form: ${formMetadata.fileName}`);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(formMetadata.filePath);

        // Fill each sheet
        for (const sheetInfo of formMetadata.sheets) {
            const worksheet = workbook.getWorksheet(sheetInfo.name);

            console.log(`   📋 Processing sheet: ${sheetInfo.name}`);

            // Group fillable cells by type
            const cellGroups = this._groupCellsByType(sheetInfo.fillableCells);

            // Fill company information cells
            if (cellGroups.company.length > 0) {
                this._fillCompanyInfo(worksheet, cellGroups.company);
            }

            // Fill pricing cells
            if (cellGroups.pricing.length > 0) {
                await this._fillPricingData(worksheet, cellGroups.pricing, bidData);
            }

            // Fill labor rate cells
            if (cellGroups.laborRates.length > 0) {
                this._fillLaborRates(worksheet, cellGroups.laborRates);
            }

            // Fill date cells
            if (cellGroups.dates.length > 0) {
                this._fillDates(worksheet, cellGroups.dates);
            }
        }

        // Save filled workbook
        await workbook.xlsx.writeFile(outputPath);
        console.log(`   ✅ Filled form saved to: ${outputPath}`);

        return {
            success: true,
            outputPath,
            cellsFilled: formMetadata.fillableCells.length
        };
    }

    /**
     * Group fillable cells by their purpose
     */
    _groupCellsByType(fillableCells) {
        const groups = {
            company: [],
            pricing: [],
            laborRates: [],
            dates: [],
            other: []
        };

        for (const cell of fillableCells) {
            const label = (cell.label || '').toLowerCase();

            if (label.includes('company') || label.includes('contractor') ||
                label.includes('name') || label.includes('address')) {
                groups.company.push(cell);
            }
            else if (label.includes('price') || label.includes('cost') ||
                     label.includes('unit') || cell.dataType === 'currency') {
                groups.pricing.push(cell);
            }
            else if (label.includes('labor') || label.includes('rate') ||
                     label.includes('hourly')) {
                groups.laborRates.push(cell);
            }
            else if (label.includes('date') || cell.dataType === 'date') {
                groups.dates.push(cell);
            }
            else {
                groups.other.push(cell);
            }
        }

        return groups;
    }

    /**
     * Fill company information cells
     */
    _fillCompanyInfo(worksheet, companyCells) {
        console.log(`      → Filling ${companyCells.length} company info cells`);

        const companyInfo = this.companyData.companyInfo;

        for (const cellInfo of companyCells) {
            const label = (cellInfo.label || '').toLowerCase();
            let value = null;

            if (label.includes('name') && !label.includes('contact')) {
                value = companyInfo.legalName;
            }
            else if (label.includes('address') && label.includes('street')) {
                value = companyInfo.address.street;
            }
            else if (label.includes('city')) {
                value = companyInfo.address.city;
            }
            else if (label.includes('state')) {
                value = companyInfo.address.state;
            }
            else if (label.includes('zip')) {
                value = companyInfo.address.zip;
            }
            else if (label.includes('phone')) {
                value = companyInfo.phone;
            }
            else if (label.includes('email')) {
                value = companyInfo.email;
            }
            else if (label.includes('duns')) {
                value = companyInfo.dunsNumber;
            }
            else if (label.includes('cage')) {
                value = companyInfo.cageCode;
            }

            if (value) {
                const cell = worksheet.getCell(cellInfo.row, cellInfo.col);
                cell.value = value;
            }
        }
    }

    /**
     * Fill pricing data cells
     */
    async _fillPricingData(worksheet, pricingCells, bidData) {
        console.log(`      → Filling ${pricingCells.length} pricing cells`);

        // For RFP pricing sheets, we need to:
        // 1. Identify which rows correspond to which generators
        // 2. Fill per-unit pricing across base + option years
        // 3. Preserve formulas for totals

        // Group pricing cells by row (each row = one generator)
        const rowGroups = {};
        for (const cell of pricingCells) {
            if (!rowGroups[cell.row]) {
                rowGroups[cell.row] = [];
            }
            rowGroups[cell.row].push(cell);
        }

        // Match rows to generators from bidData
        for (const [rowNum, cells] of Object.entries(rowGroups)) {
            // Try to find generator unit number in same row
            const unitCell = this._findUnitNumberCell(worksheet, parseInt(rowNum));

            if (unitCell) {
                const generator = bidData.generators.find(g =>
                    g.unitNumber === unitCell.toString()
                );

                if (generator && generator.pricing) {
                    // Fill pricing for this generator across years
                    this._fillGeneratorPricing(worksheet, cells, generator.pricing);
                }
            }
        }
    }

    /**
     * Find unit number cell in same row
     */
    _findUnitNumberCell(worksheet, row) {
        // Check first few columns for unit number
        for (let col = 1; col <= 5; col++) {
            const cell = worksheet.getCell(row, col);
            if (cell.value && typeof cell.value === 'string') {
                // Look for patterns like "Unit 02", "EG 068", etc.
                const match = cell.value.match(/(?:Unit\s+)?(\d+[A-Z]*|EG\s+\d+)/i);
                if (match) {
                    return match[1];
                }
            }
        }
        return null;
    }

    /**
     * Fill pricing for one generator across all years
     */
    _fillGeneratorPricing(worksheet, cells, pricing) {
        // Cells should be ordered by column (base year, option year 1, 2, 3...)
        cells.sort((a, b) => a.col - b.col);

        const yearlyPricing = [
            pricing.baseYear,
            ...(pricing.optionYears || [])
        ];

        cells.forEach((cellInfo, index) => {
            if (yearlyPricing[index]) {
                const cell = worksheet.getCell(cellInfo.row, cellInfo.col);

                // Only fill if not a formula
                if (!cell.formula) {
                    cell.value = yearlyPricing[index];

                    // Apply currency formatting
                    cell.numFmt = '$#,##0.00';
                }
            }
        });
    }

    /**
     * Fill labor rate cells
     */
    _fillLaborRates(worksheet, laborCells) {
        console.log(`      → Filling ${laborCells.length} labor rate cells`);

        const laborRates = this.companyData.pricing.laborRates;

        for (const cellInfo of laborCells) {
            const label = (cellInfo.label || '').toLowerCase();
            let value = null;

            if (label.includes('journeyman') || label.includes('standard')) {
                value = laborRates.regularTime.journeymanElectrician;
            }
            else if (label.includes('master')) {
                value = laborRates.regularTime.masterElectrician;
            }
            else if (label.includes('overtime')) {
                value = laborRates.regularTime.journeymanElectrician * laborRates.overtime.multiplier;
            }
            else if (label.includes('emergency')) {
                value = laborRates.regularTime.journeymanElectrician * laborRates.emergency.multiplier;
            }
            else if (label.includes('markup') || label.includes('materials')) {
                value = this.companyData.pricing.materialsMarkup;
            }

            if (value) {
                const cell = worksheet.getCell(cellInfo.row, cellInfo.col);
                cell.value = value;

                // Format as currency or percentage
                if (label.includes('markup') || label.includes('%')) {
                    cell.numFmt = '0.00%';
                    cell.value = value / 100; // Convert to decimal for percentage
                } else {
                    cell.numFmt = '$#,##0.00';
                }
            }
        }
    }

    /**
     * Fill date cells
     */
    _fillDates(worksheet, dateCells) {
        console.log(`      → Filling ${dateCells.length} date cells`);

        const today = new Date();

        for (const cellInfo of dateCells) {
            const label = (cellInfo.label || '').toLowerCase();

            // Use today's date for submission dates
            if (label.includes('submit') || label.includes('prepared')) {
                const cell = worksheet.getCell(cellInfo.row, cellInfo.col);
                cell.value = today;
                cell.numFmt = 'mm/dd/yyyy';
            }
        }
    }

    /**
     * Validate filled form
     */
    async validateFilledForm(filePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        workbook.eachSheet((worksheet) => {
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    // Check for error values
                    if (cell.value && cell.value.error) {
                        validation.errors.push({
                            sheet: worksheet.name,
                            cell: cell.address,
                            error: `Formula error: ${cell.value.error}`
                        });
                        validation.valid = false;
                    }

                    // Check for obviously missing required fields
                    if (cell.style?.fill?.fgColor?.argb && !cell.value) {
                        validation.warnings.push({
                            sheet: worksheet.name,
                            cell: cell.address,
                            warning: 'Highlighted cell still empty'
                        });
                    }
                });
            });
        });

        return validation;
    }
}

module.exports = ExcelFormFiller;
