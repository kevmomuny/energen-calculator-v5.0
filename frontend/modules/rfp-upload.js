/**
 * RFP Upload Module - Phase 1
 * Drag-and-drop interface for uploading and processing RFP/RFQ documents
 * Energen Calculator v5.0
 */

class RFPUploadModule {
  constructor() {
    this.dropZone = null;
    this.fileInput = null;
    this.processingStatus = null;
    this.currentExtraction = null;
    this.processingId = null;
    this.statusInterval = null;
    this.allowedFileTypes = ['.pdf'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Initialize the module
   */
  initialize() {
    console.log('[RFP Upload] Initializing module...');
    this.createUploadUI();
    this.attachEventListeners();
    console.log('[RFP Upload] Module initialized successfully');
  }

  /**
   * Create the complete upload UI
   */
  createUploadUI() {
    const container = document.getElementById('rfpUploadContainer');
    if (!container) {
      console.error('[RFP Upload] Container element not found');
      return;
    }

    container.innerHTML = `
      <div class="rfp-upload-wrapper">
        <!-- Upload Zone -->
        <div class="rfp-upload-zone" id="rfpDropZone">
          <div class="upload-icon">
            <span class="material-symbols-outlined" style="font-size: 64px; color: var(--accent-electric);">upload_file</span>
          </div>
          <h3 style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 16px 0 8px;">Upload RFP/RFQ Document</h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
            Drag and drop your PDF here, or click to browse
          </p>
          <input type="file" id="rfpFileInput" accept=".pdf" style="display: none;">
          <button class="btn btn-primary" id="btnBrowseRFP">
            <span class="material-symbols-outlined">folder_open</span>
            Browse Files
          </button>
          <div style="margin-top: 20px; font-size: 11px; color: var(--text-tertiary);">
            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">info</span>
            Supported: PDF files up to 50MB
          </div>
        </div>

        <!-- Upload Progress -->
        <div class="rfp-upload-progress" id="rfpUploadProgress" style="display: none;">
          <div class="progress-header">
            <span class="material-symbols-outlined" style="color: var(--accent-electric);">cloud_upload</span>
            <span style="margin-left: 8px;">Uploading Document</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="rfpProgressFill"></div>
          </div>
          <p class="progress-status" id="rfpProgressStatus">Uploading...</p>
        </div>

        <!-- Processing Status -->
        <div class="rfp-processing-status" id="rfpProcessingStatus" style="display: none;">
          <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 20px; text-align: center;">
            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">auto_fix_high</span>
            Processing Document
          </h4>
          <div class="processing-stages">
            <div class="stage" data-stage="loading">
              <span class="stage-icon">
                <span class="material-symbols-outlined">description</span>
              </span>
              <span class="stage-label">Loading PDF</span>
              <span class="stage-status">Pending</span>
            </div>
            <div class="stage" data-stage="extracting">
              <span class="stage-icon">
                <span class="material-symbols-outlined">search</span>
              </span>
              <span class="stage-label">Extracting Data</span>
              <span class="stage-status">Pending</span>
            </div>
            <div class="stage" data-stage="mapping">
              <span class="stage-icon">
                <span class="material-symbols-outlined">map</span>
              </span>
              <span class="stage-label">Mapping Services</span>
              <span class="stage-status">Pending</span>
            </div>
            <div class="stage" data-stage="completed">
              <span class="stage-icon">
                <span class="material-symbols-outlined">check_circle</span>
              </span>
              <span class="stage-label">Complete</span>
              <span class="stage-status">Pending</span>
            </div>
          </div>
          <div class="processing-progress">
            <div class="progress-bar">
              <div class="progress-fill" id="rfpProcessingFill"></div>
            </div>
            <div class="progress-percentage" id="rfpProcessingPercent">0%</div>
          </div>
        </div>

        <!-- Results -->
        <div class="rfp-results" id="rfpResults" style="display: none;">
          <div class="results-header">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--accent-success);">task_alt</span>
            <h4 style="font-size: 18px; font-weight: 600; margin: 12px 0 8px;">Extraction Complete</h4>
            <p style="font-size: 12px; color: var(--text-secondary);">Review the extracted data below</p>
          </div>
          
          <div class="extraction-summary" id="extractionSummary">
            <!-- Summary will be populated here -->
          </div>

          <div class="results-actions">
            <button class="btn btn-secondary" id="btnReviewExtraction">
              <span class="material-symbols-outlined">edit_document</span>
              Review & Edit
            </button>
            <button class="btn btn-primary" id="btnLoadToCalculator">
              <span class="material-symbols-outlined">send</span>
              Load to Calculator
            </button>
          </div>

          <button class="btn-reset" id="btnUploadAnother" onclick="window.rfpUpload.reset()">
            <span class="material-symbols-outlined">refresh</span>
            Upload Another Document
          </button>
        </div>

        <!-- Error Display -->
        <div class="rfp-error" id="rfpError" style="display: none;">
          <div class="error-icon">
            <span class="material-symbols-outlined" style="font-size: 64px; color: var(--accent-danger);">error</span>
          </div>
          <h4 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px;">Upload Failed</h4>
          <p class="error-message" id="rfpErrorMessage"></p>
          <button class="btn btn-secondary" onclick="window.rfpUpload.reset()">
            <span class="material-symbols-outlined">refresh</span>
            Try Again
          </button>
        </div>
      </div>
    `;

    // Cache DOM references
    this.dropZone = document.getElementById('rfpDropZone');
    this.fileInput = document.getElementById('rfpFileInput');
    this.processingStatus = document.getElementById('rfpProcessingStatus');
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    if (!this.dropZone || !this.fileInput) {
      console.error('[RFP Upload] Required DOM elements not found');
      return;
    }

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFile(file);
      }
    });

    // Browse button click
    const browseBtn = document.getElementById('btnBrowseRFP');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Drag and drop events
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.add('dragover');
    });

    this.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove('dragover');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });

    // Click to browse
    this.dropZone.addEventListener('click', (e) => {
      if (e.target.id !== 'btnBrowseRFP') {
        this.fileInput.click();
      }
    });

    // Result action buttons
    const reviewBtn = document.getElementById('btnReviewExtraction');
    const loadBtn = document.getElementById('btnLoadToCalculator');

    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => this.openReviewModal());
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadToCalculator());
    }
  }

  /**
   * Handle file selection/drop
   */
  handleFile(file) {
    console.log('[RFP Upload] File selected:', file.name);

    if (!this.validateFile(file)) {
      return;
    }

    this.uploadFile(file);
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    // Check file type
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.allowedFileTypes.includes(fileExt)) {
      this.showError(`Invalid file type. Please upload a PDF file.`);
      return false;
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      const sizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(0);
      this.showError(`File too large. Maximum size is ${sizeMB}MB.`);
      return false;
    }

    // Check if file is empty
    if (file.size === 0) {
      this.showError('File is empty. Please select a valid PDF.');
      return false;
    }

    return true;
  }

  /**
   * Upload file to server
   */
  async uploadFile(file) {
    try {
      // Hide drop zone, show progress
      this.hideAllSections();
      this.showProgress();

      // Create FormData
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('options', JSON.stringify({
        splitDocuments: true,
        generateFillable: true,
        extractServices: true,
        mapToEnergServices: true
      }));

      // Simulate upload progress
      this.updateProgress(10, 'Uploading...');

      // Upload to API
      const response = await fetch('/api/rfp/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('[RFP Upload] Upload successful, processing ID:', result.processingId);
        this.updateProgress(100, 'Upload complete');
        
        // Start processing status polling
        setTimeout(() => {
          this.hideProgress();
          this.startStatusPolling(result.processingId);
        }, 500);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('[RFP Upload] Upload error:', error);
      this.showError(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Start polling for processing status
   */
  startStatusPolling(processingId) {
    this.processingId = processingId;
    this.showProcessing();

    // Poll every 2 seconds
    this.statusInterval = setInterval(() => {
      this.checkStatus(processingId);
    }, 2000);

    // Initial status check
    this.checkStatus(processingId);
  }

  /**
   * Check processing status
   */
  async checkStatus(processingId) {
    try {
      const response = await fetch(`/api/rfp/status/${processingId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error('Status check failed');
      }

      // Update progress
      this.updateProcessingProgress(result.progress, result.stage, result.message);

      // Handle completion
      if (result.status === 'completed') {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
        
        setTimeout(() => {
          this.showResults(result.result);
        }, 500);
      } else if (result.status === 'failed') {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
        this.showError(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('[RFP Upload] Status check error:', error);
      // Don't show error on transient network issues, just keep polling
    }
  }

  /**
   * Update upload progress
   */
  updateProgress(progress, status) {
    const progressFill = document.getElementById('rfpProgressFill');
    const progressStatus = document.getElementById('rfpProgressStatus');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressStatus) {
      progressStatus.textContent = status;
    }
  }

  /**
   * Update processing progress and stages
   */
  updateProcessingProgress(progress, stage, message) {
    // Update progress bar
    const progressFill = document.getElementById('rfpProcessingFill');
    const progressPercent = document.getElementById('rfpProcessingPercent');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${progress}%`;
    }

    // Update stage indicators
    const stages = document.querySelectorAll('.stage');
    const stageMap = {
      'loading': 0,
      'extracting': 1,
      'mapping': 2,
      'completed': 3
    };

    const currentStageIndex = stageMap[stage] ?? -1;

    stages.forEach((stageEl, index) => {
      const statusEl = stageEl.querySelector('.stage-status');
      
      if (index < currentStageIndex) {
        stageEl.classList.remove('active');
        stageEl.classList.add('completed');
        if (statusEl) statusEl.textContent = 'Done';
      } else if (index === currentStageIndex) {
        stageEl.classList.add('active');
        stageEl.classList.remove('completed');
        if (statusEl) statusEl.textContent = 'Processing...';
      } else {
        stageEl.classList.remove('active', 'completed');
        if (statusEl) statusEl.textContent = 'Pending';
      }
    });
  }

  /**
   * Show results and summary
   */
  showResults(extraction) {
    this.currentExtraction = extraction;

    // Hide processing, show results
    this.hideAllSections();
    const resultsDiv = document.getElementById('rfpResults');
    if (resultsDiv) {
      resultsDiv.style.display = 'block';
    }

    // Build and display summary
    const summary = this.buildSummary(extraction);
    const summaryContainer = document.getElementById('extractionSummary');
    if (summaryContainer) {
      summaryContainer.innerHTML = summary;
    }

    console.log('[RFP Upload] Results displayed successfully');
  }

  /**
   * Build extraction summary HTML
   */
  buildSummary(extraction) {
    // Handle both nested and flat structure
    const projectDetails = extraction.projectDetails || extraction;
    const contactInfo = extraction.contactInformation || extraction;
    const services = extraction.services || [];
    const schedule = extraction.schedule || extraction;

    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-header">
            <span class="material-symbols-outlined">business</span>
            <span>Project Information</span>
          </div>
          <div class="summary-card-body">
            <div class="summary-item">
              <span class="summary-label">Project Name:</span>
              <span class="summary-value">${projectDetails.projectTitle || 'Not specified'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Bid Number:</span>
              <span class="summary-value">${projectDetails.bidNumber || 'Not specified'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Location:</span>
              <span class="summary-value">${projectDetails.location || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-card-header">
            <span class="material-symbols-outlined">apartment</span>
            <span>Agency Information</span>
          </div>
          <div class="summary-card-body">
            <div class="summary-item">
              <span class="summary-label">Agency:</span>
              <span class="summary-value">${contactInfo.agency?.name || 'Not specified'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Department:</span>
              <span class="summary-value">${contactInfo.agency?.department || 'Not specified'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Contact:</span>
              <span class="summary-value">${contactInfo.primaryContact?.name || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-card-header">
            <span class="material-symbols-outlined">construction</span>
            <span>Services & Scope</span>
          </div>
          <div class="summary-card-body">
            <div class="summary-item">
              <span class="summary-label">Services Found:</span>
              <span class="summary-value">${services.length} services</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Generator Units:</span>
              <span class="summary-value">${extraction.generatorCount || 'TBD'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Confidence:</span>
              <span class="summary-value confidence-high">${((extraction.confidence || 0.85) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-card-header">
            <span class="material-symbols-outlined">schedule</span>
            <span>Timeline</span>
          </div>
          <div class="summary-card-body">
            <div class="summary-item">
              <span class="summary-label">Bid Due Date:</span>
              <span class="summary-value">${schedule.bidDueDate ? new Date(schedule.bidDueDate).toLocaleDateString() : 'Not specified'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Start Date:</span>
              <span class="summary-value">${schedule.projectStartDate ? new Date(schedule.projectStartDate).toLocaleDateString() : 'TBD'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Duration:</span>
              <span class="summary-value">${schedule.contractDuration || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </div>

      ${services.length > 0 ? `
        <div class="services-preview">
          <h5 style="font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--text-primary);">
            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">checklist</span>
            Extracted Services
          </h5>
          <div class="services-list">
            ${services.slice(0, 5).map(service => `
              <div class="service-preview-item">
                <span class="material-symbols-outlined" style="color: var(--accent-success);">check_circle</span>
                <span>${service.name || service.description}</span>
              </div>
            `).join('')}
            ${services.length > 5 ? `
              <div class="service-preview-item" style="color: var(--text-secondary); font-style: italic;">
                <span class="material-symbols-outlined">more_horiz</span>
                <span>and ${services.length - 5} more...</span>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Open review modal (Phase 3)
   */
  openReviewModal() {
    console.log('[RFP Upload] Opening review modal...');
    
    // TODO: Implement full review/edit modal in Phase 3
    alert('Review & Edit Modal\n\nThis feature will be available in Phase 3.\n\nYou will be able to:\n• Review all extracted data\n• Edit any field manually\n• Adjust service mappings\n• Validate contact information');
  }

  /**
   * Load extraction to calculator
   */
  loadToCalculator() {
    if (!this.currentExtraction) {
      console.error('[RFP Upload] No extraction data available');
      return;
    }

    console.log('[RFP Upload] Loading extraction to calculator:', this.currentExtraction);

    try {
      // Phase 1: Basic integration - populate customer fields
      this.populateCustomerFields(this.currentExtraction);

      // Show success message
      this.showToast('Data loaded successfully! Review and adjust as needed.', 'success');

      // Optional: Auto-switch to calculator view
      if (typeof switchView === 'function') {
        setTimeout(() => {
          switchView('calculator');
        }, 1500);
      }
    } catch (error) {
      console.error('[RFP Upload] Load error:', error);
      this.showToast('Failed to load data. Please try again.', 'error');
    }
  }

  /**
   * Populate customer fields with extraction data
   */
  populateCustomerFields(extraction) {
    const contactInfo = extraction.contactInformation || extraction;
    const projectDetails = extraction.projectDetails || extraction;

    // Company information
    const companyName = document.getElementById('companyName');
    if (companyName && contactInfo.agency?.name) {
      companyName.value = contactInfo.agency.name;
    }

    // Contact information
    const email = document.getElementById('email');
    if (email && contactInfo.primaryContact?.email) {
      email.value = contactInfo.primaryContact.email;
    }

    const phone = document.getElementById('phone');
    if (phone && contactInfo.primaryContact?.phone) {
      phone.value = contactInfo.primaryContact.phone;
    }

    // Address information
    const address = document.getElementById('address');
    if (address && projectDetails.location) {
      address.value = projectDetails.location;
    }

    // Trigger enrichment if available
    if (typeof handleCompanyChange === 'function') {
      handleCompanyChange();
    }

    console.log('[RFP Upload] Customer fields populated');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.hideAllSections();
    
    const errorDiv = document.getElementById('rfpError');
    const errorMessage = document.getElementById('rfpErrorMessage');

    if (errorDiv && errorMessage) {
      errorMessage.textContent = message;
      errorDiv.style.display = 'block';
    }

    console.error('[RFP Upload] Error:', message);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Use existing toast system if available
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }

    // Fallback: simple alert
    console.log(`[RFP Upload] Toast (${type}):`, message);
    // Could also create a custom toast here if needed
  }

  /**
   * UI state management methods
   */
  hideAllSections() {
    const sections = [
      'rfpDropZone',
      'rfpUploadProgress',
      'rfpProcessingStatus',
      'rfpResults',
      'rfpError'
    ];

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  showProgress() {
    const progressDiv = document.getElementById('rfpUploadProgress');
    if (progressDiv) {
      progressDiv.style.display = 'block';
    }
  }

  hideProgress() {
    const progressDiv = document.getElementById('rfpUploadProgress');
    if (progressDiv) {
      progressDiv.style.display = 'none';
    }
  }

  showProcessing() {
    const processingDiv = document.getElementById('rfpProcessingStatus');
    if (processingDiv) {
      processingDiv.style.display = 'block';
    }
  }

  /**
   * Reset module to initial state
   */
  reset() {
    // Clear any polling intervals
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    // Reset state
    this.currentExtraction = null;
    this.processingId = null;

    // Reset UI
    this.hideAllSections();
    if (this.dropZone) {
      this.dropZone.style.display = 'block';
    }

    // Reset file input
    if (this.fileInput) {
      this.fileInput.value = '';
    }

    // Reset progress bars
    const progressFill = document.getElementById('rfpProgressFill');
    if (progressFill) {
      progressFill.style.width = '0%';
    }

    const processingFill = document.getElementById('rfpProcessingFill');
    if (processingFill) {
      processingFill.style.width = '0%';
    }

    console.log('[RFP Upload] Module reset');
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    console.log('[RFP Upload] Module destroyed');
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initRFPUpload();
  });
} else {
  initRFPUpload();
}

function initRFPUpload() {
  // Only initialize if container exists
  if (document.getElementById('rfpUploadContainer')) {
    window.rfpUpload = new RFPUploadModule();
    window.rfpUpload.initialize();
    console.log('[RFP Upload] Global instance created');
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RFPUploadModule;
}

export default RFPUploadModule;
