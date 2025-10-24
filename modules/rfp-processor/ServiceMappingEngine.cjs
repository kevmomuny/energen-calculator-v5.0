/**
 * @module ServiceMappingEngine
 * @description Maps extracted RFP/RFQ services to Energen's ServiceA-J categories
 * @version 1.0.0
 *
 * Purpose: Intelligently maps RFP service descriptions to generator maintenance services
 * using keyword matching, frequency analysis, and semantic scoring.
 *
 * Integration: Phase 1 of RFP/RFQ Document Processing Module
 * Reference: modules/@energen/calc-engine/core/ServiceDefinitions.js
 */

const path = require('path');
const fs = require('fs');

/**
 * Service Mapping Rules Dictionary
 * Based on actual ServiceDefinitions.js analysis
 */
const SERVICE_MAPPING_RULES = {
    ServiceA: {
        name: 'Comprehensive Inspection',
        keywords: ['inspection', 'comprehensive', 'quarterly', 'routine check', 'visual inspection', 'preventive inspection', 'scheduled inspection', 'walk-around', 'site inspection', 'generator inspection'],
        aliases: ['quarterly maintenance', 'routine inspection', 'quarterly check', 'preventive check', 'scheduled check', 'site visit'],
        frequency: ['quarterly', '4 times/year', 'every 3 months', 'q1', 'q2', 'q3', 'q4'],
        characteristics: ['routine', 'scheduled', 'preventive', 'visual', 'basic'],
        excludeKeywords: ['oil', 'filter', 'coolant', 'load bank', 'electrical'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.5, context: 0.3 }
    },
    ServiceB: {
        name: 'Oil & Filter Service',
        keywords: ['oil change', 'filter', 'oil service', 'lubrication', 'oil and filter', 'engine oil', 'oil replacement', 'filter replacement', 'lube service'],
        aliases: ['oil & filter', 'lube oil service', 'engine oil change', 'filter change', 'oil filter service'],
        frequency: ['annual', 'yearly', 'once/year', 'annually', '1x/year'],
        characteristics: ['annual', 'scheduled', 'maintenance', 'fluid'],
        requiresKeywords: ['oil', 'filter'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.5, context: 0.3 }
    },
    ServiceC: {
        name: 'Coolant Service',
        keywords: ['coolant', 'coolant service', 'coolant replacement', 'coolant flush', 'radiator service', 'cooling system', 'antifreeze', 'coolant change', 'coolant system'],
        aliases: ['radiator flush', 'cooling system service', 'coolant exchange', 'antifreeze service', 'radiator service'],
        frequency: ['annual', 'biannual', 'yearly', 'every 2 years', 'annually'],
        characteristics: ['fluid', 'maintenance', 'cooling', 'thermal'],
        requiresKeywords: ['coolant'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.4, context: 0.3 }
    },
    ServiceD: {
        name: 'Oil, Fuel & Coolant Analysis',
        keywords: ['analysis', 'oil analysis', 'fuel analysis', 'coolant analysis', 'fluid analysis', 'lab analysis', 'sample analysis', 'oil testing', 'fuel testing', 'diagnostic analysis'],
        aliases: ['laboratory analysis', 'fluid testing', 'sample testing', 'diagnostic testing', 'condition monitoring'],
        frequency: ['annual', 'semi-annual', 'quarterly', 'periodic'],
        characteristics: ['diagnostic', 'testing', 'analysis', 'laboratory'],
        requiresKeywords: ['analysis', 'testing', 'sample'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.3, context: 0.4 }
    },
    ServiceE: {
        name: 'Load Bank Testing',
        keywords: ['load bank', 'load test', 'load bank testing', 'performance test', 'full load test', 'load testing', 'capacity test', 'load verification'],
        aliases: ['load test', 'performance testing', 'capacity testing', 'load bank test', 'full load testing'],
        frequency: ['annual', 'yearly', 'once/year', 'annually'],
        characteristics: ['testing', 'performance', 'capacity', 'load'],
        requiresKeywords: ['load'],
        weight: { keyword: 1.0, alias: 0.9, frequency: 0.4, context: 0.3 }
    },
    ServiceF: {
        name: 'Engine Tune-Up (Diesel)',
        keywords: ['tune-up', 'engine tune-up', 'diesel tune-up', 'injector', 'diesel service', 'engine adjustment', 'pop nozzle', 'unit injector', 'diesel engine service'],
        aliases: ['diesel tune', 'engine tuning', 'diesel engine tune-up', 'injector service', 'diesel maintenance'],
        frequency: ['annual', 'yearly', 'periodic', 'scheduled'],
        characteristics: ['diesel', 'engine', 'tune', 'adjustment'],
        requiresKeywords: ['tune', 'diesel', 'engine'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.3, context: 0.4 }
    },
    ServiceG: {
        name: 'Gas Engine Tune-Up',
        keywords: ['gas tune-up', 'spark plug', 'gas engine', 'ignition', 'gas engine tune-up', 'spark plug replacement', 'ignition system', 'gas service'],
        aliases: ['gas tune', 'natural gas tune-up', 'spark plug service', 'ignition service', 'gas engine service'],
        frequency: ['annual', 'yearly', 'periodic', 'scheduled'],
        characteristics: ['gas', 'engine', 'tune', 'spark', 'ignition'],
        requiresKeywords: ['gas', 'spark', 'ignition'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.3, context: 0.4 }
    },
    ServiceH: {
        name: 'Generator Electrical Testing',
        keywords: ['electrical testing', 'electrical test', 'generator electrical', 'insulation test', 'megohm test', 'electrical inspection', 'winding test', 'electrical diagnostic'],
        aliases: ['electrical inspection', 'insulation testing', 'electrical diagnostic', 'winding testing', 'electrical system test'],
        frequency: ['every 5 years', '5 year', 'quinquennial', 'long-term'],
        characteristics: ['electrical', 'testing', 'diagnostic', 'long-term'],
        requiresKeywords: ['electrical'],
        weight: { keyword: 1.0, alias: 0.8, frequency: 0.3, context: 0.4 }
    },
    ServiceI: {
        name: 'Transfer Switch Service',
        keywords: ['transfer switch', 'switch service', 'ats service', 'automatic transfer switch', 'switch maintenance', 'transfer switch maintenance', 'switch testing'],
        aliases: ['ats maintenance', 'transfer switch inspection', 'switch inspection', 'transfer switch test'],
        frequency: ['annual', 'yearly', 'once/year', 'annually'],
        characteristics: ['switch', 'transfer', 'electrical', 'automatic'],
        requiresKeywords: ['transfer', 'switch', 'ats'],
        weight: { keyword: 1.0, alias: 0.9, frequency: 0.4, context: 0.3 }
    },
    ServiceJ: {
        name: 'Thermal Imaging Scan',
        keywords: ['thermal imaging', 'infrared', 'thermal scan', 'ir scan', 'thermal inspection', 'thermography', 'thermal camera', 'heat scan'],
        aliases: ['ir imaging', 'infrared scan', 'thermal survey', 'thermographic inspection', 'heat imaging'],
        frequency: ['annual', 'periodic', 'as-needed'],
        characteristics: ['thermal', 'imaging', 'diagnostic', 'infrared'],
        requiresKeywords: ['thermal', 'infrared', 'thermography'],
        weight: { keyword: 1.0, alias: 0.9, frequency: 0.3, context: 0.3 }
    },
    ServiceK: {
        name: 'Custom Service',
        keywords: ['custom', 'special', 'non-standard', 'other', 'miscellaneous', 'additional', 'special request'],
        aliases: ['other service', 'special service', 'custom work', 'non-standard service', 'additional work'],
        frequency: ['as-needed', 'one-time', 'custom', 'variable'],
        characteristics: ['custom', 'special', 'non-standard', 'flexible'],
        weight: { keyword: 0.5, alias: 0.5, frequency: 0.2, context: 0.5 }
    }
};

class ServiceMappingEngine {
    constructor(config = {}) {
        this.config = {
            confidenceThreshold: config.confidenceThreshold || 0.75,
            minKeywordScore: config.minKeywordScore || 0.3,
            debugMode: config.debugMode || false,
            ...config
        };
        this.mappingRules = SERVICE_MAPPING_RULES;
        this.stats = { totalMappings: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, requiresReview: 0 };
    }

    loadServiceDefinitions() {
        try {
            const defPath = path.join(__dirname, '../@energen/calc-engine/core/ServiceDefinitions.js');
            if (fs.existsSync(defPath)) {
                this.log('ServiceDefinitions path found');
                return true;
            }
            return false;
        } catch (error) {
            this.log(`Error: ${error.message}`);
            return false;
        }
    }

    async mapServices(extractedServices) {
        if (!Array.isArray(extractedServices)) throw new Error('extractedServices must be an array');
        this.loadServiceDefinitions();
        return extractedServices.map(service => this.mapService(service.description || service.name, service.frequency, service));
    }

    mapService(description, frequency = null, details = {}) {
        if (!description || typeof description !== 'string') throw new Error('Service description required');

        this.stats.totalMappings++;
        const cleanDesc = this.cleanText(description);
        const cleanFreq = frequency ? this.cleanText(frequency) : '';

        const scores = {};
        for (const [serviceCode, rules] of Object.entries(this.mappingRules)) {
            scores[serviceCode] = this.calculateServiceScore(cleanDesc, cleanFreq, rules, details);
        }

        const bestMatch = this.findBestMatch(scores);
        const confidence = this.normalizeConfidence(bestMatch.score, bestMatch.serviceCode);
        const requiresReview = this.requiresReview(confidence, bestMatch.serviceCode);
        const alternatives = this.getSuggestions(scores, bestMatch.serviceCode, 3);

        if (confidence >= 0.80) this.stats.highConfidence++;
        else if (confidence >= 0.60) this.stats.mediumConfidence++;
        else this.stats.lowConfidence++;
        if (requiresReview) this.stats.requiresReview++;

        return {
            originalService: description,
            mappedTo: bestMatch.serviceCode,
            mappedName: this.mappingRules[bestMatch.serviceCode].name,
            confidence: parseFloat(confidence.toFixed(3)),
            scores: {
                keywordMatch: parseFloat(bestMatch.details.keywordScore.toFixed(3)),
                aliasMatch: parseFloat(bestMatch.details.aliasScore.toFixed(3)),
                frequencyMatch: parseFloat(bestMatch.details.frequencyScore.toFixed(3)),
                contextMatch: parseFloat(bestMatch.details.contextScore.toFixed(3)),
                total: parseFloat(bestMatch.score.toFixed(3))
            },
            alternativeMatches: alternatives,
            requiresReview: requiresReview,
            reason: this.generateReason(bestMatch, confidence, requiresReview)
        };
    }

    calculateServiceScore(description, frequency, rules, details) {
        const keywordScore = this.calculateKeywordScore(description, rules.keywords);
        const aliasScore = this.calculateKeywordScore(description, rules.aliases);
        const frequencyScore = this.calculateFrequencyMatch(frequency, rules.frequency);
        const contextScore = this.calculateContextScore(description, rules, details);

        if (rules.requiresKeywords && !rules.requiresKeywords.some(kw => description.includes(kw.toLowerCase()))) {
            return { keywordScore: keywordScore * 0.3, aliasScore: aliasScore * 0.3, frequencyScore: frequencyScore * 0.5, contextScore: contextScore * 0.5, total: 0 };
        }

        if (rules.excludeKeywords && rules.excludeKeywords.some(kw => description.includes(kw.toLowerCase()))) {
            return { keywordScore: keywordScore * 0.2, aliasScore: aliasScore * 0.2, frequencyScore: frequencyScore * 0.5, contextScore: contextScore * 0.5, total: 0 };
        }

        const weights = rules.weight;
        const total = keywordScore * weights.keyword + aliasScore * weights.alias + frequencyScore * weights.frequency + contextScore * weights.context;
        return { keywordScore, aliasScore, frequencyScore, contextScore, total };
    }

    calculateKeywordScore(text, keywords) {
        if (!keywords || keywords.length === 0 || !text) return 0;
        const textLower = text.toLowerCase();
        let matches = 0;
        for (const keyword of keywords) {
            const kw = keyword.toLowerCase();
            if (textLower.includes(kw)) {
                matches += new RegExp(`\\b${kw}\\b`).test(textLower) ? 1.5 : 1.0;
            }
        }
        return Math.min(matches / keywords.length, 1.0);
    }

    calculateFrequencyMatch(extractedFreq, expectedFreqs) {
        if (!extractedFreq || !expectedFreqs || expectedFreqs.length === 0) return 0.3;
        const freqLower = extractedFreq.toLowerCase();
        for (const expected of expectedFreqs) {
            if (freqLower.includes(expected.toLowerCase())) return 1.0;
        }
        if (freqLower.includes('annual') || freqLower.includes('yearly')) {
            if (expectedFreqs.some(f => f.includes('annual') || f.includes('yearly'))) return 0.8;
        }
        return 0;
    }

    calculateContextScore(description, rules, details) {
        let score = 0;
        const characteristics = rules.characteristics || [];
        for (const char of characteristics) {
            if (description.toLowerCase().includes(char.toLowerCase())) score += 0.25;
        }
        if (details.equipment && rules.name.toLowerCase().includes(details.equipment.toLowerCase())) score += 0.2;
        return Math.min(score, 1.0);
    }

    findBestMatch(scores) {
        let bestService = 'ServiceK', bestScore = 0, bestDetails = null;
        for (const [serviceCode, scoreDetails] of Object.entries(scores)) {
            if (scoreDetails.total > bestScore) {
                bestScore = scoreDetails.total;
                bestService = serviceCode;
                bestDetails = scoreDetails;
            }
        }
        if (bestScore < 0.3) {
            bestService = 'ServiceK';
            bestDetails = scores.ServiceK;
        }
        return { serviceCode: bestService, score: bestScore, details: bestDetails };
    }

    normalizeConfidence(rawScore, serviceCode) {
        const rules = this.mappingRules[serviceCode];
        const weights = rules.weight;
        const maxPossible = weights.keyword + weights.alias + weights.frequency + weights.context;
        return Math.min(Math.max(rawScore / maxPossible, 0), 1.0);
    }

    getSuggestions(scores, excludeService, topN = 3) {
        const alternatives = [];
        for (const [serviceCode, scoreDetails] of Object.entries(scores)) {
            if (serviceCode !== excludeService) {
                const confidence = this.normalizeConfidence(scoreDetails.total, serviceCode);
                alternatives.push({ service: serviceCode, serviceName: this.mappingRules[serviceCode].name, confidence: parseFloat(confidence.toFixed(3)) });
            }
        }
        alternatives.sort((a, b) => b.confidence - a.confidence);
        return alternatives.slice(0, topN);
    }

    requiresReview(confidence, serviceCode) {
        if (serviceCode === 'ServiceK' && confidence < 0.80) return true;
        if (confidence < this.config.confidenceThreshold) return true;
        return false;
    }

    generateReason(bestMatch, confidence, requiresReview) {
        const { serviceCode, details } = bestMatch;
        if (requiresReview) {
            if (serviceCode === 'ServiceK') return 'No clear match - mapped to Custom Service for review';
            return `Low confidence (${(confidence * 100).toFixed(1)}%) - requires verification`;
        }
        if (details.keywordScore > 0.8) return 'High confidence keyword match';
        if (details.aliasScore > 0.7) return 'Strong alias/synonym match';
        if (details.frequencyScore > 0.8) return 'Frequency pattern match';
        return 'Composite score match across multiple factors';
    }

    cleanText(text) {
        if (!text) return '';
        return text.toLowerCase().replace(/[^\w\s/-]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    validateMapping(service, mappedCategory) {
        if (!this.mappingRules[mappedCategory]) return { valid: false, error: `Invalid service category: ${mappedCategory}` };
        return { valid: true, category: mappedCategory, name: this.mappingRules[mappedCategory].name };
    }

    generateMappingReport(results) {
        const report = {
            summary: {
                totalServices: results.length,
                highConfidence: results.filter(r => r.confidence >= 0.80).length,
                mediumConfidence: results.filter(r => r.confidence >= 0.60 && r.confidence < 0.80).length,
                lowConfidence: results.filter(r => r.confidence < 0.60).length,
                requiresReview: results.filter(r => r.requiresReview).length,
                avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
            },
            byCategory: {},
            needsReview: results.filter(r => r.requiresReview),
            topConfidence: results.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
        };
        for (const result of results) {
            if (!report.byCategory[result.mappedTo]) {
                report.byCategory[result.mappedTo] = { count: 0, avgConfidence: 0, services: [] };
            }
            report.byCategory[result.mappedTo].count++;
            report.byCategory[result.mappedTo].services.push(result.originalService);
        }
        for (const [category, data] of Object.entries(report.byCategory)) {
            const categoryResults = results.filter(r => r.mappedTo === category);
            data.avgConfidence = categoryResults.reduce((sum, r) => sum + r.confidence, 0) / categoryResults.length;
        }
        return report;
    }

    getStats() {
        return { ...this.stats, avgConfidence: this.stats.totalMappings > 0 ? ((this.stats.highConfidence + this.stats.mediumConfidence * 0.7 + this.stats.lowConfidence * 0.4) / this.stats.totalMappings) : 0 };
    }

    resetStats() {
        this.stats = { totalMappings: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, requiresReview: 0 };
    }

    log(message) {
        if (this.config.debugMode) console.log(`[ServiceMappingEngine] ${message}`);
    }
}

module.exports = { ServiceMappingEngine, SERVICE_MAPPING_RULES };
