## KNOWN ISSUES TO HANDLE

| Bug ID | Issue | Workaround | Status |
|--------|-------|------------|--------|
| E2E-001 | Playwright requires user input | Use Chrome DevTools MCP exclusively | RESOLVED |
| E2E-002 | Clear All 5s delay | Wait patiently, no workaround | Active |
| E2E-003 | Phone/website field retention | Manual clear before test | Active |
| E2E-004 | $0 calculation without DOM click | Click services via UI, not state | Active |
| E2E-005 | PDF libraries not detected | Verify libraries loaded first | Active |
| E2E-006 | Validation tied to DOM | Use UI interaction, not state | Active |
| E2E-007 | Zoho product workflow | Products auto-created now | FIXED |
| E2E-008 | Generator asset MCP missing | Use direct API fallback | Active |
