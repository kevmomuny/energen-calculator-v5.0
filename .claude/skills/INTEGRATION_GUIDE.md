# Skills Integration Guide - Energen Calculator v5.0

**Last Updated:** October 21, 2025
**New Skills Added:** 10 community & official skills

---

## What Was Added

### Development & Testing Skills (obra/superpowers)
1. **test-driven-development** - Write tests first, watch them fail, write minimal code to pass
2. **systematic-debugging** - 4-phase root cause process with evidence tracking
3. **finishing-a-development-branch** - Merge/PR decision workflow and checklist
4. **using-git-worktrees** - Parallel development branches management

### Collaboration & Planning Skills (obra/superpowers)
5. **brainstorming** - Socratic questioning to refine rough ideas into designs
6. **writing-plans** - Detailed implementation plan generation
7. **executing-plans** - Batch task execution with checkpoints

### Document Processing Skills (anthropics/skills)
8. **xlsx** - Excel spreadsheet creation, editing, formulas, data analysis
9. **docx** - Word document creation with tracked changes and formatting
10. **pdf** - PDF text extraction, table handling, document merging

---

## How to Use New Skills

### Automatic Skill Activation

Claude Code automatically activates relevant skills based on your request. You don't need to explicitly invoke them.

**Examples:**

```
User: "Let's implement the new pricing calculator feature"
→ Claude auto-activates: brainstorming → writing-plans → test-driven-development

User: "Debug why the Clear All button is slow"
→ Claude auto-activates: systematic-debugging → energen-code-investigator

User: "Process the equipment list from the Excel file"
→ Claude auto-activates: xlsx

User: "Finish this feature branch and create a PR"
→ Claude auto-activates: finishing-a-development-branch
```

### Explicit Skill Invocation

You can also explicitly request skills:

```bash
# Use TDD for this feature
"Use test-driven-development to implement the new validation logic"

# Use brainstorming
"Use brainstorming to help me design the API architecture"

# Use xlsx skill
"Use the xlsx skill to analyze data/equipment-list.xlsx"
```

---

## Skill Composition Patterns

Skills automatically stack and complement each other. Here are common workflows:

### Pattern 1: Feature Development Workflow
```
brainstorming (design)
  ↓
writing-plans (plan implementation)
  ↓
using-git-worktrees (create isolated workspace)
  ↓
test-driven-development (implement with tests)
  ↓
energen-code-investigator (verify implementation)
  ↓
finishing-a-development-branch (merge/PR)
```

**Example Request:**
```
"I want to add a new service type to the calculator.
Let's design it, plan it, and implement it with TDD."
```

### Pattern 2: Bug Investigation & Fix
```
systematic-debugging (identify root cause)
  ↓
energen-code-investigator (verify bug location)
  ↓
test-driven-development (write failing test)
  ↓
energen-bug-reporter (document fix)
```

**Example Request:**
```
"The phone field isn't clearing on Clear All. Find and fix it."
```

### Pattern 3: RFP Processing Workflow
```
energen-rfp-evaluator (process RFP documents)
  ↓
xlsx (analyze equipment list spreadsheet)
  ↓
writing-plans (create bid strategy)
  ↓
energen-pdf-generator (generate branded PDF)
```

**Example Request:**
```
"Process the ANR-6-2025 RFP and create a bid package"
```

### Pattern 4: Zoho Data Integration
```
xlsx (process Fullbay export data)
  ↓
energen-zoho-integrator (map to Zoho fields)
  ↓
test-driven-development (test integration)
  ↓
energen-code-investigator (verify data integrity)
```

**Example Request:**
```
"Import the Fullbay customer data into Zoho CRM"
```

---

## Integration with Existing Workflows

### Enhanced Anti-Hallucination Enforcement

**Before (v1.0):**
- energen-code-investigator enforced evidence requirements
- energen-bug-reporter required test verification

**Now (v2.0 with community skills):**
- **test-driven-development** ensures tests written BEFORE code
- **systematic-debugging** enforces 4-phase root cause analysis
- **energen-code-investigator** still verifies all claims
- **energen-bug-reporter** documents with full evidence

**Result:** Triple-layer verification preventing false "complete" claims

### Git Workflow Automation

**Before:**
- Manual branch management
- Manual PR creation

**Now:**
- **using-git-worktrees** creates isolated dev environments
- **finishing-a-development-branch** automates merge/PR workflow
- Integrates with existing git hooks

### Document Processing Automation

**Before:**
- Manual Excel file parsing for RFPs
- Manual Word document creation

**Now:**
- **xlsx** automatically processes equipment lists, pricing sheets
- **docx** generates formatted Word documents
- **pdf** extracts text from RFP PDFs
- **energen-pdf-generator** creates branded output PDFs

---

## Skill Priority Matrix

When multiple skills could apply, Claude uses this priority order:

| Priority | Skill | When to Use |
|----------|-------|-------------|
| **P0** | energen-ui-verifier | Before ANY "production ready" claim |
| **P1** | energen-code-investigator | For ALL code analysis tasks |
| **P2** | test-driven-development | When implementing features/fixes |
| **P3** | systematic-debugging | When investigating bugs |
| **P4** | brainstorming | When designing new features |
| **P5** | writing-plans | After design, before implementation |
| **P6** | xlsx/docx/pdf | When processing documents |
| **P7** | energen-bug-reporter | After bug fixes |
| **P8** | finishing-a-development-branch | When completing work |

---

## Skill Compatibility

### Skills That Work Well Together

✅ **brainstorming + writing-plans + test-driven-development**
Complete feature workflow from idea to tested implementation

✅ **systematic-debugging + energen-code-investigator + energen-bug-reporter**
Complete bug investigation and documentation

✅ **xlsx + energen-rfp-evaluator + energen-pdf-generator**
Complete RFP processing pipeline

✅ **using-git-worktrees + test-driven-development + finishing-a-development-branch**
Complete isolated feature development workflow

### Skills That Should NOT Be Used Together

❌ **brainstorming + executing-plans simultaneously**
Brainstorm first, then plan, then execute (sequential)

❌ **test-driven-development bypass with energen-code-investigator**
TDD requires tests first; code-investigator will reject code without tests

---

## Quick Reference Commands

### Check Available Skills
```bash
ls .claude/skills/
```

### Read Skill Documentation
```bash
# Main skill overview
cat .claude/skills/test-driven-development/SKILL.md

# Usage examples (if available)
cat .claude/skills/energen-ui-verifier/USAGE_EXAMPLES.md
```

### Full Skill Collections
```bash
# Browse all superpowers skills
ls .claude/skills/superpowers-community/skills/

# Browse all Anthropic skills
ls .claude/skills/anthropic-skills/
```

---

## Troubleshooting

### Skill Not Activating

**Problem:** Skill isn't being used even when relevant

**Solutions:**
1. Explicitly request it: "Use [skill-name] to..."
2. Check if SKILL.md has proper YAML frontmatter
3. Verify skill is in `.claude/skills/` directory

### Skill Conflicts

**Problem:** Multiple skills trying to handle same task

**Solution:** Be explicit about which skill to use:
```
"Use test-driven-development (not energen-code-investigator) to implement this"
```

### Missing Dependencies

**Problem:** xlsx skill requires npm packages

**Solution:** Install dependencies in skill directory if needed
```bash
cd .claude/skills/xlsx
npm install  # If package.json exists
```

---

## Best Practices

### 1. Let Skills Stack Automatically
Don't micromanage skill selection. Claude will compose them appropriately.

**Good:** "Implement the new validation feature"
**Bad:** "Use brainstorming, then writing-plans, then test-driven-development to implement..."

### 2. Use Explicit Invocation for Edge Cases
When you want a specific skill's approach:

**Example:** "Use systematic-debugging (4-phase process) for this bug"

### 3. Trust the Anti-Hallucination Stack
The combination of skills prevents false completion claims:
- TDD won't let you write code without tests
- Code investigator won't let you claim implementation without evidence
- UI verifier won't let you claim "production ready" without full verification

### 4. Leverage Document Skills for Data Workflows
Instead of manually processing data:

**Before:** "Copy the equipment data from the Excel file"
**Better:** "Use the xlsx skill to extract and analyze the equipment data"

---

## Future Enhancements

### Planned Additions
1. **energen-workflow-orchestrator** - Master workflow coordinator
2. **energen-test-generator** - Automated test stub generation
3. Integration with more superpowers skills as needed

### Community Skills to Consider
From full repositories in `superpowers-community/` and `anthropic-skills/`:
- **dispatching-parallel-agents** - For complex multi-agent workflows
- **verification-before-completion** - Additional completion checks
- **mcp-builder** - If building more MCP servers

---

## Support & Documentation

### Skill Documentation Locations
- **Project skills:** `.claude/skills/energen-*/SKILL.md`
- **Superpowers skills:** `.claude/skills/superpowers-community/skills/*/SKILL.md`
- **Anthropic skills:** `.claude/skills/anthropic-skills/*/SKILL.md`

### External Resources
- **Superpowers:** https://github.com/obra/superpowers
- **Anthropic Skills:** https://github.com/anthropics/skills
- **Awesome Claude Skills:** https://github.com/travisvn/awesome-claude-skills

### Getting Help
1. Check skill's SKILL.md file
2. Check USAGE_EXAMPLES.md if available
3. Review this integration guide
4. Ask Claude: "How does [skill-name] work?"

---

**Remember:** Skills are designed to work together. Trust the composition patterns and let Claude orchestrate the workflow based on your high-level goals.
