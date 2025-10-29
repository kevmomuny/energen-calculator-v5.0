/**
 * Static HTML Parser - Energen PDF Extraction Pipeline
 * Parses legacy MENUMAIN.htm structure and extracts PDF inventory
 *
 * @module modules/pdf-extraction/StaticHTMLParser
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

class StaticHTMLParser {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.baseDir = options.baseDir || null;
    this.inventory = {
      manufacturers: [],
      categories: {},
      pdfs: [],
      errors: []
    };
  }

  /**
     * Parse MENUMAIN.htm and extract all category pages
     * @param {string} menuMainPath - Path to MENUMAIN.htm
     * @returns {Promise<Object>} Inventory object with manufacturers and PDFs
     */
  async parseMainMenu(menuMainPath) {
    try {
      this.logger.info(`Parsing main menu: ${menuMainPath}`);

      const html = await fs.readFile(menuMainPath, 'utf8');
      const $ = cheerio.load(html);

      // Set base directory from menu path
      this.baseDir = path.dirname(menuMainPath);

      // Extract all links to category pages
      const categoryLinks = [];
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        // Look for MENU*.htm links
        if (href && href.startsWith('MENU') && href.endsWith('.htm')) {
          categoryLinks.push({
            href,
            name: text || path.basename(href, '.htm'),
            path: path.join(this.baseDir, href)
          });
        }
      });

      this.logger.info(`Found ${categoryLinks.length} category pages`);

      // Parse each category page
      for (const category of categoryLinks) {
        await this.parseCategoryPage(category);
      }

      this.logger.info(`Total manufacturers found: ${this.inventory.manufacturers.length}`);
      this.logger.info(`Total PDFs found: ${this.inventory.pdfs.length}`);

      return this.inventory;

    } catch (error) {
      this.logger.error(`Failed to parse main menu: ${error.message}`);
      throw error;
    }
  }

  /**
     * Parse a category page (e.g., MENUGENERATORSETS.htm)
     * @param {Object} category - Category information
     */
  async parseCategoryPage(category) {
    try {
      this.logger.info(`Parsing category: ${category.name}`);

      const html = await fs.readFile(category.path, 'utf8');
      const $ = cheerio.load(html);

      this.inventory.categories[category.name] = {
        manufacturers: [],
        pdfs: []
      };

      // Extract all PDF links
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        if (href && href.toLowerCase().endsWith('.pdf')) {
          const pdfPath = path.join(this.baseDir, href);
          const manufacturer = this.extractManufacturerFromFilename(href);

          const pdfInfo = {
            filename: path.basename(href),
            fullPath: pdfPath,
            relativePath: href,
            linkText: text,
            manufacturer: manufacturer,
            category: category.name,
            exists: null // Will be checked later
          };

          this.inventory.pdfs.push(pdfInfo);
          this.inventory.categories[category.name].pdfs.push(pdfInfo);

          // Track unique manufacturers
          if (manufacturer && !this.inventory.manufacturers.includes(manufacturer)) {
            this.inventory.manufacturers.push(manufacturer);
            this.inventory.categories[category.name].manufacturers.push(manufacturer);
          }
        }
      });

      this.logger.info(`  Found ${this.inventory.categories[category.name].pdfs.length} PDFs`);

    } catch (error) {
      this.logger.warn(`Failed to parse category ${category.name}: ${error.message}`);
      this.inventory.errors.push({
        category: category.name,
        error: error.message
      });
    }
  }

  /**
     * Extract manufacturer name from PDF filename
     * @param {string} filename - PDF filename
     * @returns {string} Manufacturer name
     */
  extractManufacturerFromFilename(filename) {
    const basename = path.basename(filename, '.pdf');

    // Common patterns:
    // - "Caterpillar_3516.pdf" -> "Caterpillar"
    // - "KOHLER 60RZ.pdf" -> "KOHLER"
    // - "Generac-Industrial.pdf" -> "Generac"

    // Split by common separators
    const parts = basename.split(/[-_\s]/);

    // Return first part as manufacturer
    return parts[0].trim();
  }

  /**
     * Verify all PDF files exist on disk
     * @returns {Promise<Object>} Statistics about found/missing files
     */
  async verifyPDFFiles() {
    this.logger.info('Verifying PDF file existence...');

    let found = 0;
    let missing = 0;

    for (const pdf of this.inventory.pdfs) {
      try {
        await fs.access(pdf.fullPath);
        pdf.exists = true;
        found++;
      } catch (error) {
        pdf.exists = false;
        missing++;
        this.logger.warn(`Missing PDF: ${pdf.fullPath}`);
      }
    }

    this.logger.info(`PDF verification: ${found} found, ${missing} missing`);

    return {
      total: this.inventory.pdfs.length,
      found,
      missing,
      foundPercentage: (found / this.inventory.pdfs.length * 100).toFixed(1)
    };
  }

  /**
     * Get statistics about the inventory
     * @returns {Object} Inventory statistics
     */
  getStatistics() {
    const stats = {
      totalManufacturers: this.inventory.manufacturers.length,
      totalCategories: Object.keys(this.inventory.categories).length,
      totalPDFs: this.inventory.pdfs.length,
      pdfsByManufacturer: {},
      pdfsByCategory: {},
      errors: this.inventory.errors.length
    };

    // Count PDFs by manufacturer
    this.inventory.pdfs.forEach(pdf => {
      const mfr = pdf.manufacturer || 'Unknown';
      stats.pdfsByManufacturer[mfr] = (stats.pdfsByManufacturer[mfr] || 0) + 1;
    });

    // Count PDFs by category
    Object.entries(this.inventory.categories).forEach(([name, data]) => {
      stats.pdfsByCategory[name] = data.pdfs.length;
    });

    return stats;
  }

  /**
     * Export inventory to JSON file
     * @param {string} outputPath - Output file path
     */
  async exportInventory(outputPath) {
    try {
      const output = {
        generatedAt: new Date().toISOString(),
        baseDirectory: this.baseDir,
        statistics: this.getStatistics(),
        inventory: this.inventory
      };

      await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
      this.logger.info(`Inventory exported to: ${outputPath}`);

    } catch (error) {
      this.logger.error(`Failed to export inventory: ${error.message}`);
      throw error;
    }
  }

  /**
     * Get list of PDFs grouped by manufacturer
     * @returns {Object} PDFs grouped by manufacturer
     */
  getPDFsByManufacturer() {
    const grouped = {};

    this.inventory.pdfs.forEach(pdf => {
      const mfr = pdf.manufacturer || 'Unknown';
      if (!grouped[mfr]) {
        grouped[mfr] = [];
      }
      grouped[mfr].push(pdf);
    });

    return grouped;
  }

  /**
     * Get list of valid PDFs (those that exist on disk)
     * @returns {Array} Valid PDF objects
     */
  getValidPDFs() {
    return this.inventory.pdfs.filter(pdf => pdf.exists === true);
  }

  /**
     * Parse inventory from existing JSON file (for resuming)
     * @param {string} inventoryPath - Path to inventory JSON
     */
  async loadInventory(inventoryPath) {
    try {
      const data = await fs.readFile(inventoryPath, 'utf8');
      const loaded = JSON.parse(data);

      this.inventory = loaded.inventory;
      this.baseDir = loaded.baseDirectory;

      this.logger.info(`Loaded inventory from ${inventoryPath}`);
      this.logger.info(`  Manufacturers: ${this.inventory.manufacturers.length}`);
      this.logger.info(`  PDFs: ${this.inventory.pdfs.length}`);

      return loaded;

    } catch (error) {
      this.logger.error(`Failed to load inventory: ${error.message}`);
      throw error;
    }
  }
}

module.exports = StaticHTMLParser;
