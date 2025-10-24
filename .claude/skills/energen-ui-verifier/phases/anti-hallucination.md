## ANTI-HALLUCINATION PROTOCOL

**Every claim must have evidence:**
- ✅ "Phase 1 PASSED" → Screenshot + console log + state verification
- ❌ "Phase 1 PASSED" → No evidence = INVALID CLAIM

**No assumptions:**
- ✅ "Button exists at selector X" → playwright_evaluate confirms
- ❌ "Button probably exists" → INVALID CLAIM

**Fail fast:**
- First error in any phase → STOP
- Document error with evidence
- Mark phase as FAILED
- Do NOT continue to next phase
- Report: "Production readiness: BLOCKED by [error]"

---
