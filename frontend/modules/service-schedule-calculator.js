/**
 * @fileoverview Service Schedule Calculator Module - Sprint 3
 * Calculates quarterly service schedules BEFORE PDF generation
 * Handles service distribution, load bank winter avoidance, and workload balancing
 *
 * @module frontend/modules/service-schedule-calculator
 * @author Energen Team
 * @version 5.0.0
 */

// Winter months to avoid for Load Bank testing (DEC, JAN, FEB)
const WINTER_MONTHS = [12, 1, 2];

// Month names for quarter labels
const MONTH_NAMES = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

/**
 * Service frequency mapping
 * 4 = Quarterly (all 4 quarters)
 * 2 = Semi-Annual (Q1 & Q3)
 * 1 = Annual (Q1 only)
 */
const FREQUENCY_MAP = {
    QUARTERLY: 4,
    SEMI_ANNUAL: 2,
    ANNUAL: 1
};

/**
 * Main function: Calculate service schedule for entire bid
 * Called from buildQuoteData() before PDF generation
 *
 * @param {Object} state - Application state with units and services
 * @param {Date} bidCreationDate - Date the bid was created (defaults to now)
 * @returns {Object} Service schedule data structure for PDF/Zoho
 */
export function calculateServiceSchedule(state, bidCreationDate = new Date()) {
    console.log('[SERVICE SCHEDULE] Calculating quarterly schedule', {
        bidDate: bidCreationDate,
        unitsCount: state.units.length
    });

    // Calculate first service month (bid date + 1 month)
    const firstServiceMonth = getFirstServiceMonth(bidCreationDate);

    // Generate 4 quarters starting from first service month
    const quarters = generateQuarters(firstServiceMonth);

    // Collect all services from all units with their frequencies and costs
    const allServices = collectAllServices(state);

    // Distribute services across quarters based on frequency and rules
    const distributedQuarters = distributeServices(quarters, allServices);

    // Calculate totals per quarter
    const quartersWithTotals = calculateQuarterTotals(distributedQuarters);

    return {
        startDate: bidCreationDate.toISOString(),
        firstServiceMonth: firstServiceMonth,
        quarters: quartersWithTotals,
        notes: {
            loadBankWinterAvoidance: hasLoadBankService(allServices),
            schedulingFlexible: true,
            billingBasis: 'work completed'
        }
    };
}

/**
 * Calculate first service month (bid date + 1 month)
 * Example: Bid Oct 4 → First service NOV (month 11)
 *
 * @param {Date} bidDate - Bid creation date
 * @returns {number} First service month (1-12)
 */
function getFirstServiceMonth(bidDate) {
    const nextMonth = new Date(bidDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.getMonth() + 1; // JS months are 0-indexed, return 1-indexed
}

/**
 * Generate 4 quarterly structures
 * Example: First month NOV → "NOV Qtr 1", "FEB Qtr 2", "MAY Qtr 3", "AUG Qtr 4"
 *
 * @param {number} firstMonth - First service month (1-12)
 * @returns {Array} Array of 4 quarter objects
 */
function generateQuarters(firstMonth) {
    const quarters = [];

    for (let i = 0; i < 4; i++) {
        // Calculate month for this quarter (every 3 months)
        let month = firstMonth + (i * 3);
        if (month > 12) month = month - 12; // Wrap around year

        quarters.push({
            label: `${MONTH_NAMES[month - 1]} Qtr ${i + 1}`,
            month: month,
            services: [],
            total: 0
        });
    }

    return quarters;
}

/**
 * Collect all services from all units with frequencies and costs
 *
 * @param {Object} state - Application state
 * @returns {Array} Array of service objects with metadata
 */
function collectAllServices(state) {
    const services = [];

    state.units.forEach(unit => {
        if (!unit.services) return;

        unit.services.forEach(serviceCode => {
            // Handle CUSTOM services differently - they don't have server calculations
            if (serviceCode === 'CUSTOM') {
                // Get custom service entries from the unit
                if (Array.isArray(unit.customServices?.CUSTOM)) {
                    unit.customServices.CUSTOM.forEach(entry => {
                        if (entry.cost > 0) {
                            services.push({
                                code: 'CUSTOM',
                                name: entry.description || 'Custom Service',
                                frequency: 1,
                                cost: entry.cost,
                                unitId: unit.id,
                                unitKw: unit.kw,
                                isLoadBank: false
                            });
                        }
                    });
                }
                return; // Skip normal processing for CUSTOM
            }

            // Standard services require server calculations
            if (!unit.serverCalculations) return;

            // Get frequency for this service (default to 1 if not set)
            const frequency = unit.serviceFrequencies?.[serviceCode] || 1;

            // Get cost from server calculations
            const serviceCost = getServiceCost(unit.serverCalculations, serviceCode);

            if (serviceCost > 0) {
                services.push({
                    code: serviceCode,
                    name: getServiceName(serviceCode),
                    frequency: frequency,
                    cost: serviceCost,
                    unitId: unit.id,
                    unitKw: unit.kw,
                    isLoadBank: serviceCode === 'E'
                });
            }
        });
    });

    console.log('[SERVICE SCHEDULE] Collected services:', services);
    return services;
}

/**
 * Extract service cost from server calculations
 *
 * @param {Object} calculations - Server calculation results
 * @param {string} serviceCode - Service code (A-J, K, Custom)
 * @returns {number} Service cost
 */
function getServiceCost(calculations, serviceCode) {
    // Check service breakdown first
    if (calculations.serviceBreakdown && calculations.serviceBreakdown[serviceCode]) {
        const breakdown = calculations.serviceBreakdown[serviceCode];
        return (breakdown.totalLabor || 0) + (breakdown.totalParts || 0);
    }

    // Fallback to services object
    if (calculations.services && calculations.services[serviceCode]) {
        return calculations.services[serviceCode].grandTotal || 0;
    }

    return 0;
}

/**
 * Get human-readable service name
 *
 * @param {string} code - Service code
 * @returns {string} Service name
 */
function getServiceName(code) {
    const names = {
        'A': 'Comprehensive Inspection',
        'B': 'Oil & Filter Service',
        'C': 'Coolant Service',
        'D': 'Fluid Analysis',
        'E': 'Load Bank Testing',
        'F': 'Diesel Tune-Up',
        'G': 'Gas Tune-Up',
        'H': 'Electrical Testing',
        'I': 'Transfer Switch Service',
        'J': 'Thermal Imaging',
        'K': 'Custom Service Package',
        'CUSTOM': 'Custom Service'
    };
    return names[code] || `Service ${code}`;
}

/**
 * Check if Load Bank service is present
 *
 * @param {Array} services - Array of service objects
 * @returns {boolean} True if Load Bank is included
 */
function hasLoadBankService(services) {
    return services.some(s => s.isLoadBank);
}

/**
 * Distribute services across quarters based on frequency rules
 *
 * DISTRIBUTION RULES:
 * - Quarterly (4x) → ALL 4 quarters
 * - Semi-Annual (2x) → Q1 & Q3
 * - Annual (1x) → Q1 only
 *
 * SPECIAL RULES:
 * - Load Bank: Avoid winter months (DEC, JAN, FEB)
 * - Balancing: Spread services to avoid stacking when possible
 *
 * @param {Array} quarters - Array of quarter objects
 * @param {Array} services - Array of service objects
 * @returns {Array} Quarters with services distributed
 */
function distributeServices(quarters, services) {
    const distributedQuarters = JSON.parse(JSON.stringify(quarters)); // Deep clone

    // Sort services by frequency (quarterly first, then semi-annual, then annual)
    // This helps with balancing
    const sortedServices = services.sort((a, b) => b.frequency - a.frequency);

    sortedServices.forEach(service => {
        const quarterIndices = getQuarterIndicesForService(
            service,
            distributedQuarters
        );

        // Add service to designated quarters
        quarterIndices.forEach(qIndex => {
            distributedQuarters[qIndex].services.push({
                name: service.name,
                code: service.code,
                cost: service.cost
            });
        });
    });

    return distributedQuarters;
}

/**
 * Determine which quarters a service should appear in
 *
 * @param {Object} service - Service object
 * @param {Array} quarters - Quarter objects (for winter checking)
 * @returns {Array<number>} Array of quarter indices (0-3)
 */
function getQuarterIndicesForService(service, quarters) {
    // LOAD BANK SPECIAL HANDLING
    if (service.isLoadBank) {
        return getLoadBankQuarters(quarters, service.frequency);
    }

    // STANDARD FREQUENCY DISTRIBUTION
    switch (service.frequency) {
        case FREQUENCY_MAP.QUARTERLY: // 4x per year
            return [0, 1, 2, 3]; // All quarters

        case FREQUENCY_MAP.SEMI_ANNUAL: // 2x per year
            return [0, 2]; // Q1 and Q3

        case FREQUENCY_MAP.ANNUAL: // 1x per year
        default:
            return [0]; // Q1 only
    }
}

/**
 * Get quarter assignments for Load Bank with winter avoidance
 *
 * WINTER MONTHS: DEC (12), JAN (1), FEB (2)
 *
 * Strategy:
 * 1. Identify which quarters fall in winter
 * 2. Assign to non-winter quarters
 * 3. If unavoidable (all quarters are winter), flag for manual adjustment
 *
 * @param {Array} quarters - Quarter objects
 * @param {number} frequency - Service frequency (1, 2, or 4)
 * @returns {Array<number>} Quarter indices avoiding winter
 */
function getLoadBankQuarters(quarters, frequency) {
    // Identify non-winter quarters
    const nonWinterQuarters = [];
    const winterQuarters = [];

    quarters.forEach((q, index) => {
        if (WINTER_MONTHS.includes(q.month)) {
            winterQuarters.push(index);
        } else {
            nonWinterQuarters.push(index);
        }
    });

    console.log('[LOAD BANK SCHEDULING]', {
        frequency,
        nonWinterQuarters,
        winterQuarters,
        quarterMonths: quarters.map(q => q.label)
    });

    // QUARTERLY (4x): Attempt to use non-winter quarters, supplement with winter if needed
    if (frequency === FREQUENCY_MAP.QUARTERLY) {
        if (nonWinterQuarters.length >= 4) {
            return [0, 1, 2, 3]; // All quarters are safe
        } else if (nonWinterQuarters.length >= 2) {
            // Use non-winter quarters, fill remaining with least-bad winter quarters
            return [...nonWinterQuarters, ...winterQuarters].slice(0, 4);
        } else {
            // Unavoidable - all quarters in winter, flag it
            console.warn('[LOAD BANK] All quarters in winter - manual scheduling required');
            return [0, 1, 2, 3];
        }
    }

    // SEMI-ANNUAL (2x): Use Q1 and Q3, swap if in winter
    if (frequency === FREQUENCY_MAP.SEMI_ANNUAL) {
        if (nonWinterQuarters.length >= 2) {
            // Prefer Q1 (index 0) and Q3 (index 2)
            const q1Safe = !WINTER_MONTHS.includes(quarters[0].month);
            const q3Safe = !WINTER_MONTHS.includes(quarters[2].month);

            if (q1Safe && q3Safe) return [0, 2];
            if (q1Safe) return [0, nonWinterQuarters.find(i => i !== 0)];
            if (q3Safe) return [nonWinterQuarters.find(i => i !== 2), 2];

            // Use any 2 non-winter quarters
            return nonWinterQuarters.slice(0, 2);
        } else if (nonWinterQuarters.length === 1) {
            // One safe quarter + one risky quarter
            console.warn('[LOAD BANK] Only one non-winter quarter available');
            return [nonWinterQuarters[0], winterQuarters[0]];
        } else {
            // All winter - unavoidable
            console.warn('[LOAD BANK] No non-winter quarters available for semi-annual');
            return [0, 2];
        }
    }

    // ANNUAL (1x): Use first non-winter quarter, fallback to Q1
    if (frequency === FREQUENCY_MAP.ANNUAL) {
        if (nonWinterQuarters.length > 0) {
            return [nonWinterQuarters[0]]; // First safe quarter
        } else {
            console.warn('[LOAD BANK] Annual service falls in winter - manual scheduling recommended');
            return [0]; // Q1 even if winter
        }
    }

    // Fallback
    return [0];
}

/**
 * Calculate totals for each quarter
 *
 * @param {Array} quarters - Quarters with services distributed
 * @returns {Array} Quarters with total costs calculated
 */
function calculateQuarterTotals(quarters) {
    return quarters.map(quarter => {
        const total = quarter.services.reduce((sum, service) => sum + service.cost, 0);
        return {
            ...quarter,
            total: total
        };
    });
}

/**
 * Generate schedule summary for logging/debugging
 *
 * @param {Object} schedule - Complete service schedule
 * @returns {string} Human-readable summary
 */
export function getScheduleSummary(schedule) {
    const lines = [];
    lines.push(`Service Schedule (Start: ${new Date(schedule.startDate).toLocaleDateString()})`);
    lines.push(`First Service Month: ${MONTH_NAMES[schedule.firstServiceMonth - 1]}`);
    lines.push('');

    schedule.quarters.forEach((q, i) => {
        lines.push(`${q.label} - $${q.total.toFixed(2)}`);
        q.services.forEach(s => {
            lines.push(`  • ${s.name}: $${s.cost.toFixed(2)}`);
        });
    });

    lines.push('');
    lines.push(`Total Annual: $${schedule.quarters.reduce((sum, q) => sum + q.total, 0).toFixed(2)}`);

    if (schedule.notes.loadBankWinterAvoidance) {
        lines.push('');
        lines.push('⚠ Load Bank Testing included - winter months avoided where possible');
    }

    return lines.join('\n');
}

/**
 * Validate schedule for potential issues
 *
 * @param {Object} schedule - Service schedule to validate
 * @returns {Object} Validation result with warnings
 */
export function validateSchedule(schedule) {
    const warnings = [];

    // Check for Load Bank in winter
    schedule.quarters.forEach((quarter, i) => {
        const hasLoadBank = quarter.services.some(s => s.code === 'E');
        if (hasLoadBank && WINTER_MONTHS.includes(quarter.month)) {
            warnings.push({
                quarter: i + 1,
                quarterLabel: quarter.label,
                issue: 'Load Bank scheduled in winter month',
                severity: 'warning',
                recommendation: 'Consider rescheduling to avoid temporary cable issues in cold weather'
            });
        }
    });

    // Check for heavily stacked quarters
    const avgTotal = schedule.quarters.reduce((sum, q) => sum + q.total, 0) / 4;
    schedule.quarters.forEach((quarter, i) => {
        if (quarter.total > avgTotal * 1.5) {
            warnings.push({
                quarter: i + 1,
                quarterLabel: quarter.label,
                issue: `High cost quarter ($${quarter.total.toFixed(2)} vs avg $${avgTotal.toFixed(2)})`,
                severity: 'info',
                recommendation: 'Services heavily concentrated in this quarter - may impact cashflow'
            });
        }
    });

    return {
        valid: warnings.filter(w => w.severity === 'error').length === 0,
        warnings: warnings
    };
}

// Export for use in summary-calculator.js and PDF generation
export default {
    calculateServiceSchedule,
    getScheduleSummary,
    validateSchedule
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.serviceScheduleCalculator = {
        calculateServiceSchedule,
        getScheduleSummary,
        validateSchedule
    };
}
