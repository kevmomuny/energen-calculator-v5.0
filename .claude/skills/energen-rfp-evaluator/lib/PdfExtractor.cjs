/**
 * PdfExtractor.cjs - Node.js wrapper for Python PDF extraction
 *
 * Calls pdf-extractor.py to extract text from PDFs using pypdf library.
 * This integrates the PDF skill with the RFP evaluator.
 *
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class PdfExtractor {
  /**
   * Extract text from a PDF file using Python pypdf
   *
   * @param {string} pdfPath - Absolute path to PDF file
   * @returns {Promise<Object>} - Extraction result {success, text, pages, fileName}
   */
  static async extractText(pdfPath) {
    return new Promise((resolve, reject) => {
      // Path to Python script
      const scriptPath = path.join(__dirname, 'pdf-extractor.py');

      // Verify script exists
      if (!fs.existsSync(scriptPath)) {
        return resolve({
          success: false,
          error: `PDF extractor script not found: ${scriptPath}`,
          text: '',
          pages: 0
        });
      }

      // Verify PDF exists
      if (!fs.existsSync(pdfPath)) {
        return resolve({
          success: false,
          error: `PDF file not found: ${pdfPath}`,
          text: '',
          pages: 0
        });
      }

      // Spawn Python process
      const python = spawn('python', [scriptPath, pdfPath]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0 && code !== 1) {
          // Unexpected error
          return resolve({
            success: false,
            error: `Python process exited with code ${code}: ${stderr}`,
            text: '',
            pages: 0
          });
        }

        try {
          // Parse JSON output
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse Python output: ${parseError.message}`,
            text: '',
            pages: 0,
            rawOutput: stdout,
            rawError: stderr
          });
        }
      });

      python.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to spawn Python: ${error.message}. Ensure Python is installed and in PATH.`,
          text: '',
          pages: 0
        });
      });
    });
  }

  /**
   * Extract text from multiple PDFs in parallel
   *
   * @param {string[]} pdfPaths - Array of PDF file paths
   * @param {number} concurrency - Max concurrent extractions (default: 3)
   * @returns {Promise<Object[]>} - Array of extraction results
   */
  static async extractMultiple(pdfPaths, concurrency = 3) {
    const results = [];
    const queue = [...pdfPaths];

    // Process in batches
    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(pdfPath => this.extractText(pdfPath))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check if Python and pypdf are available
   *
   * @returns {Promise<Object>} - {available: boolean, error: string}
   */
  static async checkAvailability() {
    return new Promise((resolve) => {
      const python = spawn('python', ['-c', 'import pypdf; print("OK")']);

      let output = '';
      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0 && output.trim() === 'OK') {
          resolve({ available: true, error: null });
        } else {
          resolve({
            available: false,
            error: 'Python or pypdf library not available. Install with: pip install pypdf'
          });
        }
      });

      python.on('error', () => {
        resolve({
          available: false,
          error: 'Python not found in PATH. Please install Python 3.'
        });
      });
    });
  }
}

module.exports = { PdfExtractor };
