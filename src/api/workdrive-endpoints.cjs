/**
 * Zoho WorkDrive API Endpoints
 * Handles PDF upload, download, sync, and management
 *
 * @module src/api/workdrive-endpoints
 * @version 5.0.0
 */

const path = require('path');
const fs = require('fs');

/**
 * Register WorkDrive endpoints with Express app
 * @param {Express.Application} app - Express app instance
 * @param {ZohoWorkDriveIntegration} workdrive - WorkDrive integration instance
 * @param {Winston.Logger} logger - Logger instance
 */
function registerWorkDriveEndpoints(app, workdrive, logger) {

    /**
     * List all PDFs in WorkDrive quotes folder
     */
    app.get('/api/workdrive/list-pdfs', async (req, res) => {
        try {
            logger.info('[WORKDRIVE API] List PDFs request');

            const pdfs = await workdrive.listPDFs();

            res.json({
                success: true,
                pdfs,
                count: pdfs.length
            });
        } catch (error) {
            logger.error('[WORKDRIVE API] List failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                pdfs: []
            });
        }
    });

    /**
     * Upload local PDF to WorkDrive
     * Expects filename in URL params
     */
    app.post('/api/documents/sync-to-workdrive/:filename', async (req, res) => {
        try {
            const filename = req.params.filename;
            logger.info(`[WORKDRIVE API] Sync request for: ${filename}`);

            // Build local path
            const localPath = path.join(__dirname, '../../output/pdfs', filename);

            // Security: Prevent path traversal
            const normalizedPath = path.normalize(localPath);
            const pdfDir = path.normalize(path.join(__dirname, '../../output/pdfs'));

            if (!normalizedPath.startsWith(pdfDir)) {
                logger.warn(`[WORKDRIVE API] Path traversal attempt blocked: ${filename}`);
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Check file exists
            if (!fs.existsSync(localPath)) {
                logger.warn(`[WORKDRIVE API] File not found: ${filename}`);
                return res.status(404).json({
                    success: false,
                    error: 'File not found locally'
                });
            }

            // Upload to WorkDrive
            const workdriveFile = await workdrive.uploadPDF(localPath, filename);

            logger.info(`[WORKDRIVE API] ✅ Sync complete: ${filename}`);

            res.json({
                success: true,
                workdriveFile,
                message: 'PDF uploaded to WorkDrive successfully'
            });

        } catch (error) {
            logger.error('[WORKDRIVE API] Sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Download PDF from WorkDrive
     */
    app.get('/api/workdrive/download/:fileId', async (req, res) => {
        try {
            const fileId = req.params.fileId;
            logger.info(`[WORKDRIVE API] Download request for: ${fileId}`);

            // Create temp path
            const tempPath = path.join(__dirname, '../../output/pdfs/temp', `${fileId}.pdf`);

            // Ensure temp directory exists
            const tempDir = path.dirname(tempPath);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Download from WorkDrive
            await workdrive.downloadPDF(fileId, tempPath);

            // Send file to client
            res.download(tempPath, (err) => {
                if (err) {
                    logger.error('[WORKDRIVE API] Download send failed:', err);
                }

                // Cleanup temp file
                fs.unlink(tempPath, (unlinkErr) => {
                    if (unlinkErr) {
                        logger.error('[WORKDRIVE API] Temp file cleanup failed:', unlinkErr);
                    }
                });
            });

        } catch (error) {
            logger.error('[WORKDRIVE API] Download failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Delete PDF from both local and WorkDrive
     * Enhanced version of existing delete endpoint
     */
    app.delete('/api/documents/delete-with-sync/:filename', async (req, res) => {
        try {
            const filename = req.params.filename;
            logger.info(`[WORKDRIVE API] Delete with sync: ${filename}`);

            // Delete from local
            const localPath = path.join(__dirname, '../../output/pdfs', filename);

            // Security check
            const normalizedPath = path.normalize(localPath);
            const pdfDir = path.normalize(path.join(__dirname, '../../output/pdfs'));

            if (!normalizedPath.startsWith(pdfDir)) {
                logger.warn(`[WORKDRIVE API] Path traversal attempt blocked: ${filename}`);
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            let localDeleted = false;
            if (fs.existsSync(localPath)) {
                await fs.promises.unlink(localPath);
                localDeleted = true;
                logger.info(`[WORKDRIVE API] ✅ Local file deleted: ${filename}`);
            }

            // Try to delete from WorkDrive
            let workdriveDeleted = false;
            try {
                // Find file in WorkDrive
                const pdfs = await workdrive.listPDFs();
                const wdFile = pdfs.find(p => p.filename === filename);

                if (wdFile) {
                    await workdrive.deletePDF(wdFile.id);
                    workdriveDeleted = true;
                    logger.info(`[WORKDRIVE API] ✅ WorkDrive file deleted: ${wdFile.id}`);
                }
            } catch (wdError) {
                logger.warn('[WORKDRIVE API] WorkDrive delete failed (file may not exist):', wdError.message);
            }

            res.json({
                success: true,
                localDeleted,
                workdriveDeleted,
                message: 'Document deleted'
            });

        } catch (error) {
            logger.error('[WORKDRIVE API] Delete failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get WorkDrive connection status
     */
    app.get('/api/workdrive/status', async (req, res) => {
        try {
            const connected = await workdrive.testConnection();

            res.json({
                success: true,
                connected,
                configured: !!(workdrive.quoteFolderId),
                teamId: workdrive.teamId || null,
                workspaceId: workdrive.workspaceId || null,
                quoteFolderId: workdrive.quoteFolderId || null
            });
        } catch (error) {
            logger.error('[WORKDRIVE API] Status check failed:', error);
            res.json({
                success: false,
                connected: false,
                configured: false,
                error: error.message
            });
        }
    });

    /**
     * Search PDFs in WorkDrive
     */
    app.get('/api/workdrive/search', async (req, res) => {
        try {
            const query = req.query.q || req.query.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'Query parameter required'
                });
            }

            logger.info(`[WORKDRIVE API] Search request: ${query}`);

            const results = await workdrive.searchPDFs(query);

            res.json({
                success: true,
                results,
                count: results.length,
                query
            });

        } catch (error) {
            logger.error('[WORKDRIVE API] Search failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                results: []
            });
        }
    });

    logger.info('[WORKDRIVE API] ✅ Endpoints registered');
}

module.exports = { registerWorkDriveEndpoints };
