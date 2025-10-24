/**
 * Reports API Endpoints
 * Provides analytics data from local quote storage
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Get all local quotes for reports
 * GET /api/reports/local-quotes
 */
async function getLocalQuotes(req, res, logger) {
    try {
        const quotesDir = path.join(__dirname, '../../data/quotes');

        // Check if directory exists
        try {
            await fs.access(quotesDir);
        } catch (error) {
            logger.warn('Quotes directory not found, returning empty array');
            return res.json([]);
        }

        // Read all files in quotes directory
        const files = await fs.readdir(quotesDir);

        // Filter for JSON files only (not subdirectories)
        const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('/'));

        logger.info(`Found ${jsonFiles.length} quote files`);

        // Read all quote files
        const quotes = [];
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(quotesDir, file);
                const stats = await fs.stat(filePath);

                // Skip directories
                if (stats.isDirectory()) continue;

                const content = await fs.readFile(filePath, 'utf8');
                const quote = JSON.parse(content);

                // Add file metadata
                quote.fileCreated = stats.birthtime;
                quote.fileModified = stats.mtime;

                quotes.push(quote);
            } catch (error) {
                logger.warn(`Failed to read quote file ${file}:`, error.message);
            }
        }

        logger.info(`Successfully loaded ${quotes.length} quotes`);

        res.json(quotes);
    } catch (error) {
        logger.error('Error loading local quotes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load quote data',
            message: error.message
        });
    }
}

/**
 * Get reports summary with aggregated metrics
 * GET /api/reports/summary?days=30
 */
async function getReportsSummary(req, res, logger) {
    try {
        const days = parseInt(req.query.days) || 30;
        const quotesDir = path.join(__dirname, '../../data/quotes');

        // Check if directory exists
        try {
            await fs.access(quotesDir);
        } catch (error) {
            logger.warn('Quotes directory not found');
            return res.json({
                totalQuotes: 0,
                totalRevenue: 0,
                avgQuote: 0,
                totalCustomers: 0,
                period: days
            });
        }

        // Read all quote files
        const files = await fs.readdir(quotesDir);
        const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('/'));

        // Calculate date cutoff
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Process quotes
        let totalQuotes = 0;
        let totalRevenue = 0;
        const customers = new Set();

        for (const file of jsonFiles) {
            try {
                const filePath = path.join(quotesDir, file);
                const stats = await fs.stat(filePath);

                if (stats.isDirectory()) continue;

                // Check if within date range
                if (stats.mtime < cutoffDate && days !== 'all') continue;

                const content = await fs.readFile(filePath, 'utf8');
                const quote = JSON.parse(content);

                totalQuotes++;

                // Extract revenue
                if (quote.total) {
                    totalRevenue += typeof quote.total === 'number' ? quote.total : 0;
                }

                // Extract customer
                const customerName = quote.customer?.companyName || quote.customer?.company || quote.customer?.name;
                if (customerName) {
                    customers.add(customerName);
                }
            } catch (error) {
                logger.warn(`Failed to process quote file ${file}:`, error.message);
            }
        }

        const avgQuote = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;

        const summary = {
            totalQuotes,
            totalRevenue,
            avgQuote,
            totalCustomers: customers.size,
            period: days
        };

        logger.info('Reports summary:', summary);
        res.json(summary);
    } catch (error) {
        logger.error('Error generating reports summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate summary',
            message: error.message
        });
    }
}

module.exports = {
    getLocalQuotes,
    getReportsSummary
};
