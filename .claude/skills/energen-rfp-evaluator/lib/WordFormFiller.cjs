/**
 * Word Form Filler
 * Fills Word reference and certification forms
 *
 * Handles:
 * - Project reference forms
 * - Certification/compliance forms
 * - Signature placeholders
 * - Date fields
 *
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { Document, Packer, Paragraph, TextRun, ImageRun } = require('docx');
const mammoth = require('mammoth');

class WordFormFiller {
    constructor(companyData) {
        this.companyData = companyData;
    }

    /**
     * Fill Word form with company data
     * @param {Object} formMetadata - From FormExtractor
     * @param {Object} bidData - Additional bid-specific data
     * @param {string} outputPath - Where to save filled form
     */
    async fillForm(formMetadata, bidData, outputPath) {
        console.log(`\n📝 Filling Word form: ${formMetadata.fileName}`);

        // Read original document
        const docBuffer = await fs.readFile(formMetadata.filePath);

        // Extract text content
        const { value: htmlContent } = await mammoth.convertToHtml({
            buffer: docBuffer
        });

        // Parse and fill fields
        let filledContent = htmlContent;

        // Fill detected patterns
        for (const pattern of formMetadata.detectedPatterns) {
            if (pattern.type === 'underlines') {
                filledContent = this._fillUnderlineFields(filledContent, pattern);
            }
            else if (pattern.type === 'brackets') {
                filledContent = this._fillBracketFields(filledContent, pattern);
            }
            else if (pattern.type === 'datePlaceholders') {
                filledContent = this._fillDateFields(filledContent, pattern);
            }
            else if (pattern.type === 'signaturePlaceholders') {
                filledContent = await this._fillSignatureFields(filledContent, pattern);
            }
        }

        // Fill common form fields based on form type
        if (formMetadata.fileName.toLowerCase().includes('reference')) {
            filledContent = this._fillReferenceForm(filledContent, bidData);
        }
        else if (formMetadata.fileName.toLowerCase().includes('cert')) {
            filledContent = this._fillCertificationForm(filledContent);
        }

        // Save filled document
        // Note: For production, would use docx library to preserve formatting
        // This is simplified version using HTML export
        await fs.writeFile(outputPath.replace('.docx', '.html'), filledContent);

        console.log(`   ✅ Filled form saved to: ${outputPath.replace('.docx', '.html')}`);
        console.log(`   ℹ️  Note: Saved as HTML for now. Use LibreOffice for DOCX conversion.`);

        return {
            success: true,
            outputPath: outputPath.replace('.docx', '.html'),
            fieldsFilled: formMetadata.fillableFields.length,
            note: 'HTML format - convert to DOCX with LibreOffice if needed'
        };
    }

    /**
     * Fill underline fields with company data
     */
    _fillUnderlineFields(content, pattern) {
        const companyInfo = this.companyData.companyInfo;

        // Simple replacement strategy - would be more sophisticated in production
        content = content.replace(/_____+/g, (match) => {
            // Determine what to fill based on surrounding context
            return `<span style="border-bottom: 1px solid black; padding: 0 10px;">${companyInfo.legalName}</span>`;
        });

        return content;
    }

    /**
     * Fill bracket fields like [COMPANY NAME]
     */
    _fillBracketFields(content, pattern) {
        const companyInfo = this.companyData.companyInfo;
        const signatures = this.companyData.signatures;

        const replacements = {
            '[COMPANY NAME]': companyInfo.legalName,
            '[COMPANY]': companyInfo.legalName,
            '[CONTRACTOR NAME]': companyInfo.legalName,
            '[CONTRACTOR]': companyInfo.legalName,
            '[ADDRESS]': `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zip}`,
            '[PHONE]': companyInfo.phone,
            '[EMAIL]': companyInfo.email,
            '[DUNS]': companyInfo.dunsNumber,
            '[DUNS NUMBER]': companyInfo.dunsNumber,
            '[CAGE CODE]': companyInfo.cageCode,
            '[AUTHORIZED REPRESENTATIVE]': signatures.authorizedRepresentative.name,
            '[REPRESENTATIVE NAME]': signatures.authorizedRepresentative.name,
            '[TITLE]': signatures.authorizedRepresentative.title
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'gi');
            content = content.replace(regex, value || placeholder);
        }

        return content;
    }

    /**
     * Fill date fields
     */
    _fillDateFields(content, pattern) {
        const today = new Date();
        const formattedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;

        // Replace date placeholders
        content = content.replace(/\[DATE\]/gi, formattedDate);
        content = content.replace(/___\/___\/_____/g, formattedDate);

        // Replace date patterns like __/__/____
        content = content.replace(/__\/__\/____/g, formattedDate);

        return content;
    }

    /**
     * Fill signature fields (placeholder for now)
     */
    async _fillSignatureFields(content, pattern) {
        const signature = this.companyData.signatures.authorizedRepresentative;

        // For HTML output, we'll just put the name
        // In full implementation, would embed signature image
        const signatureText = `<div style="font-family: cursive; font-size: 20px;">${signature.name}</div>`;
        const signatureBlock = `
            ${signatureText}
            <div>${signature.title}</div>
            <div>${new Date().toLocaleDateString()}</div>
        `;

        // Replace signature placeholders
        content = content.replace(/signature.*?:|signed.*?:|__________\s*\(signature\)/gi, signatureBlock);

        return content;
    }

    /**
     * Fill project reference form
     */
    _fillReferenceForm(content, bidData) {
        const references = this.companyData.projectReferences;

        if (!references || references.length === 0) {
            console.log('   ⚠️  No project references in company data');
            return content;
        }

        // Use first 3 references
        const referencesToUse = references.slice(0, 3);

        // Build reference HTML blocks
        let referenceHtml = '<h3>Project References</h3>';

        referencesToUse.forEach((ref, index) => {
            referenceHtml += `
                <div style="margin: 20px 0; border: 1px solid #ccc; padding: 15px;">
                    <h4>Reference ${index + 1}</h4>
                    <p><strong>Client:</strong> ${ref.clientName}</p>
                    <p><strong>Contact:</strong> ${ref.contactName}, ${ref.contactTitle}</p>
                    <p><strong>Phone:</strong> ${ref.contactPhone}</p>
                    <p><strong>Email:</strong> ${ref.contactEmail}</p>
                    <p><strong>Project:</strong> ${ref.projectDescription}</p>
                    <p><strong>Contract Value:</strong> $${ref.contractValue.toLocaleString()}</p>
                    <p><strong>Period:</strong> ${ref.startDate} to ${ref.endDate}</p>
                    <p><strong>Services:</strong> ${ref.servicesProvided.join(', ')}</p>
                    <p><strong>Generators:</strong> ${ref.numberOfGenerators} units (${ref.kwRange})</p>
                </div>
            `;
        });

        // Insert before closing body tag
        content = content.replace('</body>', `${referenceHtml}</body>`);

        console.log(`   ✅ Filled ${referencesToUse.length} project references`);

        return content;
    }

    /**
     * Fill certification form
     */
    _fillCertificationForm(content) {
        const companyInfo = this.companyData.companyInfo;
        const licenses = this.companyData.licenses;
        const certifications = this.companyData.certifications;
        const insurance = this.companyData.insurance;

        // Build certifications block
        let certsHtml = '<div style="margin: 20px 0;">';
        certsHtml += '<h3>Certifications and Compliance</h3>';

        // Licenses
        if (licenses.california.c10Electrical.number) {
            certsHtml += `<p>✓ California C-10 Electrical License: ${licenses.california.c10Electrical.number}</p>`;
        }
        if (licenses.california.c38Refrigeration.number) {
            certsHtml += `<p>✓ California C-38 Refrigeration License: ${licenses.california.c38Refrigeration.number}</p>`;
        }

        // NFPA 70E
        if (certifications.nfpa70e.certified) {
            certsHtml += `<p>✓ NFPA 70E Certified (${certifications.nfpa70e.certifiedTechnicians.length} technicians)</p>`;
        }

        // Manufacturer authorizations
        for (const [mfg, auth] of Object.entries(certifications.manufacturerAuthorizations)) {
            if (auth.authorized) {
                certsHtml += `<p>✓ ${mfg.charAt(0).toUpperCase() + mfg.slice(1)} Authorized Service: ${auth.authorizationNumber}</p>`;
            }
        }

        // Insurance
        certsHtml += '<h4>Insurance Coverage</h4>';
        certsHtml += `<p>General Liability: $${insurance.generalLiability.coveragePerOccurrence.toLocaleString()} per occurrence</p>`;
        certsHtml += `<p>Auto Liability: $${insurance.automobileLiability.combinedSingleLimit.toLocaleString()} combined single limit</p>`;
        certsHtml += `<p>Workers Comp: $${insurance.workersCompensation.employersLiability.toLocaleString()} employers liability</p>`;

        if (insurance.excessLiability) {
            certsHtml += `<p>Excess Liability: $${insurance.excessLiability.umbrellaLimit.toLocaleString()} umbrella</p>`;
        }

        certsHtml += '</div>';

        // Insert into content
        content = content.replace('</body>', `${certsHtml}</body>`);

        console.log(`   ✅ Filled certification information`);

        return content;
    }

    /**
     * Create DOCX from filled HTML using LibreOffice (if available)
     */
    async convertToDOCX(htmlPath, docxPath) {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            // Try to use LibreOffice headless mode
            const process = spawn('soffice', [
                '--headless',
                '--convert-to', 'docx',
                '--outdir', path.dirname(docxPath),
                htmlPath
            ]);

            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`   ✅ Converted to DOCX: ${docxPath}`);
                    resolve(docxPath);
                } else {
                    reject(new Error(`LibreOffice conversion failed with code ${code}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`LibreOffice not available: ${err.message}`));
            });
        });
    }
}

module.exports = WordFormFiller;
