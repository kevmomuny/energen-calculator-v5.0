/**
 * Bid Pricing Extractor
 * Extracts per-generator pricing details from RFP for direct v5.0 calculator input
 *
 * Purpose: Transform RFP data into exact format needed for bid pricing
 * - Per-generator details with all v5.0 calc inputs
 * - Service A-J mapping from RFP requirements
 * - Labor multipliers for special access/safety requirements
 * - RFP-specific cost factors (emergency service, documentation, insurance)
 *
 * @version 1.0.0
 */

const path = require('path');

class BidPricingExtractor {
    constructor() {
        // Service A-J menu mapping (from menu-25.docx)
        this.serviceMenu = {
            A: {
                name: 'Comprehensive Inspection',
                keywords: ['inspection', 'quarterly', '18-point', 'battery testing', 'cooling system pressure', 'transfer switch', 'safety shutdown', 'preventative maintenance', 'pm', 'pre-start', 'running test'],
                defaultFrequency: 4, // Quarterly
                description: 'Complete 18-point system inspection'
            },
            B: {
                name: 'Annual Service (Oil, Lube & Filters)',
                keywords: ['oil change', 'filters', 'oil lube', 'annual service', 'fan belt', 'battery cleaning', 'preventative maintenance', 'pm', 'annual pm', 'scheduled maintenance'],
                defaultFrequency: 1, // Annual
                description: 'Complete oil change with filters'
            },
            C: {
                name: 'Cooling System Service',
                keywords: ['cooling system', 'coolant', 'flush', 'hose inspection', 'radiator', 'pressure cap'],
                defaultFrequency: 0.5, // Every 2-3 years
                description: 'Complete system drain and flush'
            },
            D: {
                name: 'Oil & Fuel Analysis',
                keywords: ['oil analysis', 'fuel analysis', 'laboratory', 'fuel sample', 'oil sample', 'metallic decomposition', 'fuel oil sampling', 'coolant sampling', 'fluid sampling', 'contamination'],
                defaultFrequency: 1, // Annual
                description: 'Laboratory fluid analysis'
            },
            E: {
                name: 'Load Bank Testing (2-Hour Full Capacity)',
                keywords: ['load bank', 'full capacity', 'resistive load', '2 hour', 'full load', 'capacity test'],
                defaultFrequency: 1, // Annual
                description: '2-hour full capacity load test'
            },
            F: {
                name: 'Diesel Engine Tune-Up',
                keywords: ['diesel tune', 'valve adjustment', 'injection timing', 'nozzle inspection', 'glow plug'],
                defaultFrequency: 0.2, // Every 3-5 years
                description: 'Complete diesel engine tune-up'
            },
            G: {
                name: 'Gas Engine Tune-Up',
                keywords: ['gas tune', 'spark plug', 'ignition', 'carburetor', 'points condenser'],
                defaultFrequency: 0.33, // Every 2-3 years
                description: 'Complete gas engine tune-up'
            },
            H: {
                name: 'Generator Electrical Testing',
                keywords: ['mega-ohm', 'insulation testing', 'polarization', 'exciter field', 'bearing lubrication'],
                defaultFrequency: 0.2, // Every 5 years
                description: 'Comprehensive electrical testing'
            },
            I: {
                name: 'Automatic Transfer Switch Service',
                keywords: ['transfer switch', 'ATS', 'infrared', 'vacuum panel', 'contact point', 'control timing'],
                defaultFrequency: 1, // Annual for critical
                description: 'Full ATS maintenance and testing'
            },
            J: {
                name: 'Thermal Imaging Scan',
                keywords: ['thermal imaging', 'infrared scan', 'hot spot', 'temperature differential', 'electrical scan'],
                defaultFrequency: 1, // Annual
                description: 'Professional thermal imaging'
            }
        };

        // Labor multiplier triggers (from RFP requirements)
        this.laborMultipliers = {
            rooftopAccess: {
                multiplier: 2.0,
                keywords: ['roof', 'rooftop', 'elevated', 'height'],
                reason: 'Requires 2 technicians for rooftop safety'
            },
            confinedSpace: {
                multiplier: 2.0,
                keywords: ['confined space', 'vault', 'underground', 'basement'],
                reason: 'Confined space entry requires safety observer'
            },
            highVoltage: {
                multiplier: 1.5,
                keywords: ['high voltage', 'switchgear', 'medium voltage', '480V+'],
                reason: 'High voltage work requires additional safety protocols'
            },
            securityClearance: {
                multiplier: 1.0, // No labor multiplier, but adds time/cost for badging
                keywords: ['security clearance', 'DOE', 'badging', 'escort required'],
                reason: 'Security clearance processing and escort requirements'
            },
            loto: {
                multiplier: 1.2,
                keywords: ['lockout', 'tagout', 'LOTO', 'lock out tag out'],
                reason: 'Lockout/Tagout procedures add time'
            }
        };
    }

    /**
     * Extract complete bid pricing data from RFP evaluation
     * @param {Object} comprehensiveEvaluation - Full RFP evaluation from multi-pass extraction
     * @param {Array} equipmentList - Parsed equipment list from Excel
     * @returns {Object} Bid-ready pricing data
     */
    async extractBidPricingData(comprehensiveEvaluation, equipmentList) {
        const pricing = {
            metadata: {
                rfpNumber: comprehensiveEvaluation.extraction?.projectDetails?.bidNumber || 'Unknown',
                projectTitle: comprehensiveEvaluation.extraction?.projectDetails?.projectTitle || 'Unknown',
                agency: comprehensiveEvaluation.extraction?.contactInformation?.agency?.name || 'Unknown',
                extractedAt: new Date().toISOString(),
                confidence: comprehensiveEvaluation.multiPassResults?.overallConfidence || 0
            },
            contractStructure: this._extractContractStructure(comprehensiveEvaluation),
            generators: [],
            rfpCostFactors: this._extractRFPCostFactors(comprehensiveEvaluation),
            serviceMapping: this._mapRFPServicesToMenu(comprehensiveEvaluation),
            pricingAssumptions: []
        };

        // Process each generator from equipment list
        for (const equipment of equipmentList) {
            const generator = await this._extractGeneratorPricingData(
                equipment,
                comprehensiveEvaluation,
                pricing.serviceMapping
            );
            pricing.generators.push(generator);
        }

        // Add global assumptions
        pricing.pricingAssumptions = this._generatePricingAssumptions(
            comprehensiveEvaluation,
            pricing
        );

        return pricing;
    }

    /**
     * Extract per-generator pricing data ready for v5.0 calculator
     */
    async _extractGeneratorPricingData(equipment, rfpEval, serviceMapping) {
        const gen = {
            // Basic identification
            unitNumber: equipment.unitNumber || equipment.index || 0,
            kw: equipment.kw || equipment.kwRating || 0,
            make: equipment.make || equipment.manufacturer || 'Unknown',
            model: equipment.model || 'Unknown',
            serialNumber: equipment.serialNumber || equipment.serial || 'Unknown',
            location: equipment.location || equipment.installationAddress || 'Unknown',

            // v5.0 Calculator Inputs
            kwRange: this._getKwRange(equipment.kw),

            // Services required (A-J codes)
            servicesRequired: serviceMapping.mappedServices || [],

            // Service frequencies (times per year)
            serviceFrequencies: {},

            // Labor multiplier analysis
            laborMultiplier: 1.0,
            laborMultiplierReasons: [],

            // Special requirements affecting pricing
            specialRequirements: [],

            // Distance for mobilization
            distanceFromHQ: equipment.distance || 25, // Default 25 miles if not specified

            // Additional context for pricing
            hoursRun: equipment.hoursRun || 0,
            lastServiceDate: equipment.lastServiceDate || null,
            fuelType: equipment.fuelType || 'Unknown',
            voltage: equipment.voltage || 'Unknown'
        };

        // Determine service frequencies based on RFP requirements
        for (const serviceCode of gen.servicesRequired) {
            gen.serviceFrequencies[serviceCode] = this._determineServiceFrequency(
                serviceCode,
                equipment,
                rfpEval
            );
        }

        // Calculate labor multiplier
        const laborAnalysis = this._analyzeLaborMultipliers(equipment, rfpEval);
        gen.laborMultiplier = laborAnalysis.multiplier;
        gen.laborMultiplierReasons = laborAnalysis.reasons;
        gen.specialRequirements = laborAnalysis.requirements;

        return gen;
    }

    /**
     * Map kW to v5.0 calculator range
     */
    _getKwRange(kw) {
        if (!kw) return '35-150'; // Default
        if (kw >= 2 && kw <= 14) return '2-14';
        if (kw >= 15 && kw <= 30) return '15-30';
        if (kw >= 35 && kw <= 150) return '35-150';
        if (kw >= 155 && kw <= 250) return '155-250';
        if (kw >= 255 && kw <= 400) return '255-400';
        if (kw >= 405 && kw <= 500) return '405-500';
        if (kw >= 505 && kw <= 670) return '505-670';
        if (kw >= 675 && kw <= 1050) return '675-1050';
        if (kw >= 1055 && kw <= 1500) return '1055-1500';
        if (kw >= 1501) return '1500-2050';
        return '35-150';
    }

    /**
     * Map RFP service descriptions to Energen Service A-J codes
     */
    _mapRFPServicesToMenu(rfpEval) {
        const mapping = {
            mappedServices: [],
            confidence: {},
            unmappedServices: []
        };

        const rfpServices = rfpEval.extraction?.services || [];

        for (const rfpService of rfpServices) {
            const serviceText = `${rfpService.description} ${rfpService.details} ${rfpService.rawText}`.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;

            // Find best matching service from menu
            for (const [code, menuService] of Object.entries(this.serviceMenu)) {
                let score = 0;
                for (const keyword of menuService.keywords) {
                    if (serviceText.includes(keyword.toLowerCase())) {
                        score++;
                    }
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = code;
                }
            }

            if (bestMatch && bestScore > 0) {
                if (!mapping.mappedServices.includes(bestMatch)) {
                    mapping.mappedServices.push(bestMatch);
                }
                mapping.confidence[bestMatch] = Math.min(bestScore / 3, 1.0); // Normalize to 0-1
            } else {
                mapping.unmappedServices.push(rfpService.description);
            }
        }

        return mapping;
    }

    /**
     * Determine service frequency for specific generator
     */
    _determineServiceFrequency(serviceCode, equipment, rfpEval) {
        // Check if RFP specifies frequency
        const rfpServices = rfpEval.extraction?.services || [];
        for (const svc of rfpServices) {
            if (svc.frequency) {
                const freq = svc.frequency.toLowerCase();
                if (freq.includes('quarter')) return 4;
                if (freq.includes('semi-annual') || freq.includes('twice')) return 2;
                if (freq.includes('annual') || freq.includes('yearly')) return 1;
                if (freq.includes('monthly')) return 12;
            }
        }

        // Use default from service menu
        return this.serviceMenu[serviceCode]?.defaultFrequency || 1;
    }

    /**
     * Analyze labor multipliers from RFP requirements
     */
    _analyzeLaborMultipliers(equipment, rfpEval) {
        const analysis = {
            multiplier: 1.0,
            reasons: [],
            requirements: []
        };

        const locationText = `${equipment.location || ''} ${equipment.notes || ''}`.toLowerCase();
        const rfpText = JSON.stringify(rfpEval).toLowerCase();

        // Check each multiplier trigger
        for (const [key, trigger] of Object.entries(this.laborMultipliers)) {
            for (const keyword of trigger.keywords) {
                if (locationText.includes(keyword.toLowerCase()) || rfpText.includes(keyword.toLowerCase())) {
                    analysis.multiplier = Math.max(analysis.multiplier, trigger.multiplier);
                    analysis.reasons.push(trigger.reason);
                    analysis.requirements.push(keyword);
                    break;
                }
            }
        }

        return analysis;
    }

    /**
     * Extract RFP-specific cost factors
     */
    _extractRFPCostFactors(rfpEval) {
        const factors = {
            emergencyService: {
                required: false,
                responseTime: null,
                coverage: null,
                estimatedCostImpact: 0
            },
            documentationBurden: {
                required: false,
                hoursPerGenerator: 0,
                requirements: [],
                estimatedCostImpact: 0
            },
            insuranceRequirements: {
                additionalInsured: false,
                waiverOfSubrogation: false,
                primaryNoncontributory: false,
                estimatedCostImpact: 0
            },
            securityClearance: {
                required: false,
                type: null,
                processingTime: null,
                estimatedCostImpact: 0
            },
            specialTraining: {
                required: false,
                certifications: [],
                estimatedCostImpact: 0
            }
        };

        // Extract from trap detection results (in extraction.hiddenRequirements)
        const traps = rfpEval.extraction?.hiddenRequirements || {};

        // Emergency service
        if (traps.laborTraps?.emergencyResponse?.found) {
            factors.emergencyService.required = true;
            factors.emergencyService.responseTime = traps.laborTraps.emergencyResponse.extractedData?.responseTime;
            factors.emergencyService.coverage = traps.laborTraps.emergencyResponse.extractedData?.coverage;
            factors.emergencyService.estimatedCostImpact = 15; // 15% cost increase estimate
        }

        // Documentation burden
        if (traps.complianceTraps?.documentationBurden?.found) {
            factors.documentationBurden.required = true;
            const docs = traps.complianceTraps.documentationBurden.extractedData?.requiredDocs || '';
            factors.documentationBurden.requirements = docs.split(',').map(d => d.trim());
            factors.documentationBurden.hoursPerGenerator = 0.5; // Estimate 30 min per generator per service
            factors.documentationBurden.estimatedCostImpact = 3; // 3% cost increase
        }

        // Insurance requirements
        if (traps.complianceTraps?.insuranceAdditional?.found) {
            const insurance = traps.complianceTraps.insuranceAdditional.extractedData;
            factors.insuranceRequirements.additionalInsured = !!insurance?.additionalInsured;
            factors.insuranceRequirements.waiverOfSubrogation = insurance?.waiverRequired?.includes('waiver');
            factors.insuranceRequirements.primaryNoncontributory = insurance?.policyType === 'Primary and noncontributory';
            factors.insuranceRequirements.estimatedCostImpact = 8; // 8% cost increase
        }

        // Security clearance
        if (traps.accessTraps?.securityClearance?.found) {
            factors.securityClearance.required = true;
            factors.securityClearance.type = traps.accessTraps.securityClearance.extractedData?.clearanceType;
            factors.securityClearance.estimatedCostImpact = 2; // 2% for admin overhead
        }

        // Special training
        if (traps.complianceTraps?.environmentalSafety?.found) {
            factors.specialTraining.required = true;
            const certs = traps.complianceTraps.environmentalSafety.extractedData?.certifications || '';
            factors.specialTraining.certifications = certs.split(',').map(c => c.trim());
            factors.specialTraining.estimatedCostImpact = 4; // 4% for training costs
        }

        return factors;
    }

    /**
     * Extract contract structure (base period + options)
     */
    _extractContractStructure(rfpEval) {
        const schedule = rfpEval.extraction?.schedule || {};
        return {
            duration: schedule.duration || 'Unknown',
            basePeriod: this._parseBasePeriod(schedule.duration),
            optionYears: this._parseOptionYears(schedule.duration),
            pricingStructure: 'fixed', // From RFP: fixed prices for base period
            escalationAllowed: false, // RFP says "may only be modified by bilateral agreement"
            annualEscalation: 0.05 // 5% if allowed in option years
        };
    }

    _parseBasePeriod(durationStr) {
        if (!durationStr) return 1;
        // Handle formats like "two (2) years", "2 years", "two years"
        const numMatch = durationStr.match(/(\d+)\s*year/i);
        if (numMatch) return parseInt(numMatch[1]);

        const wordMatch = durationStr.match(/(one|two|three|four|five)\s*(?:\(\d+\))?\s*year/i);
        if (wordMatch) {
            const words = {one: 1, two: 2, three: 3, four: 4, five: 5};
            return words[wordMatch[1].toLowerCase()] || 1;
        }
        return 1;
    }

    _parseOptionYears(durationStr) {
        if (!durationStr) return 0;
        // Handle formats like "three (3) option years", "3 option years"
        const numMatch = durationStr.match(/(\d+)\s*option/i);
        if (numMatch) return parseInt(numMatch[1]);

        const wordMatch = durationStr.match(/(one|two|three|four|five)\s*(?:\(\d+\))?\s*option/i);
        if (wordMatch) {
            const words = {one: 1, two: 2, three: 3, four: 4, five: 5};
            return words[wordMatch[1].toLowerCase()] || 0;
        }
        return 0;
    }

    /**
     * Generate pricing assumptions document
     */
    _generatePricingAssumptions(rfpEval, pricingData) {
        const assumptions = [];

        // Contract assumptions
        assumptions.push({
            category: 'Contract Structure',
            assumption: `Base period: ${pricingData.contractStructure.basePeriod} years with ${pricingData.contractStructure.optionYears} option years`,
            source: 'RFP Schedule Section',
            impact: 'Pricing is fixed for base period only'
        });

        // Service mapping confidence
        const lowConfidenceServices = Object.entries(pricingData.serviceMapping.confidence)
            .filter(([code, conf]) => conf < 0.7)
            .map(([code]) => code);

        if (lowConfidenceServices.length > 0) {
            assumptions.push({
                category: 'Service Mapping',
                assumption: `Services ${lowConfidenceServices.join(', ')} mapped with <70% confidence`,
                source: 'RFP service descriptions vs. Energen menu',
                impact: 'Verify service scope during pre-proposal conference'
            });
        }

        // Labor multipliers
        const unitsWithMultipliers = pricingData.generators.filter(g => g.laborMultiplier > 1.0).length;
        if (unitsWithMultipliers > 0) {
            assumptions.push({
                category: 'Labor Costs',
                assumption: `${unitsWithMultipliers} generators require ${Math.max(...pricingData.generators.map(g => g.laborMultiplier))}x labor multiplier`,
                source: 'RFP location/access requirements',
                impact: 'Rooftop, confined space, or high-voltage access increases labor costs'
            });
        }

        // RFP cost factors
        const totalImpact = Object.values(pricingData.rfpCostFactors)
            .reduce((sum, factor) => sum + (factor.estimatedCostImpact || 0), 0);

        assumptions.push({
            category: 'RFP-Specific Costs',
            assumption: `Estimated ${totalImpact}% cost increase from RFP requirements`,
            source: 'Hidden requirements trap detection',
            impact: 'Emergency service, documentation, insurance, training, security clearance'
        });

        // Distance assumptions
        const maxDistance = Math.max(...pricingData.generators.map(g => g.distanceFromHQ));
        if (maxDistance > 50) {
            assumptions.push({
                category: 'Mobilization',
                assumption: `Maximum distance ${maxDistance} miles from HQ`,
                source: 'Equipment list or default estimate',
                impact: 'Higher mobilization costs for distant generators'
            });
        }

        return assumptions;
    }
}

module.exports = { BidPricingExtractor };
