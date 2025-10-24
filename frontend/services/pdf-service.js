/**
 * Frontend PDF Service - Bridge to backend PDF generation
 * @module frontend/services/pdf-service
 * @version 5.0.0
 */

export class PDFService {
  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Generate PDF from calculation data
   * @param {Object} data - Complete calculation and customer data
   * @returns {Promise<Blob>} PDF blob for download
   */
  async generatePDF(data) {
    try {
      const response = await fetch(`${this.baseUrl}/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  /**
   * Download PDF directly to user's device
   * @param {Object} data - Complete calculation and customer data
   * @param {string} filename - Desired filename for download
   */
  async downloadPDF(data, filename = 'energen-bid.pdf') {
    try {
      const blob = await this.generatePDF(data);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      return true;
    } catch (error) {
      console.error('PDF download error:', error);
      throw error;
    }
  }

  /**
   * Preview PDF in new tab
   * @param {Object} data - Complete calculation and customer data
   */
  async previewPDF(data) {
    try {
      const blob = await this.generatePDF(data);
      const url = window.URL.createObjectURL(blob);

      // Open in new tab
      window.open(url, '_blank');

      // Cleanup after delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000); // Keep URL valid for 1 minute

      return true;
    } catch (error) {
      console.error('PDF preview error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pdfService = new PDFService();