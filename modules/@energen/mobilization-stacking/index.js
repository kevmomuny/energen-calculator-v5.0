/**
 * @energen/mobilization-stacking
 *
 * Intelligent mobilization cost stacking for service bundling
 * Reduces mobilization charges when multiple services occur during same visit
 * Maintains minimum 1-hour mobilization per visit
 */

export class MobilizationStackingEngine {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            enabled: config.enabled ?? true,
            stackingCharge: config.stackingCharge ?? 65, // Default 65% charge for additional mobilizations
            minimumHours: config.minimumHours ?? 1,
            mobilizationRate: config.mobilizationRate ?? 150,

            // Service visit frequency definitions
            visitSchedules: {
                quarterly: ['A', 'B', 'C'],      // Q1, Q2, Q3, Q4
                annual: ['E', 'F', 'G', 'H'],    // Annual (dry season)
                biannual: ['D', 'I', 'J'],        // Twice yearly
                asNeeded: ['K']                   // On-demand
            },

            // Seasonal configuration
            seasonal: {
                enabled: config.seasonal?.enabled ?? true,
                dryMonths: config.seasonal?.dryMonths ?? [5, 6, 7, 8, 9, 10], // May-Oct
                wetMonths: config.seasonal?.wetMonths ?? [11, 12, 1, 2, 3, 4] // Nov-Apr
            }
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Group services by their visit schedule
     * @param {Array} selectedServices - Array of service letters
     * @returns {Object} Services grouped by visit schedule
     */
    groupServicesByVisit(selectedServices) {
        const groups = {};

        selectedServices.forEach(service => {
            const schedule = this.getServiceSchedule(service);
            if (!groups[schedule]) {
                groups[schedule] = [];
            }
            groups[schedule].push(service);
        });

        return groups;
    }

    /**
     * Get the visit schedule for a service
     * @param {string} serviceLetter - Service letter (A-K)
     * @returns {string} Schedule type
     */
    getServiceSchedule(serviceLetter) {
        const { visitSchedules } = this.config;

        for (const [schedule, services] of Object.entries(visitSchedules)) {
            if (services.includes(serviceLetter)) {
                return schedule;
            }
        }

        return 'asNeeded';
    }

    /**
     * Calculate stacked mobilization for a group of services
     * @param {Array} serviceGroup - Services happening on same visit
     * @param {Object} mobilizationHours - Map of service to mobilization hours
     * @returns {Object} Mobilization calculation details
     */
    calculateStackedMobilization(serviceGroup, mobilizationHours) {
        if (!this.config.enabled) {
            // If stacking disabled, return sum of all mobilizations
            const totalHours = serviceGroup.reduce((sum, service) => {
                return sum + (mobilizationHours[service] || 0);
            }, 0);

            return {
                totalHours,
                totalCost: totalHours * this.config.mobilizationRate,
                savings: 0,
                breakdown: serviceGroup.map(service => ({
                    service,
                    hours: mobilizationHours[service] || 0,
                    cost: (mobilizationHours[service] || 0) * this.config.mobilizationRate
                }))
            };
        }

        // Get all mobilization hours for this visit group
        const mobilizations = serviceGroup.map(service => ({
            service,
            hours: mobilizationHours[service] || 0
        }));

        // Sort by hours (descending) to find the largest
        mobilizations.sort((a, b) => b.hours - a.hours);

        if (mobilizations.length === 0) {
            return {
                totalHours: 0,
                totalCost: 0,
                savings: 0,
                breakdown: []
            };
        }

        // Calculate stacked total
        const largestMobilization = mobilizations[0].hours;
        const otherMobilizations = mobilizations.slice(1);
        const sumOthers = otherMobilizations.reduce((sum, m) => sum + m.hours, 0);

        // BUG-015 FIX: Round intermediate calculations to prevent floating point errors
        // Apply stacking charge percentage to secondary mobilizations
        const chargedOthers = Math.round(sumOthers * this.config.stackingCharge) / 100;

        // Ensure minimum hours
        const totalHours = Math.max(this.config.minimumHours, largestMobilization + chargedOthers);

        // Calculate savings
        const standardTotal = mobilizations.reduce((sum, m) => sum + m.hours, 0);
        const savings = (standardTotal - totalHours) * this.config.mobilizationRate;

        return {
            totalHours,
            totalCost: totalHours * this.config.mobilizationRate,
            savings,
            standardTotal: standardTotal * this.config.mobilizationRate,
            breakdown: mobilizations.map(m => ({
                service: m.service,
                hours: m.hours,
                cost: m.hours * this.config.mobilizationRate,
                isPrimary: m === mobilizations[0]
            })),
            stackingCharge: this.config.stackingCharge
        };
    }

    /**
     * Calculate all mobilization costs for a quote
     * @param {Array} services - Selected services
     * @param {Object} mobilizationData - Service mobilization hours by service
     * @returns {Object} Complete mobilization breakdown
     */
    calculateQuoteMobilization(services, mobilizationData) {
        const visitGroups = this.groupServicesByVisit(services);
        const results = {};
        let totalMobilizationCost = 0;
        let totalSavings = 0;

        for (const [schedule, serviceGroup] of Object.entries(visitGroups)) {
            const calculation = this.calculateStackedMobilization(
                serviceGroup,
                mobilizationData
            );

            results[schedule] = calculation;
            totalMobilizationCost += calculation.totalCost;
            totalSavings += calculation.savings;
        }

        return {
            enabled: this.config.enabled,
            stackingCharge: this.config.stackingCharge,
            visitGroups: results,
            totalMobilizationCost,
            totalSavings,
            effectiveDiscount: totalSavings > 0
                ? Math.round((totalSavings / (totalMobilizationCost + totalSavings)) * 100)
                : 0
        };
    }

    /**
     * Validate service scheduling for seasonal constraints
     * @param {Array} services - Selected services
     * @param {number} month - Month number (1-12)
     * @returns {Array} Warnings about scheduling
     */
    validateSeasonalScheduling(services, month = new Date().getMonth() + 1) {
        const warnings = [];

        if (!this.config.seasonal.enabled) {
            return warnings;
        }

        const isWetSeason = this.config.seasonal.wetMonths.includes(month);

        // Check for load bank testing in wet season
        if (services.includes('E') && isWetSeason) {
            warnings.push({
                service: 'E',
                serviceName: 'Load Bank Testing',
                type: 'seasonal',
                severity: 'high',
                message: 'Load Bank Testing scheduled during wet season - dangerous conditions',
                recommendation: 'Reschedule for dry months (May-October)'
            });
        }

        // Check for outdoor electrical work in wet season
        const outdoorElectrical = ['H', 'I'];
        outdoorElectrical.forEach(service => {
            if (services.includes(service) && isWetSeason) {
                warnings.push({
                    service,
                    serviceName: service === 'H' ? 'Generator Electrical Testing' : 'Transfer Switch Service',
                    type: 'seasonal',
                    severity: 'medium',
                    message: `Service ${service} may be affected by wet weather`,
                    recommendation: 'Consider weather conditions when scheduling'
                });
            }
        });

        return warnings;
    }

    /**
     * Get preset configurations
     */
    static getPresets() {
        return {
            aggressive: {
                stackingDiscount: 0,
                description: 'Maximum discount - only charge largest mobilization'
            },
            competitive: {
                stackingDiscount: 35,
                description: 'Balanced pricing - competitive but profitable'
            },
            standard: {
                stackingDiscount: 70,
                description: 'Standard pricing - moderate discount'
            },
            full: {
                stackingDiscount: 100,
                description: 'Full pricing - charge all mobilizations'
            }
        };
    }

    /**
     * Calculate example for UI display
     * @param {number} kw - Generator size
     * @param {Array} services - Example services
     * @param {number} stackingDiscount - Discount percentage
     * @returns {Object} Example calculation
     */
    static calculateExample(kw = 30, services = ['A', 'B', 'C'], stackingDiscount = 35) {
        // Simplified example calculation for UI
        const mobilizationRate = 150;
        const hoursPerService = 2; // Typical for small generators

        const standardTotal = services.length * hoursPerService * mobilizationRate;
        const largestMobilization = hoursPerService * mobilizationRate;
        const otherMobilizations = (services.length - 1) * hoursPerService * mobilizationRate;
        const discountedOthers = otherMobilizations * (stackingDiscount / 100);
        const stackedTotal = largestMobilization + discountedOthers;
        const savings = standardTotal - stackedTotal;

        return {
            kw,
            services,
            stackingDiscount,
            standardTotal,
            stackedTotal,
            savings,
            percentSaved: Math.round((savings / standardTotal) * 100)
        };
    }
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobilizationStackingEngine;
}