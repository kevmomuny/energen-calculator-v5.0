/**
 * assess-risks.cjs - Risk Assessment Engine
 *
 * Analyzes RFP extraction data and calculates multi-dimensional risk scores
 *
 * Risk Dimensions:
 * - Financial: bonds, payment terms, retainage, contract value
 * - Operational: distance, generator count, timeline, resources
 * - Compliance: prevailing wage, certifications, insurance
 * - Competitive: evaluation criteria, incumbents
 * - Technical: generator types, service complexity
 *
 * Scoring: 1-10 scale per dimension, weighted overall score
 *
 * Usage:
 *   const assessRisks = require('./assess-risks.cjs');
 *   const assessment = await assessRisks(extractionData, equipmentData);
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Load risk matrix
const RISK_MATRIX_PATH = path.join(__dirname, '../resources/risk-matrix.json');
let RISK_MATRIX = null;

try {
  RISK_MATRIX = JSON.parse(fs.readFileSync(RISK_MATRIX_PATH, 'utf8'));
} catch (error) {
  throw new Error(`Failed to load risk-matrix.json: ${error.message}`);
}

/**
 * Main risk assessment function
 */
async function assessRisks(extraction, equipmentData = null) {
  console.log('   Calculating risk scores...');

  const scores = {
    financial: calculateFinancialRisk(extraction),
    operational: calculateOperationalRisk(extraction, equipmentData),
    compliance: calculateComplianceRisk(extraction),
    competitive: calculateCompetitiveRisk(extraction),
    technical: calculateTechnicalRisk(extraction, equipmentData)
  };

  // Calculate weighted overall score
  const weights = RISK_MATRIX.weights;
  const overallScore =
    scores.financial.score * weights.financial +
    scores.operational.score * weights.operational +
    scores.compliance.score * weights.compliance +
    scores.competitive.score * weights.competitive +
    scores.technical.score * weights.technical;

  // Determine risk level
  const riskLevel = determineRiskLevel(overallScore);

  // Generate recommendations
  const recommendations = generateRecommendations(scores, overallScore);

  return {
    overallScore: parseFloat(overallScore.toFixed(2)),
    riskLevel: riskLevel.label,
    riskColor: riskLevel.color,
    recommendation: riskLevel.recommendation,
    dimensions: scores,
    recommendations,
    timestamp: new Date().toISOString()
  };
}

/**
 * Financial Risk Assessment
 */
function calculateFinancialRisk(extraction) {
  const matrix = RISK_MATRIX.financial;
  let score = 0;
  let factors = [];

  // Bond requirements
  const bonds = extraction.bondRequirements || {};
  let bondScore = matrix.bondRequirements.scores.none;

  if (bonds.bidBond?.required && bonds.performanceBond?.required && bonds.paymentBond?.required) {
    bondScore = matrix.bondRequirements.scores.allThreeBonds;
    factors.push({ factor: 'All three bonds required', score: bondScore });
  } else if (bonds.bidBond?.required && bonds.performanceBond?.required) {
    bondScore = matrix.bondRequirements.scores.bidAndPerformance;
    factors.push({ factor: 'Bid and performance bonds', score: bondScore });
  } else if (bonds.bidBond?.required) {
    bondScore = matrix.bondRequirements.scores.bidOnly;
    factors.push({ factor: 'Bid bond only', score: bondScore });
  } else {
    factors.push({ factor: 'No bonds required', score: bondScore });
  }

  // Payment terms
  const paymentTerms = extraction.paymentTerms?.paymentNet || '';
  let paymentScore = matrix.paymentTerms.scores.net30;

  if (paymentTerms.includes('90')) {
    paymentScore = matrix.paymentTerms.scores.net90OrWorse;
  } else if (paymentTerms.includes('60')) {
    paymentScore = matrix.paymentTerms.scores.net60;
  } else if (paymentTerms.includes('45')) {
    paymentScore = matrix.paymentTerms.scores.net45;
  } else if (paymentTerms.includes('30')) {
    paymentScore = matrix.paymentTerms.scores.net30;
  } else if (paymentTerms.includes('15')) {
    paymentScore = matrix.paymentTerms.scores.net15;
  }

  factors.push({ factor: `Payment terms: ${paymentTerms || 'Not specified'}`, score: paymentScore });

  // Retainage
  const retainage = parseFloat(extraction.paymentTerms?.retainage || 0);
  let retainageScore = matrix.retainage.scores.none;

  if (retainage >= 15) {
    retainageScore = matrix.retainage.scores['15percentOrMore'];
  } else if (retainage >= 10) {
    retainageScore = matrix.retainage.scores['10percent'];
  } else if (retainage >= 5) {
    retainageScore = matrix.retainage.scores['5percent'];
  }

  factors.push({ factor: `Retainage: ${retainage}%`, score: retainageScore });

  // Average the financial factors
  score = (bondScore + paymentScore + retainageScore) / 3;

  return {
    score: parseFloat(score.toFixed(2)),
    factors,
    impact: score > 7 ? 'High cash flow impact' : score > 5 ? 'Moderate impact' : 'Manageable'
  };
}

/**
 * Operational Risk Assessment
 */
function calculateOperationalRisk(extraction, equipmentData) {
  const matrix = RISK_MATRIX.operational;
  let factors = [];

  // Generator count
  let generatorCount = 0;
  if (equipmentData?.generators) {
    generatorCount = equipmentData.generators.length;
  } else {
    // Infer from services or description
    const desc = extraction.projectDetails?.description || '';
    const match = desc.match(/(\d+)\s*(generator|unit|facility)/i);
    if (match) generatorCount = parseInt(match[1]);
  }

  let countScore = matrix.generatorCount.scores['1-10'];
  if (generatorCount > 80) countScore = matrix.generatorCount.scores['80plus'];
  else if (generatorCount > 60) countScore = matrix.generatorCount.scores['61-80'];
  else if (generatorCount > 40) countScore = matrix.generatorCount.scores['41-60'];
  else if (generatorCount > 20) countScore = matrix.generatorCount.scores['21-40'];
  else if (generatorCount > 10) countScore = matrix.generatorCount.scores['11-20'];

  factors.push({ factor: `${generatorCount} generators to service`, score: countScore });

  // Timeline to contract start
  const startDate = extraction.schedule?.contractStartDate;
  let timelineScore = matrix.timeline.scores['90plus'];

  if (startDate) {
    const daysUntil = Math.ceil((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 15) timelineScore = matrix.timeline.scores['0-14'];
    else if (daysUntil < 30) timelineScore = matrix.timeline.scores['15-29'];
    else if (daysUntil < 60) timelineScore = matrix.timeline.scores['30-59'];
    else if (daysUntil < 90) timelineScore = matrix.timeline.scores['60-89'];

    factors.push({ factor: `${daysUntil} days until start`, score: timelineScore });
  } else {
    factors.push({ factor: 'Start date not specified', score: 5 });
    timelineScore = 5;
  }

  // Resource availability (default to moderate)
  const resourceScore = matrix.resourceAvailability.scores.mostlyAvailable;
  factors.push({ factor: 'Resource availability (estimated)', score: resourceScore });

  const score = (countScore + timelineScore + resourceScore) / 3;

  return {
    score: parseFloat(score.toFixed(2)),
    factors,
    impact: score > 7 ? 'High operational complexity' : score > 5 ? 'Moderate complexity' : 'Manageable'
  };
}

/**
 * Compliance Risk Assessment
 */
function calculateComplianceRisk(extraction) {
  const matrix = RISK_MATRIX.compliance;
  let factors = [];

  // Prevailing wage
  const hasPrevailingWage = extraction.stipulations?.some(s =>
    s.type === 'prevailing_wage' || s.details?.toLowerCase().includes('prevailing wage')
  ) || false;

  const pwScore = hasPrevailingWage
    ? matrix.prevailingWage.scores.required
    : matrix.prevailingWage.scores.notRequired;

  factors.push({
    factor: hasPrevailingWage ? 'Prevailing wage required' : 'No prevailing wage',
    score: pwScore
  });

  // Insurance requirements
  const insurance = extraction.insuranceRequirements || [];
  let maxCoverage = 0;

  insurance.forEach(ins => {
    const coverage = ins.coverage || '';
    const match = coverage.match(/\$?([\d,]+)/);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      maxCoverage = Math.max(maxCoverage, amount);
    }
  });

  let insuranceScore = matrix.insurance.scores.standard;
  if (maxCoverage >= matrix.insurance.thresholds.veryHigh) {
    insuranceScore = matrix.insurance.scores.veryHigh;
  } else if (maxCoverage >= matrix.insurance.thresholds.high) {
    insuranceScore = matrix.insurance.scores.high;
  } else if (maxCoverage >= matrix.insurance.thresholds.elevated) {
    insuranceScore = matrix.insurance.scores.elevated;
  }

  factors.push({ factor: `Insurance coverage: $${maxCoverage.toLocaleString()}`, score: insuranceScore });

  // Certifications
  const certScore = matrix.certifications.scores.standardOnly;
  factors.push({ factor: 'Standard certifications', score: certScore });

  const score = (pwScore + insuranceScore + certScore) / 3;

  return {
    score: parseFloat(score.toFixed(2)),
    factors,
    impact: score > 7 ? 'High compliance burden' : score > 5 ? 'Moderate requirements' : 'Standard compliance'
  };
}

/**
 * Competitive Risk Assessment
 */
function calculateCompetitiveRisk(extraction) {
  const matrix = RISK_MATRIX.competitive;
  let factors = [];

  // Evaluation criteria (default to balanced)
  const evalScore = matrix.evaluationCriteria.scores.balanced;
  factors.push({ factor: 'Balanced evaluation criteria (estimated)', score: evalScore });

  // Relationship (default to new customer)
  const relationshipScore = matrix.relationship.scores.newCustomer;
  factors.push({ factor: 'New customer relationship', score: relationshipScore });

  // Bidder count (default to moderate)
  const bidderScore = matrix.bidderCount.scores.moderate;
  factors.push({ factor: 'Moderate competition expected', score: bidderScore });

  const score = (evalScore + relationshipScore + bidderScore) / 3;

  return {
    score: parseFloat(score.toFixed(2)),
    factors,
    impact: score > 7 ? 'Highly competitive' : score > 5 ? 'Moderately competitive' : 'Good positioning'
  };
}

/**
 * Technical Risk Assessment
 */
function calculateTechnicalRisk(extraction, equipmentData) {
  const matrix = RISK_MATRIX.technical;
  let factors = [];

  // Generator types complexity
  let typeScore = matrix.generatorTypes.scores.standardModels;

  if (equipmentData?.generators) {
    const makes = new Set(equipmentData.generators.map(g => g.make));
    if (makes.size > 5) {
      typeScore = matrix.generatorTypes.scores.manySpecialized;
    } else if (makes.size > 3) {
      typeScore = matrix.generatorTypes.scores.someSpecialized;
    }
  }

  factors.push({ factor: 'Generator model diversity', score: typeScore });

  // Service complexity (based on service types)
  const services = extraction.services || [];
  const hasComplexServices = services.some(s =>
    s.description?.toLowerCase().includes('load bank') ||
    s.description?.toLowerCase().includes('electrical')
  );

  const serviceScore = hasComplexServices
    ? matrix.serviceComplexity.scores.someSpecialized
    : matrix.serviceComplexity.scores.mostlyRoutine;

  factors.push({ factor: hasComplexServices ? 'Some specialized services' : 'Routine services', score: serviceScore });

  // Parts availability (default to common)
  const partsScore = matrix.partsAvailability.scores.mostlyCommon;
  factors.push({ factor: 'Standard parts availability', score: partsScore });

  const score = (typeScore + serviceScore + partsScore) / 3;

  return {
    score: parseFloat(score.toFixed(2)),
    factors,
    impact: score > 7 ? 'High technical demands' : score > 5 ? 'Moderate complexity' : 'Standard work'
  };
}

/**
 * Determine risk level from overall score
 */
function determineRiskLevel(score) {
  const thresholds = RISK_MATRIX.overallThresholds;

  if (score <= thresholds.green.max) return thresholds.green;
  if (score <= thresholds.yellow.max) return thresholds.yellow;
  if (score <= thresholds.orange.max) return thresholds.orange;
  return thresholds.red;
}

/**
 * Generate mitigation recommendations
 */
function generateRecommendations(scores, overallScore) {
  const recommendations = [];
  const strategies = RISK_MATRIX.mitigationStrategies;

  // Add recommendations for high-risk dimensions
  if (scores.financial.score > 6) {
    recommendations.push(...strategies.financial.slice(0, 3));
  }

  if (scores.operational.score > 6) {
    recommendations.push(...strategies.operational.slice(0, 3));
  }

  if (scores.compliance.score > 6) {
    recommendations.push(...strategies.compliance.slice(0, 3));
  }

  if (scores.competitive.score > 6) {
    recommendations.push(...strategies.competitive.slice(0, 2));
  }

  if (scores.technical.score > 6) {
    recommendations.push(...strategies.technical.slice(0, 2));
  }

  // Add general recommendations based on overall score
  if (overallScore > 7) {
    recommendations.unshift('Executive review and approval required before bidding');
    recommendations.push('Consider forming partnership to share risk');
  } else if (overallScore > 5) {
    recommendations.unshift('Develop comprehensive mitigation plan');
    recommendations.push('Schedule risk review meeting with stakeholders');
  }

  return recommendations;
}

// CLI execution
if (require.main === module) {
  const extractionPath = process.argv[2];

  if (!extractionPath) {
    console.error('Usage: node assess-risks.cjs <extraction.json> [equipment.json]');
    process.exit(1);
  }

  const extraction = JSON.parse(fs.readFileSync(extractionPath, 'utf8'));
  const equipmentPath = process.argv[3];
  const equipmentData = equipmentPath ? JSON.parse(fs.readFileSync(equipmentPath, 'utf8')) : null;

  assessRisks(extraction, equipmentData)
    .then(assessment => {
      console.log('\n📊 Risk Assessment Results:\n');
      console.log(JSON.stringify(assessment, null, 2));

      const outputPath = path.join(path.dirname(extractionPath), 'risk-assessment.json');
      fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2), 'utf8');
      console.log(`\n✅ Saved to: ${outputPath}`);

      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = assessRisks;
