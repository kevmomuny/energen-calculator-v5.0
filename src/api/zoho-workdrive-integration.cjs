/**
 * Zoho WorkDrive Integration - Cloud Document Storage
 * Manages PDF uploads, downloads, and sync with Zoho WorkDrive
 *
 * @module src/api/zoho-workdrive-integration
 * @version 5.0.0
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ZohoWorkDriveIntegration {
    constructor(zohoAuth, logger = null) {
        this.zohoAuth = zohoAuth; // Reuse existing ZohoDirectIntegration for token management
        this.logger = logger || console;
        this.apiDomain = 'https://www.zohoapis.com';
        this.workDriveBaseUrl = `${this.apiDomain}/workdrive/api/v1`;

        // Configuration from .env
        this.teamId = process.env.ZOHO_WORKDRIVE_TEAM_ID;
        this.workspaceId = process.env.ZOHO_WORKDRIVE_WORKSPACE_ID;
        this.quoteFolderId = process.env.ZOHO_WORKDRIVE_QUOTES_FOLDER_ID;
    }

    /**
     * Make authenticated API request to WorkDrive
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method
     * @param {*} body - Request body (FormData or plain object)
     * @param {boolean} isFormData - Whether body is FormData
     * @returns {Promise<Object>} API response
     */
    async makeApiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
        try {
            const token = await this.zohoAuth.getAccessToken();
            const url = `${this.workDriveBaseUrl}${endpoint}`;

            const options = {
                method,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${token}`
                }
            };

            if (isFormData) {
                // FormData sets its own Content-Type with boundary
                options.body = body;
                // Let FormData set the headers
                Object.assign(options.headers, body.getHeaders());
            } else if (body && method !== 'GET') {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`[WORKDRIVE] API error ${response.status}:`, errorText);
                throw new Error(`WorkDrive API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('[WORKDRIVE] Request failed:', error.message);
            throw error;
        }
    }

    /**
     * Upload PDF to WorkDrive
     * @param {string} localFilePath - Absolute path to local PDF
     * @param {string} filename - Desired filename in WorkDrive
     * @returns {Promise<Object>} File metadata from WorkDrive
     */
    async uploadPDF(localFilePath, filename) {
        try {
            this.logger.info(`[WORKDRIVE] Uploading ${filename}...`);

            // Verify file exists
            if (!fsSync.existsSync(localFilePath)) {
                throw new Error(`File not found: ${localFilePath}`);
            }

            // Verify quotes folder is configured
            if (!this.quoteFolderId) {
                throw new Error('ZOHO_WORKDRIVE_QUOTES_FOLDER_ID not configured. Run setup-zoho-workdrive.cjs first.');
            }

            // Read file from local filesystem
            const fileBuffer = await fs.readFile(localFilePath);

            // Create FormData
            const formData = new FormData();
            formData.append('content', fileBuffer, {
                filename: filename,
                contentType: 'application/pdf'
            });
            formData.append('parent_id', this.quoteFolderId);
            formData.append('override-name-exist', 'true');

            // Upload to WorkDrive
            const response = await this.makeApiRequest('/upload', 'POST', formData, true);

            if (!response.data || !response.data[0]) {
                throw new Error('Invalid response from WorkDrive upload');
            }

            const fileData = response.data[0];
            const metadata = {
                workdriveFileId: fileData.id,
                workdriveName: fileData.attributes.name,
                workdrivePermalink: fileData.attributes.permalink,
                workdriveSize: fileData.attributes.size,
                workdriveCreatedTime: fileData.attributes.created_time,
                workdriveModifiedTime: fileData.attributes.modified_time
            };

            this.logger.info(`[WORKDRIVE] ✅ PDF uploaded: ${filename} (ID: ${fileData.id})`);
            return metadata;

        } catch (error) {
            this.logger.error(`[WORKDRIVE] ❌ Upload failed for ${filename}:`, error.message);
            throw error;
        }
    }

    /**
     * List all PDFs in quotes folder
     * @returns {Promise<Array>} Array of PDF metadata objects
     */
    async listPDFs() {
        try {
            if (!this.quoteFolderId) {
                throw new Error('ZOHO_WORKDRIVE_QUOTES_FOLDER_ID not configured');
            }

            const response = await this.makeApiRequest(
                `/files/${this.quoteFolderId}/files?page[limit]=100`,
                'GET'
            );

            // Filter for PDFs only
            const pdfs = (response.data || [])
                .filter(file => file.attributes.name.endsWith('.pdf'))
                .map(file => ({
                    id: file.id,
                    filename: file.attributes.name,
                    size: file.attributes.size,
                    createdAt: file.attributes.created_time,
                    modifiedAt: file.attributes.modified_time,
                    permalink: file.attributes.permalink,
                    downloadUrl: `${this.workDriveBaseUrl}/files/${file.id}/download`,
                    embedUrl: file.attributes.embed_url || null
                }));

            this.logger.info(`[WORKDRIVE] Found ${pdfs.length} PDFs`);
            return pdfs;

        } catch (error) {
            this.logger.error('[WORKDRIVE] ❌ List failed:', error.message);
            throw error;
        }
    }

    /**
     * Download PDF from WorkDrive
     * @param {string} fileId - WorkDrive file ID
     * @param {string} savePath - Local path to save file
     * @returns {Promise<string>} Path to saved file
     */
    async downloadPDF(fileId, savePath) {
        try {
            const token = await this.zohoAuth.getAccessToken();
            const url = `${this.workDriveBaseUrl}/files/${fileId}/download`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const buffer = await response.buffer();
            await fs.writeFile(savePath, buffer);

            this.logger.info(`[WORKDRIVE] ✅ Downloaded to: ${savePath}`);
            return savePath;

        } catch (error) {
            this.logger.error('[WORKDRIVE] ❌ Download failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete PDF from WorkDrive
     * @param {string} fileId - WorkDrive file ID
     * @returns {Promise<Object>} Success status
     */
    async deletePDF(fileId) {
        try {
            await this.makeApiRequest(`/files/${fileId}`, 'DELETE');
            this.logger.info(`[WORKDRIVE] ✅ Deleted file: ${fileId}`);
            return { success: true };
        } catch (error) {
            this.logger.error('[WORKDRIVE] ❌ Delete failed:', error.message);
            throw error;
        }
    }

    /**
     * Search PDFs by customer name or bid number
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of matching PDFs
     */
    async searchPDFs(query) {
        try {
            const response = await this.makeApiRequest(
                `/search?query=${encodeURIComponent(query)}&search_type=file&page[limit]=50`,
                'GET'
            );

            // Filter for PDFs in quotes folder only
            const pdfs = (response.data || [])
                .filter(file =>
                    file.attributes.name.endsWith('.pdf') &&
                    file.attributes.parent_id === this.quoteFolderId
                )
                .map(file => ({
                    id: file.id,
                    filename: file.attributes.name,
                    size: file.attributes.size,
                    createdAt: file.attributes.created_time,
                    permalink: file.attributes.permalink
                }));

            this.logger.info(`[WORKDRIVE] Search "${query}" found ${pdfs.length} PDFs`);
            return pdfs;

        } catch (error) {
            this.logger.error('[WORKDRIVE] ❌ Search failed:', error.message);
            throw error;
        }
    }

    /**
     * Setup: Create "Energen Quotes" folder if not exists
     * @returns {Promise<string>} Folder ID
     */
    async setupQuotesFolder() {
        try {
            // Check if folder already exists (quoteFolderId in env)
            if (this.quoteFolderId) {
                this.logger.info(`[WORKDRIVE] Using existing quotes folder: ${this.quoteFolderId}`);
                return this.quoteFolderId;
            }

            if (!this.workspaceId) {
                throw new Error('ZOHO_WORKDRIVE_WORKSPACE_ID not configured. Cannot create folder.');
            }

            // Create new folder
            const response = await this.makeApiRequest('/files', 'POST', {
                data: {
                    attributes: {
                        name: 'Energen Quotes',
                        parent_id: this.workspaceId // Root of workspace
                    }
                }
            });

            const folderId = response.data.id;
            this.logger.info(`[WORKDRIVE] ✅ Created quotes folder: ${folderId}`);
            this.logger.info(`[WORKDRIVE] Add to .env: ZOHO_WORKDRIVE_QUOTES_FOLDER_ID=${folderId}`);

            return folderId;

        } catch (error) {
            this.logger.error('[WORKDRIVE] ❌ Setup failed:', error.message);
            throw error;
        }
    }

    /**
     * Get file metadata
     * @param {string} fileId - WorkDrive file ID
     * @returns {Promise<Object>} File metadata
     */
    async getFileMetadata(fileId) {
        try {
            const response = await this.makeApiRequest(`/files/${fileId}`, 'GET');

            const file = response.data;
            return {
                id: file.id,
                filename: file.attributes.name,
                size: file.attributes.size,
                createdAt: file.attributes.created_time,
                modifiedAt: file.attributes.modified_time,
                permalink: file.attributes.permalink,
                parent_id: file.attributes.parent_id
            };
        } catch (error) {
            this.logger.error(`[WORKDRIVE] ❌ Failed to get metadata for ${fileId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get embeddable link for file preview
     * @param {string} fileId - WorkDrive file ID
     * @returns {Promise<string>} Embed URL
     */
    async getEmbedLink(fileId) {
        try {
            const response = await this.makeApiRequest(`/files/${fileId}/embed`, 'GET');

            if (response.data && response.data.embed_url) {
                return response.data.embed_url;
            }

            return null;
        } catch (error) {
            this.logger.error(`[WORKDRIVE] ❌ Failed to get embed link for ${fileId}:`, error.message);
            return null;
        }
    }

    /**
     * Test WorkDrive connection
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            this.logger.info('[WORKDRIVE] Testing connection...');

            // Try to get teams (simple API call)
            const response = await this.makeApiRequest('/teams', 'GET');

            if (response.data && response.data.length > 0) {
                this.logger.info(`[WORKDRIVE] ✅ Connected! Found ${response.data.length} team(s)`);
                return true;
            }

            return false;
        } catch (error) {
            this.logger.error('[WORKDRIVE] ❌ Connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = ZohoWorkDriveIntegration;
