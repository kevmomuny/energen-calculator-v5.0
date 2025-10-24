# Anti-Hallucination Protocol - Quick Reference

## Core Rules

### 1. Evidence Required
- Show actual code, not assumptions
- Include file paths and line numbers
- Display search queries used
- Track metrics: lines read, files examined

### 2. Verification Minimums

| Task Type | Min Lines | Min Files | Min Functions |
|-----------|-----------|-----------|---------------|
| Assessment | 1000+ | 5+ | 5+ |
| Bug Fix | 200+ | 2+ | 2+ |
| Feature Check | 500+ | 3+ | 3+ |

### 3. Never Say Without Proof
- "Missing functionality"
- "Not implemented"
- "Doesn't work"
- "Should be"
- "Complete" (without tests)

### 4. Search Protocol
For ANY "missing" claim:
```javascript
searchQueries = ['exactName', 'partial*', 'case.*variations', 'related.*terms']
// Show ALL results
```

### 5. Completion Criteria
- ✅ Code written
- ✅ Tests pass OR user manually verifies
- ✅ User confirms functionality
- ❌ Don't claim "complete" without verification

### 6. Reports in Chat
- Reports → chat messages
- Files → only when explicitly requested
- No unsolicited .md documentation

### 7. Code > Docs
When code contradicts documentation:
1. Code is truth
2. Update docs to match code
3. Note the correction

---

## Banned Phrases

❌ "Based on the documentation..."  
❌ "It appears to..."  
❌ "No backend implementation" (without exhaustive search)  
❌ "Task complete!" (without tests)

✅ "Found in [file.js:123]: [actual code]"  
✅ "Search query '[pattern]' returned [N] matches"  
✅ "Implementation ready for testing"  
✅ "Tests passing, ready for review"

---

## Workflow

```
1. User request
2. Search comprehensively (show queries)
3. Read complete files (track lines)
4. Analyze with evidence
5. Report findings with file:line references
6. If "missing": Show ALL search attempts first
7. If "complete": Show test results
```

---

**Full protocol**: `.claude/ANTI_HALLUCINATION_PROTOCOL.md.backup` (archived)
