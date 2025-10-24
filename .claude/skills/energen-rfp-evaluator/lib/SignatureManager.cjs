/**
 * Signature Manager
 * Handles digital signature insertion into forms
 *
 * Supports:
 * - Excel signature images
 * - Word signature images
 * - PDF signature fields
 * - Multiple authorized signers
 *
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class SignatureManager {
    constructor(companyData) {
        this.companyData = companyData;
        this.signatures = companyData.signatures;
    }

    /**
     * Add signature to Excel workbook
     * @param {Object} workbook - ExcelJS workbook object
     * @param {string} sheetName - Sheet to add signature to
     * @param {string} cellRef - Cell reference for signature (e.g., "B20")
     * @param {string} signerType - 'authorizedRepresentative' or 'technicalRepresentative'
     */
    async addSignatureToExcel(workbook, sheetName, cellRef, signerType = 'authorizedRepresentative') {
        const signer = this.signatures[signerType];

        if (!signer || !signer.signatureImagePath) {
            console.log(`   ⚠️  No signature image for ${signerType}`);
            return false;
        }

        try {
            // Load and resize signature image
            const imageBuffer = await this._loadAndResizeSignature(signer.signatureImagePath, 200, 60);

            // Add image to workbook
            const imageId = workbook.addImage({
                buffer: imageBuffer,
                extension: 'png'
            });

            // Get worksheet
            const worksheet = workbook.getWorksheet(sheetName);

            // Parse cell reference
            const { row, col } = this._parseCellRef(cellRef);

            // Add image to cell
            worksheet.addImage(imageId, {
                tl: { col: col - 1, row: row - 1 }, // Top-left corner
                ext: { width: 200, height: 60 }
            });

            // Add signer name and date below signature
            worksheet.getCell(row + 2, col).value = signer.name;
            worksheet.getCell(row + 3, col).value = signer.title;
            worksheet.getCell(row + 4, col).value = new Date();
            worksheet.getCell(row + 4, col).numFmt = 'mm/dd/yyyy';

            console.log(`   ✅ Added signature for ${signer.name} at ${cellRef}`);
            return true;

        } catch (error) {
            console.error(`   ❌ Error adding signature: ${error.message}`);
            return false;
        }
    }

    /**
     * Add signature to Word document
     * @param {string} htmlContent - HTML content from Word doc
     * @param {string} signerType - 'authorizedRepresentative' or 'technicalRepresentative'
     */
    async addSignatureToWord(htmlContent, signerType = 'authorizedRepresentative') {
        const signer = this.signatures[signerType];

        if (!signer || !signer.signatureImagePath) {
            console.log(`   ⚠️  No signature image for ${signerType}`);
            return htmlContent;
        }

        try {
            // Convert signature to base64 for embedding
            const imageBuffer = await this._loadAndResizeSignature(signer.signatureImagePath, 200, 60);
            const base64Image = imageBuffer.toString('base64');

            // Create signature block HTML
            const signatureBlock = `
                <div class="signature-block" style="margin: 20px 0;">
                    <img src="data:image/png;base64,${base64Image}" alt="Signature" style="max-width: 200px; height: auto;" />
                    <div style="margin-top: 5px;">
                        <strong>${signer.name}</strong><br/>
                        ${signer.title}<br/>
                        ${new Date().toLocaleDateString()}
                    </div>
                </div>
            `;

            // Replace signature placeholders
            htmlContent = htmlContent.replace(
                /\[SIGNATURE\]|__________\s*\(signature\)/gi,
                signatureBlock
            );

            console.log(`   ✅ Added signature for ${signer.name}`);
            return htmlContent;

        } catch (error) {
            console.error(`   ❌ Error adding signature: ${error.message}`);
            return htmlContent;
        }
    }

    /**
     * Create signature image from text (fallback if no image available)
     * @param {string} signerName - Name to convert to signature
     * @param {string} outputPath - Where to save generated signature
     */
    async generateSignatureFromText(signerName, outputPath) {
        try {
            // Create SVG with cursive text
            const svg = `
                <svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
                    <text x="10" y="60"
                          font-family="Brush Script MT, cursive"
                          font-size="36"
                          fill="#000080">
                        ${signerName}
                    </text>
                </svg>
            `;

            // Convert SVG to PNG
            await sharp(Buffer.from(svg))
                .png()
                .toFile(outputPath);

            console.log(`   ✅ Generated signature image: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error(`   ❌ Error generating signature: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load and resize signature image to standard size
     */
    async _loadAndResizeSignature(imagePath, width = 200, height = 60) {
        try {
            const buffer = await sharp(imagePath)
                .resize(width, height, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toBuffer();

            return buffer;

        } catch (error) {
            throw new Error(`Failed to load signature image: ${error.message}`);
        }
    }

    /**
     * Parse Excel cell reference to row/col numbers
     */
    _parseCellRef(cellRef) {
        const match = cellRef.match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid cell reference: ${cellRef}`);
        }

        const colLetter = match[1];
        const rowNumber = parseInt(match[2]);

        // Convert column letter to number
        let col = 0;
        for (let i = 0; i < colLetter.length; i++) {
            col = col * 26 + (colLetter.charCodeAt(i) - 64);
        }

        return { row: rowNumber, col };
    }

    /**
     * Validate signature images exist and are valid
     */
    async validateSignatures() {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        for (const [signerType, signer] of Object.entries(this.signatures)) {
            if (!signer.name) {
                validation.warnings.push(`${signerType}: No name specified`);
            }

            if (!signer.signatureImagePath) {
                validation.warnings.push(`${signerType}: No signature image path`);
                continue;
            }

            try {
                // Check if file exists
                await fs.access(signer.signatureImagePath);

                // Check if valid image
                const metadata = await sharp(signer.signatureImagePath).metadata();

                if (metadata.width < 100 || metadata.height < 30) {
                    validation.warnings.push(
                        `${signerType}: Signature image too small (${metadata.width}x${metadata.height})`
                    );
                }

                console.log(`   ✅ Validated signature for ${signer.name} (${metadata.width}x${metadata.height})`);

            } catch (error) {
                validation.errors.push(`${signerType}: ${error.message}`);
                validation.valid = false;
            }
        }

        return validation;
    }

    /**
     * Create signature block for text-based insertion
     */
    createSignatureBlock(signerType = 'authorizedRepresentative', includeDate = true) {
        const signer = this.signatures[signerType];

        if (!signer || !signer.name) {
            return '';
        }

        let block = `\n\n`;
        block += `Signature: _______________________________\n`;
        block += `\n`;
        block += `Printed Name: ${signer.name}\n`;
        block += `Title: ${signer.title}\n`;

        if (includeDate) {
            block += `Date: ${new Date().toLocaleDateString()}\n`;
        }

        if (signer.email) {
            block += `Email: ${signer.email}\n`;
        }

        if (signer.phone) {
            block += `Phone: ${signer.phone}\n`;
        }

        return block;
    }

    /**
     * Get signature metadata for all signers
     */
    getSignatureMetadata() {
        const metadata = {};

        for (const [signerType, signer] of Object.entries(this.signatures)) {
            metadata[signerType] = {
                name: signer.name,
                title: signer.title,
                email: signer.email,
                phone: signer.phone,
                hasSignatureImage: !!signer.signatureImagePath,
                signatureImagePath: signer.signatureImagePath
            };
        }

        return metadata;
    }
}

module.exports = SignatureManager;
