/**
 * @fileoverview Quote Versioning System
 * Manages bid versioning, revision detection, and watermark logic
 * Handles version progression: v1.0 → v1.1 → v1.2 → v2.0
 *
 * @module frontend/modules/quote-versioning
 * @author Energen Team
 * @version 5.0.0
 * @sprint Sprint 4: Calculation State Hash & Versioning
 */

import { generateCalculationHash, detectChanges } from './calculation-hash.js';

/**
 * Version object structure
 * @typedef {Object} Version
 * @property {number} major - Major version number (1, 2, 3)
 * @property {number} minor - Minor version number (0, 1, 2)
 * @property {string} string - Full version string (e.g., "v1.2")
 */

/**
 * Quote version status
 * @enum {string}
 */
export const QuoteStatus = {
    DRAFT: 'draft',           // Not yet official, no bid number
    OFFICIAL: 'official',     // Official quote with bid number
    SUPERSEDED: 'superseded'  // Replaced by newer version
};

/**
 * Initialize quote with versioning
 * Call this when creating a new quote from scratch
 *
 * @returns {Object} Initial version metadata
 */
export function initializeQuoteVersion() {
    return {
        version: { major: 1, minor: 0, string: 'v1.0' },
        status: QuoteStatus.DRAFT,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        bidNumber: null,
        previousVersion: null,
        calcStateHash: null,
        changeLog: []
    };
}

/**
 * Detect version increment needed based on changes
 * Compares previous and current calculation states
 *
 * @param {Object} previousHash - Previous calculation hash result
 * @param {Object} currentHash - Current calculation hash result
 * @returns {Object} Version increment recommendation
 */
export function detectVersionIncrement(previousHash, currentHash) {
    // No previous hash = first version
    if (!previousHash || !previousHash.includedData) {
        return {
            increment: 'none',
            reason: 'First version',
            newVersion: { major: 1, minor: 0, string: 'v1.0' },
            isBreaking: false
        };
    }

    // Hash identical = no changes
    if (previousHash.hash === currentHash.hash) {
        return {
            increment: 'none',
            reason: 'No calculation changes detected',
            newVersion: null,
            isBreaking: false
        };
    }

    // Analyze changes
    const changes = detectChanges(
        previousHash.includedData,
        currentHash.includedData
    );

    // Determine increment type
    if (changes.scope === 'major') {
        return {
            increment: 'major',
            reason: 'Scope change detected: ' + changes.details.join(', '),
            changes: changes,
            isBreaking: true,
            requiresApproval: true
        };
    } else if (changes.scope === 'minor') {
        return {
            increment: 'minor',
            reason: 'Pricing change detected: ' + changes.details.join(', '),
            changes: changes,
            isBreaking: false,
            requiresApproval: false
        };
    }

    return {
        increment: 'none',
        reason: 'No significant changes',
        newVersion: null,
        isBreaking: false
    };
}

/**
 * Calculate next version number
 *
 * @param {Object} currentVersion - Current version object
 * @param {string} incrementType - 'major' or 'minor'
 * @returns {Object} New version object
 */
export function incrementVersion(currentVersion, incrementType) {
    const newVersion = { ...currentVersion };

    if (incrementType === 'major') {
        // Major increment: v1.2 → v2.0
        newVersion.major += 1;
        newVersion.minor = 0;
    } else if (incrementType === 'minor') {
        // Minor increment: v1.2 → v1.3
        newVersion.minor += 1;
    }

    newVersion.string = `v${newVersion.major}.${newVersion.minor}`;
    return newVersion;
}

/**
 * Determine watermark text based on quote status and version
 *
 * @param {string} status - Quote status (draft/official/superseded)
 * @param {string} supersededBy - Version that supersedes this one (if applicable)
 * @returns {Object} Watermark configuration
 */
export function getWatermark(status, supersededBy = null) {
    switch (status) {
        case QuoteStatus.DRAFT:
            return {
                text: 'DRAFT',
                color: '#FF6B35',
                opacity: 0.3,
                fontSize: 120,
                rotation: -45,
                position: 'center'
            };

        case QuoteStatus.SUPERSEDED:
            return {
                text: supersededBy ? `SUPERSEDED BY ${supersededBy}` : 'SUPERSEDED',
                color: '#9CA3AF',
                opacity: 0.25,
                fontSize: 80,
                rotation: -45,
                position: 'center'
            };

        case QuoteStatus.OFFICIAL:
            // No watermark for current official quotes
            return null;

        default:
            return null;
    }
}

/**
 * Generate filename based on status and version
 *
 * @param {string} status - Quote status
 * @param {string} bidNumber - Bid number (e.g., "BID-0001")
 * @param {Object} version - Version object
 * @param {Date} date - Quote date
 * @returns {string} PDF filename
 */
export function generateFilename(status, bidNumber = null, version = null, date = new Date()) {
    const dateStr = formatDateForFilename(date);

    switch (status) {
        case QuoteStatus.DRAFT:
            // Draft: Energen_Bid_DRAFT_[timestamp].pdf
            return `Energen_Bid_DRAFT_${Date.now()}.pdf`;

        case QuoteStatus.OFFICIAL:
        case QuoteStatus.SUPERSEDED:
            // Official: Energen_Bid_BID-XXXX_v1.0_[date].pdf
            if (!bidNumber) {
                throw new Error('Bid number required for official quotes');
            }
            const versionStr = version ? `_${version.string}` : '';
            return `Energen_Bid_${bidNumber}${versionStr}_${dateStr}.pdf`;

        default:
            return `Energen_Bid_${Date.now()}.pdf`;
    }
}

/**
 * Format date for filename (YYYYMMDD format)
 * @private
 */
function formatDateForFilename(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Create revision from existing quote
 * Determines if revision should be minor or major
 *
 * @param {Object} currentQuote - Current quote metadata
 * @param {Object} currentState - Current application state
 * @returns {Promise<Object>} New revision metadata
 */
export async function createRevision(currentQuote, currentState) {
    console.log('[VERSIONING] Creating revision from quote:', currentQuote.bidNumber || 'DRAFT');

    // Generate hash for current state
    const currentHash = await generateCalculationHash(currentState);

    // Detect what kind of increment is needed
    const increment = detectVersionIncrement(
        currentQuote.calcStateHash,
        currentHash
    );

    // Calculate new version
    let newVersion;
    if (increment.increment === 'major') {
        newVersion = incrementVersion(currentQuote.version, 'major');
    } else if (increment.increment === 'minor') {
        newVersion = incrementVersion(currentQuote.version, 'minor');
    } else {
        // No changes detected
        console.warn('[VERSIONING] No changes detected, no revision needed');
        return null;
    }

    // Build revision metadata
    const revision = {
        version: newVersion,
        status: currentQuote.bidNumber ? QuoteStatus.OFFICIAL : QuoteStatus.DRAFT,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        bidNumber: currentQuote.bidNumber, // Keep same bid number
        previousVersion: currentQuote.version.string,
        calcStateHash: currentHash,
        changeLog: [
            ...currentQuote.changeLog || [],
            {
                timestamp: new Date().toISOString(),
                fromVersion: currentQuote.version.string,
                toVersion: newVersion.string,
                incrementType: increment.increment,
                reason: increment.reason,
                changes: increment.changes?.details || []
            }
        ]
    };

    console.log('[VERSIONING] Created revision:', newVersion.string);
    return revision;
}

/**
 * Mark previous version as superseded
 *
 * @param {Object} previousQuote - Previous quote metadata
 * @param {Object} newVersion - New version object
 * @returns {Object} Updated quote metadata
 */
export function markAsSuperseded(previousQuote, newVersion) {
    return {
        ...previousQuote,
        status: QuoteStatus.SUPERSEDED,
        supersededBy: newVersion.string,
        supersededAt: new Date().toISOString()
    };
}

/**
 * Promote draft to official quote
 *
 * @param {Object} draftQuote - Draft quote metadata
 * @param {string} bidNumber - Assigned bid number (e.g., "BID-0001")
 * @returns {Object} Official quote metadata
 */
export function promoteToOfficial(draftQuote, bidNumber) {
    console.log('[VERSIONING] Promoting draft to official:', bidNumber);

    return {
        ...draftQuote,
        status: QuoteStatus.OFFICIAL,
        bidNumber: bidNumber,
        officializedAt: new Date().toISOString(),
        // Ensure version is v1.0 for first official quote
        version: draftQuote.version || { major: 1, minor: 0, string: 'v1.0' }
    };
}

/**
 * Parse version string to object
 *
 * @param {string} versionString - Version string (e.g., "v1.2")
 * @returns {Object} Version object
 */
export function parseVersion(versionString) {
    const match = versionString.match(/^v?(\d+)\.(\d+)$/);
    if (!match) {
        throw new Error(`Invalid version string: ${versionString}`);
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);

    return {
        major,
        minor,
        string: `v${major}.${minor}`
    };
}

/**
 * Compare two version objects
 *
 * @param {Object} v1 - First version
 * @param {Object} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1, v2) {
    if (v1.major !== v2.major) {
        return v1.major - v2.major;
    }
    return v1.minor - v2.minor;
}

/**
 * Get version display text for UI
 *
 * @param {Object} quoteMetadata - Quote metadata with version info
 * @returns {string} Display text
 */
export function getVersionDisplay(quoteMetadata) {
    const { status, version, supersededBy } = quoteMetadata;

    switch (status) {
        case QuoteStatus.DRAFT:
            return `DRAFT (${version?.string || 'v1.0'})`;

        case QuoteStatus.SUPERSEDED:
            return `${version?.string || 'v1.0'} (Superseded${supersededBy ? ` by ${supersededBy}` : ''})`;

        case QuoteStatus.OFFICIAL:
            return version?.string || 'v1.0';

        default:
            return version?.string || 'v1.0';
    }
}

/**
 * Validate version metadata structure
 *
 * @param {Object} metadata - Metadata to validate
 * @returns {boolean} True if valid
 */
export function isValidVersionMetadata(metadata) {
    if (!metadata) return false;

    // Required fields
    const required = ['version', 'status', 'createdAt'];
    if (!required.every(field => metadata.hasOwnProperty(field))) {
        return false;
    }

    // Version object structure
    if (!metadata.version.major || !metadata.version.minor || !metadata.version.string) {
        return false;
    }

    // Valid status
    if (!Object.values(QuoteStatus).includes(metadata.status)) {
        return false;
    }

    return true;
}

/**
 * Get changelog summary for display
 *
 * @param {Object} quoteMetadata - Quote metadata
 * @returns {Array} Formatted changelog entries
 */
export function getChangelogSummary(quoteMetadata) {
    if (!quoteMetadata.changeLog || quoteMetadata.changeLog.length === 0) {
        return ['Initial version'];
    }

    return quoteMetadata.changeLog.map(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        return `${date}: ${entry.fromVersion} → ${entry.toVersion} - ${entry.reason}`;
    });
}

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.quoteVersioning = {
        QuoteStatus,
        initializeQuoteVersion,
        detectVersionIncrement,
        incrementVersion,
        getWatermark,
        generateFilename,
        createRevision,
        markAsSuperseded,
        promoteToOfficial,
        parseVersion,
        compareVersions,
        getVersionDisplay,
        isValidVersionMetadata,
        getChangelogSummary
    };
}

export default {
    QuoteStatus,
    initializeQuoteVersion,
    detectVersionIncrement,
    incrementVersion,
    getWatermark,
    generateFilename,
    createRevision,
    markAsSuperseded,
    promoteToOfficial,
    parseVersion,
    compareVersions,
    getVersionDisplay,
    isValidVersionMetadata,
    getChangelogSummary
};
