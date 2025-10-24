/**
 * @module AuditLogger
 * @description Calculation audit trail for debugging and compliance
 */

export class AuditLogger {
    constructor(maxEntries = 100) {
        this.version = '5.0.0';
        this.maxEntries = maxEntries;
        this.log = [];
        this.currentAudit = null;
    }
    
    /**
     * Start a new audit trail
     * @param {Object} input - Initial input payload
     * @returns {Object} Audit instance
     */
    startAudit(input) {
        this.currentAudit = {
            id: this._generateId(),
            timestamp: new Date().toISOString(),
            input: this._deepClone(input),
            steps: [],
            errors: [],
            warnings: []
        };
        
        return this;
    }
    
    /**
     * Log a calculation step
     * @param {string} step - Step name
     * @param {*} data - Step data
     */
    log(step, data) {
        if (!this.currentAudit) return;
        
        this.currentAudit.steps.push({
            step,
            timestamp: new Date().toISOString(),
            data: this._deepClone(data)
        });
    }
    
    /**
     * Log a warning
     * @param {string} message - Warning message
     * @param {*} context - Additional context
     */
    warn(message, context) {
        if (!this.currentAudit) return;
        
        this.currentAudit.warnings.push({
            message,
            context: this._deepClone(context),
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Log an error
     * @param {Error} error - Error object
     */
    logError(error) {
        if (!this.currentAudit) return;
        
        this.currentAudit.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Complete the current audit
     * @param {Object} result - Final calculation result
     */
    complete(result) {
        if (!this.currentAudit) return;
        
        this.currentAudit.result = this._deepClone(result);
        this.currentAudit.completedAt = new Date().toISOString();
        this.currentAudit.duration = Date.now() - new Date(this.currentAudit.timestamp).getTime();
        
        // Add to log
        this.log.push(this.currentAudit);
        
        // Trim log if needed
        if (this.log.length > this.maxEntries) {
            this.log = this.log.slice(-this.maxEntries);
        }
        
        this.currentAudit = null;
    }
    
    /**
     * Get the complete audit log
     * @returns {Array} All audit entries
     */
    getLog() {
        return [...this.log];
    }
    
    /**
     * Get the last N audit entries
     * @param {number} count - Number of entries to retrieve
     * @returns {Array} Recent audit entries
     */
    getRecent(count = 10) {
        return this.log.slice(-count);
    }
    
    /**
     * Find audits with errors
     * @returns {Array} Audits containing errors
     */
    getErrorAudits() {
        return this.log.filter(audit => audit.errors && audit.errors.length > 0);
    }
    
    /**
     * Find audit by ID
     * @param {string} id - Audit ID
     * @returns {Object|null} Audit entry or null
     */
    findById(id) {
        return this.log.find(audit => audit.id === id) || null;
    }
    
    /**
     * Clear the audit log
     */
    clear() {
        this.log = [];
        this.currentAudit = null;
    }
    
    /**
     * Export audit log as JSON
     * @returns {string} JSON string
     */
    exportJSON() {
        return JSON.stringify({
            version: this.version,
            exportedAt: new Date().toISOString(),
            entries: this.log
        }, null, 2);
    }
    
    /**
     * Get audit statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const stats = {
            totalAudits: this.log.length,
            successfulAudits: 0,
            failedAudits: 0,
            averageDuration: 0,
            totalWarnings: 0,
            totalErrors: 0
        };
        
        if (this.log.length === 0) return stats;
        
        let totalDuration = 0;
        
        this.log.forEach(audit => {
            if (audit.errors && audit.errors.length > 0) {
                stats.failedAudits++;
            } else {
                stats.successfulAudits++;
            }
            
            stats.totalWarnings += (audit.warnings || []).length;
            stats.totalErrors += (audit.errors || []).length;
            
            if (audit.duration) {
                totalDuration += audit.duration;
            }
        });
        
        stats.averageDuration = totalDuration / this.log.length;
        stats.successRate = (stats.successfulAudits / stats.totalAudits * 100).toFixed(2) + '%';
        
        return stats;
    }
    
    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Deep clone an object
     * @private
     */
    _deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            // Fallback for non-serializable objects
            return String(obj);
        }
    }
}

export default AuditLogger;