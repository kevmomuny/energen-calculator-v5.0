#!/usr/bin/env node
/**
 * Add changelog sections to skills that don't have them
 */

const fs = require('fs');
const path = require('path');

const changelogs = {
  'energen-bug-reporter': `

## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added comprehensive USAGE_EXAMPLES.md with 10 scenarios
- ✅ Enhanced anti-hallucination enforcement ("no completion without tests")
- ✅ Improved error messaging and user guidance
- ✅ Added integration examples with other skills

### v1.0.0 (2025-10-17)
- Initial release with standardized bug reporting
- E2E_BUGS_TRACKING.json integration
- Fix report template system
- Conventional commit message generation
`,

  'energen-code-investigator': `

## Changelog

### v1.1.0 (2025-10-18)
- ✅ Enhanced USAGE_EXAMPLES.md with additional scenarios
- ✅ Improved metric tracking accuracy
- ✅ Added progressive disclosure best practices
- ✅ Enhanced session memory integration

### v1.0.0 (2025-10-17)
- Initial release with anti-hallucination protocol
- Automatic context loading (SYSTEM_CORE.md, SESSION_MEMORY.json)
- Verification minimums enforcement
- Metrics tracking scripts
`,

  'energen-zoho-integrator': `

## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added USAGE_EXAMPLES.md with practical scenarios
- ✅ Enhanced field type documentation
- ✅ Improved error handling in generated code
- ✅ Added integration testing examples

### v1.0.0 (2025-10-17)
- Initial release with code generation capability
- API wrapper class generation
- Field creation scripts with rate limiting
- Test suite generation
- MCP server integration
`,

  'energen-rfp-evaluator': `

## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added USAGE_EXAMPLES.md with real RFP scenarios
- ✅ Enhanced risk assessment documentation
- ✅ Improved service mapping examples
- ✅ Added decision matrix templates

### v1.0.0 (2025-10-17)
- Initial release with AI extraction engine
- Multi-dimensional risk assessment
- Service mapping to Energen A-K categories
- Equipment list parsing
- Executive summary generation
- Go/No-Go decision support
`
};

const skills = Object.keys(changelogs);

skills.forEach(skillName => {
  const skillPath = path.join(__dirname, skillName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    console.log(`⚠️  Skipping ${skillName}: SKILL.md not found`);
    return;
  }

  const content = fs.readFileSync(skillPath, 'utf8');

  // Check if already has changelog
  if (content.includes('## Changelog')) {
    console.log(`ℹ️  Skipping ${skillName}: Already has changelog`);
    return;
  }

  // Add changelog before the end of file
  const newContent = content.trimEnd() + '\n' + changelogs[skillName] + '\n';

  fs.writeFileSync(skillPath, newContent);
  console.log(`✅ Added changelog to ${skillName}/SKILL.md`);
});

console.log('\n✅ Changelog addition complete!');
