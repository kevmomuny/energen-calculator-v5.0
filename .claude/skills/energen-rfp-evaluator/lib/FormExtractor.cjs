/**
 * Form Extractor
 * Identifies and extracts fillable forms from RFP packages
 *
 * Discovers:
 * - Excel pricing sheets (cells with orange/yellow highlighting)
 * - Word reference forms (fields with underlines or form controls)
 * - PDF forms (fillable form fields)
 *
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

class FormExtractor {
    constructor() {
        this.supportedFormats = {
            excel: ['.xlsx', '.xlsm', '.xls'],
            word: ['.docx', '.doc'],
            pdf: ['.pdf']
        };

        // Color codes for fillable cells (typically orange/yellow highlighting)
        this.fillableColors = {
            orange: 'FFFFC000',
            lightOrange: 'FFFFCC99',
            yellow: 'FFFFFF00',
            lightYellow: 'FFFFFFCC'
        };
    }

    /**
     * Scan RFP directory for fillable forms
     * @param {string} rfpDir - Path to RFP evaluation directory
     * @returns {Object} Discovered forms organized by type
     */
    async discoverForms(rfpDir) {
        console.log(`\n🔍 Scanning for fillable forms in: ${rfpDir}`);

        const forms = {
            excel: [],
            word: [],
            pdf: [],
            metadata: {
                rfpDir,
                scannedAt: new Date().toISOString(),
                totalFormsFound: 0
            }
        };

        try {
            // Read directory contents
            const files = await fs.readdir(rfpDir);

            for (const file of files) {
                const filePath = path.join(rfpDir, file);
                const stat = await fs.stat(filePath);

                if (stat.isDirectory()) continue;

                const ext = path.extname(file).toLowerCase();

                // Check Excel files
                if (this.supportedFormats.excel.includes(ext)) {
                    const excelForm = await this.analyzeExcelForm(filePath);
                    if (excelForm.fillableCells.length > 0) {
                        forms.excel.push(excelForm);
                        console.log(`   ✅ Excel form: ${file} (${excelForm.fillableCells.length} fillable cells)`);
                    }
                }

                // Check Word files
                else if (this.supportedFormats.word.includes(ext)) {
                    const wordForm = await this.analyzeWordForm(filePath);
                    if (wordForm.fillableFields.length > 0) {
                        forms.word.push(wordForm);
                        console.log(`   ✅ Word form: ${file} (${wordForm.fillableFields.length} fillable fields)`);
                    }
                }

                // Check PDF files
                else if (this.supportedFormats.pdf.includes(ext)) {
                    // PDF form analysis - placeholder for now
                    console.log(`   ℹ️  PDF: ${file} (analysis not yet implemented)`);
                }
            }

            forms.metadata.totalFormsFound = forms.excel.length + forms.word.length + forms.pdf.length;
            console.log(`\n📊 Total fillable forms found: ${forms.metadata.totalFormsFound}`);

            return forms;

        } catch (error) {
            console.error(`❌ Error scanning directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze Excel file for fillable cells
     * @param {string} filePath - Path to Excel file
     * @returns {Object} Form metadata and fillable cell locations
     */
    async analyzeExcelForm(filePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const form = {
            filePath,
            fileName: path.basename(filePath),
            type: 'excel',
            fillableCells: [],
            sheets: []
        };

        workbook.eachSheet((worksheet, sheetId) => {
            const sheetInfo = {
                name: worksheet.name,
                index: sheetId,
                fillableCells: []
            };

            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    // Check if cell has fill color (orange/yellow = fillable)
                    const fill = cell.style?.fill;
                    if (fill && fill.type === 'pattern' && fill.fgColor) {
                        const color = fill.fgColor.argb;

                        // Check if color matches fillable indicators
                        if (Object.values(this.fillableColors).includes(color)) {
                            const cellRef = this._getCellReference(rowNumber, colNumber);
                            const cellInfo = {
                                ref: cellRef,
                                row: rowNumber,
                                col: colNumber,
                                colLetter: this._getColumnLetter(colNumber),
                                value: cell.value,
                                dataType: this._inferDataType(cell),
                                fillColor: color,
                                label: this._findCellLabel(worksheet, rowNumber, colNumber)
                            };

                            sheetInfo.fillableCells.push(cellInfo);
                            form.fillableCells.push({
                                ...cellInfo,
                                sheet: worksheet.name
                            });
                        }
                    }
                });
            });

            if (sheetInfo.fillableCells.length > 0) {
                form.sheets.push(sheetInfo);
            }
        });

        return form;
    }

    /**
     * Analyze Word document for fillable fields
     * @param {string} filePath - Path to Word file
     * @returns {Object} Form metadata and fillable field locations
     */
    async analyzeWordForm(filePath) {
        // For Word forms, we'll look for common patterns:
        // - Content controls
        // - Form fields
        // - Underlined blanks (_____)
        // - Bracketed placeholders [INSERT TEXT]

        const form = {
            filePath,
            fileName: path.basename(filePath),
            type: 'word',
            fillableFields: [],
            detectedPatterns: []
        };

        try {
            // Read file as buffer for basic pattern detection
            const buffer = await fs.readFile(filePath);
            const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));

            // Detect common form field patterns
            const patterns = {
                underlines: /_____+/g,
                brackets: /\[[\w\s]+\]/g,
                parentheses: /\([\w\s]+\)/g,
                datePlaceholders: /\d{2}\/\d{2}\/\d{4}|\[DATE\]|___\/___\/_____/gi,
                signaturePlaceholders: /signature.*?:|signed.*?:|__________\s*\(signature\)/gi
            };

            for (const [patternName, regex] of Object.entries(patterns)) {
                const matches = content.match(regex);
                if (matches && matches.length > 0) {
                    form.detectedPatterns.push({
                        type: patternName,
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    });

                    // Create fillable fields from detected patterns
                    matches.forEach((match, idx) => {
                        form.fillableFields.push({
                            id: `${patternName}_${idx}`,
                            type: patternName,
                            placeholder: match,
                            dataType: this._inferWordFieldType(patternName)
                        });
                    });
                }
            }

            return form;

        } catch (error) {
            console.error(`Error analyzing Word form ${filePath}:`, error.message);
            return form;
        }
    }

    /**
     * Get cell reference (e.g., "A1", "B5")
     */
    _getCellReference(row, col) {
        return `${this._getColumnLetter(col)}${row}`;
    }

    /**
     * Convert column number to letter (1 = A, 2 = B, etc.)
     */
    _getColumnLetter(col) {
        let letter = '';
        while (col > 0) {
            const remainder = (col - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            col = Math.floor((col - 1) / 26);
        }
        return letter;
    }

    /**
     * Infer data type from Excel cell
     */
    _inferDataType(cell) {
        if (cell.numFmt && cell.numFmt.includes('$')) return 'currency';
        if (cell.numFmt && cell.numFmt.includes('%')) return 'percentage';
        if (cell.numFmt && cell.numFmt.includes('date')) return 'date';
        if (typeof cell.value === 'number') return 'number';
        if (typeof cell.value === 'string') return 'text';
        if (cell.value && cell.value.formula) return 'formula';
        return 'unknown';
    }

    /**
     * Find label for fillable cell (look left and up)
     */
    _findCellLabel(worksheet, row, col) {
        // Check cell to the left
        if (col > 1) {
            const leftCell = worksheet.getCell(row, col - 1);
            if (leftCell.value && typeof leftCell.value === 'string') {
                return leftCell.value;
            }
        }

        // Check cell above
        if (row > 1) {
            const aboveCell = worksheet.getCell(row - 1, col);
            if (aboveCell.value && typeof aboveCell.value === 'string') {
                return aboveCell.value;
            }
        }

        return null;
    }

    /**
     * Infer data type for Word field
     */
    _inferWordFieldType(patternName) {
        const typeMap = {
            underlines: 'text',
            brackets: 'text',
            parentheses: 'text',
            datePlaceholders: 'date',
            signaturePlaceholders: 'signature'
        };
        return typeMap[patternName] || 'text';
    }

    /**
     * Generate form analysis report
     */
    async generateFormReport(forms, outputPath) {
        let report = '# RFP FORMS ANALYSIS REPORT\n\n';
        report += `**Scanned Directory:** ${forms.metadata.rfpDir}\n`;
        report += `**Scan Date:** ${new Date(forms.metadata.scannedAt).toLocaleString()}\n`;
        report += `**Total Forms Found:** ${forms.metadata.totalFormsFound}\n\n`;
        report += '---\n\n';

        // Excel forms
        if (forms.excel.length > 0) {
            report += `## EXCEL FORMS (${forms.excel.length})\n\n`;
            for (const form of forms.excel) {
                report += `### ${form.fileName}\n\n`;
                report += `**Total Fillable Cells:** ${form.fillableCells.length}\n\n`;

                for (const sheet of form.sheets) {
                    report += `**Sheet:** ${sheet.name}\n\n`;
                    report += `| Cell | Label | Type |\n`;
                    report += `|------|-------|------|\n`;

                    for (const cell of sheet.fillableCells.slice(0, 20)) {
                        const label = cell.label || '(no label)';
                        report += `| ${cell.ref} | ${label} | ${cell.dataType} |\n`;
                    }

                    if (sheet.fillableCells.length > 20) {
                        report += `\n*...and ${sheet.fillableCells.length - 20} more cells*\n`;
                    }
                    report += '\n';
                }
            }
        }

        // Word forms
        if (forms.word.length > 0) {
            report += `## WORD FORMS (${forms.word.length})\n\n`;
            for (const form of forms.word) {
                report += `### ${form.fileName}\n\n`;
                report += `**Total Fillable Fields:** ${form.fillableFields.length}\n\n`;

                if (form.detectedPatterns.length > 0) {
                    report += `**Detected Patterns:**\n\n`;
                    for (const pattern of form.detectedPatterns) {
                        report += `- **${pattern.type}**: ${pattern.count} occurrences\n`;
                        report += `  - Examples: ${pattern.examples.join(', ')}\n`;
                    }
                    report += '\n';
                }
            }
        }

        await fs.writeFile(outputPath, report);
        console.log(`\n📄 Form analysis report saved to: ${outputPath}`);
    }
}

module.exports = FormExtractor;
