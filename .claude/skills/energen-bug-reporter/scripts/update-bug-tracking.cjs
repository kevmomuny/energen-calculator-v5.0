#!/usr/bin/env node

/**
 * Update Bug Tracking Script
 *
 * Updates E2E_BUGS_TRACKING.json with bug fix status, reports, and metadata.
 *
 * Usage:
 *   node update-bug-tracking.js --bug-id E2E-002 --status FIXED --fix-report FIX_REPORT_F1.md
 *
 * Parameters:
 *   --bug-id       (required) Bug ID (e.g., "E2E-002")
 *   --status       (required) Status: IDENTIFIED, FIXED, VERIFIED
 *   --fix-report   (optional) Path to fix report markdown file
 *   --fix-summary  (optional) Brief description of fix
 *   --fixes-applied (optional) JSON array of fix descriptions
 *   --verification (optional) Verification notes
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
};

const bugId = getArg('--bug-id');
const status = getArg('--status');
const fixReport = getArg('--fix-report');
const fixSummary = getArg('--fix-summary');
const fixesApplied = getArg('--fixes-applied');
const verification = getArg('--verification');

// Validation
if (!bugId) {
  console.error('❌ Error: --bug-id is required');
  process.exit(1);
}

if (!status) {
  console.error('❌ Error: --status is required');
  process.exit(1);
}

const validStatuses = ['IDENTIFIED', 'FIXED', 'VERIFIED'];
if (!validStatuses.includes(status)) {
  console.error(`❌ Error: Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
  process.exit(1);
}

// Paths - E2E_BUGS_TRACKING.json is in project root
// From scripts/ → energen-bug-reporter/ → skills/ → .claude/ → project root (4 levels)
const projectRoot = path.resolve(__dirname, '../../../..');
const trackingFile = path.join(projectRoot, 'E2E_BUGS_TRACKING.json');

console.log(`\n🔧 Updating Bug Tracking for ${bugId}`);
console.log(`📁 File: ${trackingFile}`);
console.log(`📊 Status: ${status}`);

// Read existing tracking data
let trackingData;
try {
  const fileContent = fs.readFileSync(trackingFile, 'utf8');
  trackingData = JSON.parse(fileContent);
  console.log(`✅ Loaded tracking data (${trackingData.bugs.length} bugs)`);
} catch (error) {
  console.error(`❌ Error reading tracking file: ${error.message}`);
  process.exit(1);
}

// Find bug by ID
const bugIndex = trackingData.bugs.findIndex(bug => bug.id === bugId);

if (bugIndex === -1) {
  console.error(`❌ Error: Bug ${bugId} not found in tracking data`);
  console.log(`\nAvailable bugs:`);
  trackingData.bugs.forEach(bug => console.log(`  - ${bug.id}: ${bug.title}`));
  process.exit(1);
}

const bug = trackingData.bugs[bugIndex];

console.log(`\n📋 Found bug: ${bug.title}`);
console.log(`   Current status: ${bug.status}`);
console.log(`   Updating to: ${status}`);

// Update bug status
const previousStatus = bug.status;
bug.status = status;

// Add timestamps based on status
const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

if (status === 'FIXED' && !bug.fixed_date) {
  bug.fixed_date = now;
  console.log(`   ✅ Set fixed_date: ${now}`);
}

if (status === 'VERIFIED' && !bug.verified_date) {
  bug.verified_date = now;
  console.log(`   ✅ Set verified_date: ${now}`);
}

// Add fix report reference
if (fixReport) {
  bug.fix_report = fixReport;
  console.log(`   📄 Added fix_report: ${fixReport}`);
}

// Add fix summary
if (fixSummary) {
  bug.fix_summary = fixSummary;
  console.log(`   📝 Added fix_summary`);
}

// Add fixes applied (parse JSON array if provided)
if (fixesApplied) {
  try {
    bug.fixes_applied = JSON.parse(fixesApplied);
    console.log(`   🔧 Added ${bug.fixes_applied.length} fixes`);
  } catch (error) {
    console.warn(`   ⚠️  Warning: Could not parse fixes_applied JSON: ${error.message}`);
  }
}

// Add verification notes
if (verification) {
  bug.verification = verification;
  console.log(`   ✅ Added verification notes`);
}

// Update report metadata
trackingData.report_metadata = trackingData.report_metadata || {};
trackingData.report_metadata.last_updated = new Date().toISOString();

// Count bugs by status
const statusCounts = {
  IDENTIFIED: 0,
  FIXED: 0,
  VERIFIED: 0
};

trackingData.bugs.forEach(b => {
  if (statusCounts.hasOwnProperty(b.status)) {
    statusCounts[b.status]++;
  }
});

console.log(`\n📊 Updated Status Counts:`);
console.log(`   IDENTIFIED: ${statusCounts.IDENTIFIED}`);
console.log(`   FIXED: ${statusCounts.FIXED}`);
console.log(`   VERIFIED: ${statusCounts.VERIFIED}`);

// Write updated tracking data
try {
  const updatedJson = JSON.stringify(trackingData, null, 2);
  fs.writeFileSync(trackingFile, updatedJson, 'utf8');
  console.log(`\n✅ Successfully updated ${trackingFile}`);
} catch (error) {
  console.error(`\n❌ Error writing tracking file: ${error.message}`);
  process.exit(1);
}

// Summary
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Bug ${bugId} updated successfully`);
console.log(`   ${previousStatus} → ${status}`);
if (fixReport) {
  console.log(`   Report: ${fixReport}`);
}
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Exit successfully
process.exit(0);
