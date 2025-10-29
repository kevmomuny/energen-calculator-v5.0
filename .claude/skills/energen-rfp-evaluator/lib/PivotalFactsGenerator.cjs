/**
 * Pivotal Facts Generator
 * Creates concise 1-2 page executive summaries from RFP extraction data
 *
 * @module PivotalFactsGenerator
 * @version 1.0.0
 */

/**
 * Generates executive-level pivotal facts documents
 * Format: Clear, decision-ready, 1-2 pages maximum
 */
class PivotalFactsGenerator {
  /**
   * Generate pivotal facts document from RFP extraction
   *
   * @param {Object} extraction - Complete RFP extraction data
   * @param {Object} pricingResults - Optional pricing results from calculator
   * @returns {string} Markdown-formatted pivotal facts document
   */
  generatePivotalFacts(extraction, pricingResults = null) {
    const sections = [];

    // Header
    sections.push(this._generateHeader(extraction));

    // Customer Profile
    sections.push(this._generateCustomerProfile(extraction));

    // Scope Summary
    sections.push(this._generateScopeSummary(extraction, pricingResults));

    // Critical Requirements
    sections.push(this._generateCriticalRequirements(extraction));

    // Pricing Structure
    sections.push(this._generatePricingStructure(extraction));

    // Bid/No-Bid Factors
    sections.push(this._generateBidNoB idFactors(extraction, pricingResults));

    // Financial Analysis
    if (pricingResults) {
      sections.push(this._generateFinancialAnalysis(pricingResults));
    }

    // Go/No-Go Recommendation
    sections.push(this._generateRecommendation(extraction, pricingResults));

    // Next Steps
    sections.push(this._generateNextSteps(extraction));

    return sections.join('\n\n---\n\n');
  }

  /**
   * Generate header
   * @private
   */
  _generateHeader(extraction) {
    const rfpNumber = extraction.rfpMetadata?.rfpNumber || 'Unknown';
    const title = extraction.rfpMetadata?.title || 'Unknown';
    const generatedDate = new Date().toISOString().split('T')[0];

    return `# RFP PIVOTAL FACTS DECLARATION
## ${extraction.customer?.name || 'Unknown Customer'} - ${title}

Generated: ${generatedDate} | RFP: ${rfpNumber}`;
  }

  /**
   * Generate customer profile section
   * @private
   */
  _generateCustomerProfile(extraction) {
    const customer = extraction.customer || {};

    const lines = [
      '## CUSTOMER PROFILE',
      `- **Entity**: ${customer.name || 'Unknown'}`,
      `- **Address**: ${this._formatAddress(customer)}`,
      `- **Contact**: ${customer.contactPerson || 'Unknown'}${customer.contactTitle ? `, ${customer.contactTitle}` : ''}`
    ];

    if (customer.contactPhone) {
      lines.push(`  - Phone: ${customer.contactPhone}`);
    }
    if (customer.contactEmail) {
      lines.push(`  - Email: ${customer.contactEmail}`);
    }

    lines.push(`- **Facility Type**: ${customer.facilityType || 'Unknown'}`);
    lines.push(`- **Tax Status**: ${customer.taxExempt ? 'EXEMPT' : 'TAXABLE'}`);

    return lines.join('\n');
  }

  /**
   * Generate scope summary section
   * @private
   */
  _generateScopeSummary(extraction, pricingResults) {
    const generators = extraction.generators || [];
    const services = extraction.serviceRequirements?.mapped || [];
    const contractLength = extraction.rfpMetadata?.contractLength || 24;
    const optionYears = extraction.rfpMetadata?.optionYears || [];

    const lines = [
      '## SCOPE SUMMARY',
      `- **Equipment**: ${generators.length} generators${this._summarizeGeneratorKW(generators)}`,
      `- **Services**: ${services.join(', ')}${this._describeServiceFrequencies(extraction)}`,
      `- **Contract**: ${Math.floor(contractLength / 12)} years base${optionYears.length > 0 ? ` + ${optionYears.length} option years` : ''}`
    ];

    if (pricingResults) {
      const totalAnnual = this._calculateTotalAnnual(pricingResults);
      lines.push(`- **Estimated Value**: $${totalAnnual.toLocaleString()} annually`);
    }

    return lines.join('\n');
  }

  /**
   * Generate critical requirements section
   * @private
   */
  _generateCriticalRequirements(extraction) {
    const compliance = extraction.complianceRequirements || {};
    const lines = ['## CRITICAL REQUIREMENTS'];

    // Prevailing Wage
    if (compliance.prevailingWage?.required) {
      lines.push('');
      lines.push('### ⚠️ PREVAILING WAGE - MANDATORY');
      lines.push(`- **Classification**: ${compliance.prevailingWage.classification || 'Electrician - Journeyman'}`);
      if (compliance.prevailingWage.county) {
        lines.push(`- **County**: ${compliance.prevailingWage.county}`);
      }
      lines.push('- **DIR Registration**: REQUIRED before bid submission');
      lines.push('- **Certified Payroll**: Required for all labor');
      lines.push('- **Impact**: Labor costs increase ~34% vs. standard rate');
    }

    // Insurance
    if (compliance.insurance) {
      lines.push('');
      lines.push('### Insurance Requirements');
      if (compliance.insurance.generalLiability) {
        lines.push(`- **General Liability**: ${compliance.insurance.generalLiability}`);
      }
      if (compliance.insurance.auto) {
        lines.push(`- **Auto**: ${compliance.insurance.auto}`);
      }
      if (compliance.insurance.workersComp) {
        lines.push(`- **Workers Comp**: ${compliance.insurance.workersComp}`);
      }
      if (compliance.insurance.additionalInsured) {
        lines.push(`- **Additional Insured**: ${compliance.insurance.additionalInsured}`);
      }
    }

    // Bonds
    if (compliance.bonds) {
      const bondTypes = [];
      if (compliance.bonds.bid) bondTypes.push('Bid');
      if (compliance.bonds.performance) bondTypes.push('Performance');
      if (compliance.bonds.payment) bondTypes.push('Payment');

      if (bondTypes.length > 0) {
        lines.push('');
        lines.push('### Bond Requirements');
        lines.push(`- **Required**: ${bondTypes.join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate pricing structure section
   * @private
   */
  _generatePricingStructure(extraction) {
    const pricing = extraction.pricingStructure || {};

    return `## PRICING STRUCTURE
- **Type**: ${pricing.type || 'Fixed annual price per generator'}
- **Billing**: ${pricing.billingFrequency || 'Monthly invoices'}
- **Terms**: ${pricing.paymentTerms || 'Net 30'}
- **Escalation**: ${pricing.escalation?.allowed ? `Option years may escalate up to ${pricing.escalation.maxAnnual}% annually` : 'Not specified'}`;
  }

  /**
   * Generate bid/no-bid factors
   * @private
   */
  _generateBidNoB idFactors(extraction, pricingResults) {
    const lines = ['## BID/NO-BID FACTORS'];

    // Favorable factors
    lines.push('');
    lines.push('### ✅ FAVORABLE');
    const favorable = this._identifyFavorableFactors(extraction, pricingResults);
    favorable.forEach(factor => lines.push(`- ${factor}`));

    // Challenges
    lines.push('');
    lines.push('### ⚠️ CHALLENGES');
    const challenges = this._identifyChallenges(extraction);
    challenges.forEach(challenge => lines.push(`- ${challenge}`));

    return lines.join('\n');
  }

  /**
   * Generate financial analysis
   * @private
   */
  _generateFinancialAnalysis(pricingResults) {
    const totalAnnual = this._calculateTotalAnnual(pricingResults);
    const laborTotal = this._sumField(pricingResults, 'laborTotal');
    const partsTotal = this._sumField(pricingResults, 'partsTotal');
    const mobilizationTotal = this._sumField(pricingResults, 'mobilizationTotal');

    const estimatedMargin = 0.15; // 15% target
    const profit = totalAnnual * estimatedMargin;

    return `## FINANCIAL ANALYSIS

### Estimated Pricing
- **Labor Component**: ~$${laborTotal.toLocaleString()} annually
- **Parts Component**: ~$${partsTotal.toLocaleString()} annually
- **Mobilization**: ~$${mobilizationTotal.toLocaleString()} annually
- **TOTAL ESTIMATE**: ~$${totalAnnual.toLocaleString()} annually

### Margin Analysis
- **Target Margin**: 15-18%
- **Estimated Profit**: $${profit.toLocaleString()} annually`;
  }

  /**
   * Generate recommendation
   * @private
   */
  _generateRecommendation(extraction, pricingResults) {
    const score = this._calculateGoNoGoScore(extraction, pricingResults);
    const decision = this._determineDecision(score);
    const conditions = this._identifyConditions(extraction);

    const lines = [
      '## GO/NO-GO RECOMMENDATION',
      '',
      `### ${decision.toUpperCase()}`,
      `**Score**: ${score.toFixed(1)}/10`
    ];

    if (conditions.length > 0) {
      lines.push('');
      lines.push('**Proceed IF**:');
      conditions.forEach((condition, idx) => {
        lines.push(`${idx + 1}. ${condition}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate next steps
   * @private
   */
  _generateNextSteps(extraction) {
    const steps = [
      '## NEXT STEPS',
      '1. ✅ Calculate exact pricing via Energen Calculator v5.0'
    ];

    // Add conditional steps based on requirements
    if (extraction.complianceRequirements?.prevailingWage?.required) {
      steps.push('2. ⏳ Obtain DIR registration ($300 + 21 days)');
      steps.push('3. ⏳ Implement certified payroll system ($150/mo)');
    }

    steps.push('4. ⏳ Contact insurance broker for coverage confirmation');
    steps.push('5. ⏳ Draft compliance narrative and submission package');

    return steps.join('\n');
  }

  /**
   * Helper methods
   * @private
   */

  _formatAddress(customer) {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.city) parts.push(customer.city);
    if (customer.state) parts.push(customer.state);
    if (customer.zip) parts.push(customer.zip);
    return parts.join(', ') || 'Unknown';
  }

  _summarizeGeneratorKW(generators) {
    if (generators.length === 0) return '';

    const kwRatings = generators
      .map(g => g.kwRating)
      .filter(kw => kw)
      .sort((a, b) => a - b);

    if (kwRatings.length === 0) return '';

    const min = kwRatings[0];
    const max = kwRatings[kwRatings.length - 1];

    return ` (${min}kW - ${max}kW range)`;
  }

  _describeServiceFrequencies(extraction) {
    const services = extraction.serviceRequirements?.mapped || [];
    const frequencies = extraction.serviceRequirements?.frequencies || {};

    const quarterlyServices = services.filter(s => frequencies[s] === 4);
    const annualServices = services.filter(s => frequencies[s] === 1);

    const desc = [];
    if (quarterlyServices.length > 0) desc.push(`${quarterlyServices.join(', ')} Quarterly`);
    if (annualServices.length > 0) desc.push(`${annualServices.join(', ')} Annual`);

    return desc.length > 0 ? ` (${desc.join(', ')})` : '';
  }

  _calculateTotalAnnual(pricingResults) {
    if (!Array.isArray(pricingResults)) return 0;

    return pricingResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.calculation?.totalAnnualPrice || 0), 0);
  }

  _sumField(pricingResults, field) {
    if (!Array.isArray(pricingResults)) return 0;

    return pricingResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.calculation?.[field] || 0), 0);
  }

  _identifyFavorableFactors(extraction, pricingResults) {
    const factors = [];

    // Standard generators
    const generators = extraction.generators || [];
    const uniqueMakes = [...new Set(generators.map(g => g.manufacturer).filter(Boolean))];
    if (uniqueMakes.length <= 3) {
      factors.push(`Equipment is standard (${uniqueMakes.join(', ')})`);
    }

    // Tax exempt
    if (extraction.customer?.taxExempt) {
      factors.push('Tax-exempt (simplifies billing)');
    }

    // Long-term contract
    const contractLength = extraction.rfpMetadata?.contractLength || 0;
    const optionYears = extraction.rfpMetadata?.optionYears || [];
    if (contractLength >= 24 || optionYears.length > 0) {
      factors.push(`${Math.floor(contractLength / 12)}+ year potential (stable revenue)`);
    }

    // Government contract
    if (extraction.customer?.facilityType === 'government') {
      factors.push('Government contract (reliable payment)');
    }

    if (factors.length === 0) {
      factors.push('Standard service requirements');
    }

    return factors;
  }

  _identifyChallenges(extraction) {
    const challenges = [];

    // Prevailing wage
    if (extraction.complianceRequirements?.prevailingWage?.required) {
      challenges.push('Prevailing wage compliance (first-time requirement)');
      challenges.push('DIR registration needed (30 days + $300)');
      challenges.push('Certified payroll system required (~$5K setup)');
    }

    // High insurance limits
    const insurance = extraction.complianceRequirements?.insurance;
    if (insurance?.generalLiability?.includes('2,000,000') ||
        insurance?.generalLiability?.includes('2M')) {
      challenges.push('Insurance limits at top of current coverage');
    }

    // Bonds required
    const bonds = extraction.complianceRequirements?.bonds;
    if (bonds?.performance || bonds?.payment) {
      challenges.push('Performance/payment bonds required');
    }

    if (challenges.length === 0) {
      challenges.push('Standard requirements, no major challenges identified');
    }

    return challenges;
  }

  _calculateGoNoGoScore(extraction, pricingResults) {
    let score = 5.0; // Baseline

    // Positive factors
    if (extraction.customer?.taxExempt) score += 0.5;
    if (extraction.customer?.facilityType === 'government') score += 1.0;
    if ((extraction.generators || []).length <= 40) score += 0.5;

    // Negative factors
    if (extraction.complianceRequirements?.prevailingWage?.required) score -= 1.5;
    if (extraction.complianceRequirements?.bonds?.performance) score -= 0.5;

    // Pricing available
    if (pricingResults) {
      const totalAnnual = this._calculateTotalAnnual(pricingResults);
      if (totalAnnual > 100000) score += 1.0;
      if (totalAnnual > 500000) score += 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  _determineDecision(score) {
    if (score >= 7.0) return 'GO';
    if (score >= 5.0) return 'CONDITIONAL GO';
    if (score >= 3.0) return 'REVIEW REQUIRED';
    return 'NO-GO';
  }

  _identifyConditions(extraction) {
    const conditions = [];

    if (extraction.complianceRequirements?.prevailingWage?.required) {
      conditions.push('DIR registration obtained (start immediately)');
      conditions.push('Certified payroll system implemented');
    }

    const insurance = extraction.complianceRequirements?.insurance;
    if (insurance?.generalLiability?.includes('2,000,000')) {
      conditions.push('Insurance limits confirmed with carrier');
    }

    if (extraction.complianceRequirements?.bonds?.performance) {
      conditions.push('Bonding capacity confirmed with surety');
    }

    return conditions;
  }
}

module.exports = { PivotalFactsGenerator };
