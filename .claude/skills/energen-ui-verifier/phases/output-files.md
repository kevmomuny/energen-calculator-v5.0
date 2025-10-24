## OUTPUT FILES

### Verification Report
```
.claude/skills/energen-ui-verifier/results/
  verification-report-[timestamp].json
  screenshots/
    phase0-preflight.png
    phase1-customer-entry.png
    phase2-contact-entry.png
    phase3-generator-specs.png
    phase4-service-selection.png
    phase5-calculation.png
    phase6-results.png
    phase7-pdf.png
    phase8-zoho-account.png
    phase8-zoho-contact.png
    phase8-zoho-asset.png
    phase8-zoho-quote.png
  console-logs/
    phase0.log
    phase1.log
    ...
  network-logs/
    phase0-network.json
    phase1-network.json
    ...
```

### Report Format
```json
{
  "timestamp": "2025-10-17T10:00:00Z",
  "version": "1.0.0",
  "overall_status": "PASS" | "FAIL",
  "production_ready": true | false,
  "phases": {
    "phase0": { "status": "PASS", "checks": 7, "passed": 7, "failed": 0, "evidence": [...] },
    "phase1": { "status": "PASS", "checks": 15, "passed": 15, "failed": 0, "evidence": [...] },
    ...
  },
  "summary": {
    "total_checks": 150,
    "passed": 150,
    "failed": 0,
    "warnings": 0,
    "total_duration_ms": 45000
  },
  "failures": [],
  "warnings": [],
  "evidence": {
    "screenshots": [...],
    "console_logs": [...],
    "network_logs": [...],
    "api_responses": [...]
  }
}
```

---
