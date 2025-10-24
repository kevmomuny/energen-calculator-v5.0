/**
 * create-compliance-checklist.cjs - Compliance Checklist Generator
 *
 * Generates a comprehensive Markdown checklist of all RFP compliance requirements
 *
 * Sections:
 * - Required Forms (checkboxes)
 * - Certifications & Licenses
 * - Insurance Requirements (table)
 * - Bond Requirements
 * - Special Requirements (prevailing wage, DIR, etc.)
 * - Submission Instructions
 *
 * Usage:
 *   const createChecklist = require('./create-compliance-checklist.cjs');
 *   const markdown = await createChecklist(extraction);
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate compliance checklist
 */
async function createComplianceChecklist(extraction) {
  console.log('   Creating compliance checklist...');

  let markdown = '';

  // Header
  markdown += `# COMPLIANCE CHECKLIST\n\n`;
  markdown += `**${extraction.projectDetails?.projectTitle || 'RFP'}**\n\n`;
  markdown += `**Bid Number:** ${extraction.projectDetails?.bidNumber || 'N/A'}\n\n`;
  markdown += `**Due Date:** ${formatDate(extraction.schedule?.bidDueDate)}\n\n`;
  markdown += `---\n\n`;

  // 1. Required Documents Section
  markdown += `## 📄 Required Documents\n\n`;

  const requiredDocs = extraction.requiredDocuments || [];
  const requiredOnly = requiredDocs.filter(doc => doc.required !== false);

  if (requiredOnly.length > 0) {
    // Group by type
    const docsByType = groupByType(requiredOnly);

    Object.entries(docsByType).forEach(([type, docs]) => {
      markdown += `### ${capitalizeType(type)}\n\n`;

      docs.forEach(doc => {
        markdown += `- [ ] **${doc.name}**\n`;
        if (doc.description) {
          markdown += `      - ${doc.description}\n`;
        }
        if (doc.pages) {
          markdown += `      - *Location: Page ${doc.pages}*\n`;
        }
        if (doc.fillable) {
          markdown += `      - ⚠️  *Requires completion and signature*\n`;
        }
      });

      markdown += `\n`;
    });
  } else {
    markdown += `*No specific documents listed in RFP*\n\n`;
  }

  // 2. Certifications & Licenses
  markdown += `## 🎓 Certifications & Licenses\n\n`;

  const certStipulations = extraction.stipulations?.filter(s =>
    s.type === 'certification' || s.type === 'license' || s.details?.toLowerCase().includes('license')
  ) || [];

  if (certStipulations.length > 0) {
    certStipulations.forEach(cert => {
      markdown += `- [ ] ${cert.details}\n`;
      if (cert.impact) {
        markdown += `      - *Impact:* ${cert.impact}\n`;
      }
    });
    markdown += `\n`;
  } else {
    markdown += `- [ ] Valid contractor's license\n`;
    markdown += `- [ ] Business license for jurisdiction\n`;
    markdown += `- [ ] Technician certifications (as applicable)\n\n`;
  }

  // 3. Insurance Requirements
  markdown += `## 🛡️ Insurance Requirements\n\n`;

  const insurance = extraction.insuranceRequirements || [];

  if (insurance.length > 0) {
    markdown += `| Insurance Type | Minimum Coverage | Status |\n`;
    markdown += `|----------------|------------------|--------|\n`;

    insurance.forEach(ins => {
      const coverage = ins.coverage || 'As specified';
      markdown += `| ${ins.type} | ${coverage} | ☐ |\n`;
    });

    markdown += `\n`;
    markdown += `**Action Items:**\n\n`;
    markdown += `- [ ] Review current insurance policies\n`;
    markdown += `- [ ] Request certificate updates if coverage insufficient\n`;
    markdown += `- [ ] Obtain Additional Insured endorsement naming agency\n`;
    markdown += `- [ ] Ensure certificates are current (within 30 days of submission)\n\n`;

  } else {
    markdown += `*No specific insurance requirements listed*\n\n`;
    markdown += `- [ ] Verify standard insurance requirements with agency\n`;
    markdown += `- [ ] Prepare standard certificates of insurance\n\n`;
  }

  // 4. Bond Requirements
  markdown += `## 💎 Bond Requirements\n\n`;

  const bonds = extraction.bondRequirements || {};
  let bondCount = 0;

  if (bonds.bidBond?.required) {
    bondCount++;
    const amount = bonds.bidBond.amount || `${bonds.bidBond.percentage || 10}% of bid`;
    markdown += `- [ ] **Bid Bond**\n`;
    markdown += `      - Amount: ${amount}\n`;
    markdown += `      - Must accompany proposal submission\n\n`;
  }

  if (bonds.performanceBond?.required) {
    bondCount++;
    const amount = bonds.performanceBond.amount || `${bonds.performanceBond.percentage || 100}% of contract`;
    markdown += `- [ ] **Performance Bond**\n`;
    markdown += `      - Amount: ${amount}\n`;
    markdown += `      - Required upon contract award\n\n`;
  }

  if (bonds.paymentBond?.required) {
    bondCount++;
    const amount = bonds.paymentBond.amount || `${bonds.paymentBond.percentage || 100}% of contract`;
    markdown += `- [ ] **Payment Bond**\n`;
    markdown += `      - Amount: ${amount}\n`;
    markdown += `      - Required upon contract award\n\n`;
  }

  if (bondCount === 0) {
    markdown += `*No bonds required* ✅\n\n`;
  } else {
    markdown += `**Action Items:**\n\n`;
    markdown += `- [ ] Contact bonding company for availability and rates\n`;
    markdown += `- [ ] Verify bonding capacity sufficient for this contract\n`;
    markdown += `- [ ] Factor bonding costs into bid pricing\n`;
    markdown += `- [ ] Allow 3-5 business days for bond processing\n\n`;
  }

  // 5. Special Requirements
  markdown += `## ⚠️  Special Requirements\n\n`;

  let specialCount = 0;

  // Prevailing Wage
  const hasPrevWage = extraction.stipulations?.some(s =>
    s.type === 'prevailing_wage' || s.details?.toLowerCase().includes('prevailing wage')
  ) || false;

  if (hasPrevWage) {
    specialCount++;
    markdown += `### Prevailing Wage Requirements\n\n`;
    markdown += `- [ ] Register with Department of Industrial Relations (DIR)\n`;
    markdown += `- [ ] Obtain DIR registration number\n`;
    markdown += `- [ ] Prepare certified payroll process\n`;
    markdown += `- [ ] Factor prevailing wage rates into labor costs (typically 30-50% increase)\n`;
    markdown += `- [ ] Designate compliance officer for certified payroll\n\n`;
  }

  // Environmental/Safety
  const envStips = extraction.stipulations?.filter(s =>
    s.type === 'environmental' || s.type === 'safety'
  ) || [];

  if (envStips.length > 0) {
    specialCount++;
    markdown += `### Environmental & Safety Compliance\n\n`;
    envStips.forEach(stip => {
      markdown += `- [ ] ${stip.details}\n`;
    });
    markdown += `\n`;
  }

  // Timing requirements
  const timingStips = extraction.stipulations?.filter(s =>
    s.type === 'timing' || s.type === 'schedule'
  ) || [];

  if (timingStips.length > 0) {
    specialCount++;
    markdown += `### Schedule & Timing Requirements\n\n`;
    timingStips.forEach(stip => {
      markdown += `- [ ] ${stip.details}\n`;
    });
    markdown += `\n`;
  }

  // Other stipulations
  const otherStips = extraction.stipulations?.filter(s =>
    !['prevailing_wage', 'environmental', 'safety', 'timing', 'schedule', 'certification', 'license'].includes(s.type)
  ) || [];

  if (otherStips.length > 0) {
    specialCount++;
    markdown += `### Other Requirements\n\n`;
    otherStips.forEach(stip => {
      markdown += `- [ ] ${stip.details || capitalizeType(stip.type)}\n`;
    });
    markdown += `\n`;
  }

  if (specialCount === 0) {
    markdown += `*No special requirements identified*\n\n`;
  }

  // 6. Submission Instructions
  markdown += `## 📮 Submission Instructions\n\n`;

  const contact = extraction.contactInformation?.primaryContact;
  const agency = extraction.contactInformation?.agency;

  markdown += `**Due Date:** ${formatDate(extraction.schedule?.bidDueDate)}\n\n`;

  if (contact) {
    markdown += `**Submit To:**\n\n`;
    if (contact.name) markdown += `- Name: ${contact.name}\n`;
    if (contact.title) markdown += `- Title: ${contact.title}\n`;
    if (contact.email) markdown += `- Email: ${contact.email}\n`;
    if (contact.phone) markdown += `- Phone: ${contact.phone}\n`;
    markdown += `\n`;
  }

  if (agency) {
    markdown += `**Agency:**\n\n`;
    markdown += `${agency.name || ''}\n`;
    if (agency.department) markdown += `${agency.department}\n`;
    if (agency.address) markdown += `${agency.address}\n`;
    if (agency.city && agency.state) markdown += `${agency.city}, ${agency.state} ${agency.zip || ''}\n`;
    markdown += `\n`;
  }

  markdown += `**Pre-Submission Checklist:**\n\n`;
  markdown += `- [ ] All required forms completed and signed\n`;
  markdown += `- [ ] Insurance certificates current and properly endorsed\n`;
  markdown += `- [ ] Bonds obtained and included (if required)\n`;
  markdown += `- [ ] All certifications and licenses included\n`;
  markdown += `- [ ] Technical proposal addresses all requirements\n`;
  markdown += `- [ ] Cost proposal complete and sealed (if required)\n`;
  markdown += `- [ ] Submission package organized per RFP instructions\n`;
  markdown += `- [ ] Copies made (original + required copies)\n`;
  markdown += `- [ ] Delivery method confirmed (mail/hand-delivery/electronic)\n`;
  markdown += `- [ ] Allow time for delivery before deadline\n\n`;

  // 7. Important Notes
  markdown += `## 📝 Important Notes\n\n`;

  const bidDueDate = extraction.schedule?.bidDueDate;
  if (bidDueDate) {
    const dueDate = new Date(bidDueDate);
    const today = new Date();
    const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 0) {
      markdown += `⏰ **${daysRemaining} days remaining until proposal due date**\n\n`;

      if (daysRemaining <= 7) {
        markdown += `⚠️  **URGENT:** Less than 1 week remaining!\n\n`;
      } else if (daysRemaining <= 14) {
        markdown += `⚠️  **ATTENTION:** Less than 2 weeks remaining\n\n`;
      }
    } else if (daysRemaining === 0) {
      markdown += `🚨 **DUE TODAY!**\n\n`;
    } else {
      markdown += `❌ **DEADLINE PASSED** (${Math.abs(daysRemaining)} days ago)\n\n`;
    }
  }

  // Contact for questions
  const altContacts = extraction.contactInformation?.alternateContacts || [];
  if (altContacts.length > 0) {
    markdown += `**Questions?** Contact:\n\n`;
    altContacts.slice(0, 2).forEach(contact => {
      markdown += `- ${contact.name}`;
      if (contact.title) markdown += ` (${contact.title})`;
      if (contact.email) markdown += ` - ${contact.email}`;
      if (contact.phone) markdown += ` - ${contact.phone}`;
      markdown += `\n`;
    });
    markdown += `\n`;
  }

  // Footer
  markdown += `---\n\n`;
  markdown += `*Checklist generated by Energen RFP Evaluator v1.0*\n\n`;
  markdown += `**Last Updated:** ${new Date().toLocaleString()}\n`;

  return markdown;
}

/**
 * Group documents by type
 */
function groupByType(documents) {
  const groups = {};

  documents.forEach(doc => {
    const type = doc.type || 'Other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(doc);
  });

  // Sort groups: forms, certificates, licenses, other
  const sortOrder = ['form', 'certificate', 'license', 'other'];
  const sorted = {};

  sortOrder.forEach(type => {
    if (groups[type]) {
      sorted[type] = groups[type];
    }
  });

  // Add any remaining types
  Object.keys(groups).forEach(type => {
    if (!sorted[type]) {
      sorted[type] = groups[type];
    }
  });

  return sorted;
}

/**
 * Format date string
 */
function formatDate(dateString) {
  if (!dateString) return 'Not specified';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Capitalize type string
 */
function capitalizeType(type) {
  if (!type) return 'Other';

  return type.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') + 's';
}

// CLI execution
if (require.main === module) {
  const extractionPath = process.argv[2];

  if (!extractionPath) {
    console.error('Usage: node create-compliance-checklist.cjs <extraction.json>');
    process.exit(1);
  }

  let extraction = null;

  try {
    const data = JSON.parse(fs.readFileSync(extractionPath, 'utf8'));

    // Handle different input formats
    if (data.extraction) {
      extraction = data.extraction;
    } else {
      extraction = data;
    }

  } catch (error) {
    console.error('❌ Error reading input file:', error.message);
    process.exit(1);
  }

  createComplianceChecklist(extraction)
    .then(markdown => {
      console.log('\n' + markdown);

      const outputPath = path.join(path.dirname(extractionPath), 'compliance-checklist.md');
      fs.writeFileSync(outputPath, markdown, 'utf8');
      console.log(`\n✅ Saved to: ${outputPath}`);

      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = createComplianceChecklist;
