/**
 * @module CalculationCore
 * @description Pure calculation logic - no external dependencies
 */

export class CalculationCore {
    constructor() {
        this.version = '5.0.0';
    }
    
    /**
     * Calculate mobilization percentage based on kW
     * @param {number} kw - Generator kW rating
     * @returns {number} Mobilization percentage (0.25 - 0.45)
     */
    getMobilizationPercent(kw) {
        if (kw < 100) return 0.25;   // 25% for small generators
        if (kw <= 250) return 0.30;  // 30% for medium
        if (kw <= 500) return 0.35;  // 35% for large
        if (kw <= 1000) return 0.40; // 40% for very large
        return 0.45;                  // 45% for massive generators
    }
    
    /**
     * Calculate service frequency multiplier
     * @param {string} serviceCode - Service code (A-J)
     * @param {number} contractMonths - Contract length in months
     * @returns {number} Frequency multiplier
     */
    getServiceFrequency(serviceCode, contractMonths = 12) {
        // Annual frequencies (times per year)
        const annualFrequencies = {
            'A': 4,    // Quarterly
            'B': 1,    // Annual
            'C': 0.5,  // Biannual
            'D': 1,    // Annual
            'E': 1,    // Annual
            'F': 0.33, // Every 3 years
            'G': 0.33, // Every 3 years
            'H': 0.2,  // Every 5 years
            'I': 1,    // Annual
            'J': 1     // Annual
        };
        
        const annualFrequency = annualFrequencies[serviceCode] || 1;
        return annualFrequency * (contractMonths / 12);
    }
    
    /**
     * Calculate mileage cost
     * @param {number} distance - One-way distance in miles
     * @param {number} serviceCount - Number of services
     * @param {number} contractMonths - Contract length
     * @param {number} mileageRate - Cost per mile
     * @returns {number} Total mileage cost
     */
    calculateMileageCost(distance, serviceCount, contractMonths, mileageRate = 2.50) {
        if (!distance || distance <= 0) return 0;
        // BUG-032 FIX: Validate serviceCount to prevent NaN
        if (!serviceCount || serviceCount <= 0) return 0;

        // Combine services when possible (max 3 per trip)
        const tripsPerMonth = Math.ceil(serviceCount / 3);
        const totalTrips = tripsPerMonth * contractMonths;
        const totalMiles = distance * 2 * totalTrips; // Round trip

        return totalMiles * mileageRate;
    }
    
    /**
     * Calculate quarterly breakdown for services
     * @param {Array} services - Array of service calculations
     * @param {number} contractMonths - Contract length
     * @returns {Array} Quarterly cost breakdown
     */
    calculateQuarterlyBreakdown(services, contractMonths = 12) {
        const quarters = [0, 0, 0, 0];
        
        services.forEach(service => {
            const frequency = service.frequency || this.getServiceFrequency(service.serviceCode);
            
            if (service.serviceCode === 'A') {
                // Quarterly service - distribute evenly
                const perQuarter = service.totalCost / 4;
                quarters.forEach((_, i) => quarters[i] += perQuarter);
            } else if (service.serviceCode === 'B' || service.serviceCode === 'C') {
                // Annual maintenance typically in Q1 and Q3
                quarters[0] += service.totalCost * 0.5;
                quarters[2] += service.totalCost * 0.5;
            } else {
                // Other services typically in Q1
                quarters[0] += service.totalCost;
            }
        });
        
        return quarters;
    }
    
    /**
     * Calculate multi-year escalation
     * @param {number} baseAmount - Base annual amount
     * @param {number} years - Number of years
     * @param {number} escalationRate - Annual escalation rate (default 3%)
     * @returns {Array} Yearly amounts with escalation
     */
    calculateMultiYearEscalation(baseAmount, years, escalationRate = 0.03) {
        const yearlyAmounts = [];
        
        for (let year = 1; year <= years; year++) {
            const escalation = Math.pow(1 + escalationRate, year - 1);
            yearlyAmounts.push({
                year,
                amount: baseAmount * escalation,
                escalation: (escalation - 1) * 100 // Percentage
            });
        }
        
        return yearlyAmounts;
    }
    
    /**
     * Round to accounting precision (2 decimal places)
     * @param {number} value - Value to round
     * @returns {number} Rounded value
     */
    roundMoney(value) {
        return Math.round(value * 100) / 100;
    }
    
    /**
     * Format currency for display
     * @param {number} value - Value to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
    
    /**
     * Format percentage for display
     * @param {number} value - Decimal value (e.g., 0.1025)
     * @returns {string} Formatted percentage string
     */
    formatPercentage(value) {
        return (value * 100).toFixed(3) + '%';
    }
}