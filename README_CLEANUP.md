# 🚀 Quick Start: Clean Up Your Project

Your energen-calculator-v5.0 project has issues preventing Claude Code from starting. This guide will fix them in **5 minutes**.

## ⚠️ Critical Issue Found

**Hardcoded Google API Key** in `.claude/settings.local.json`
- This is a security risk
- The cleanup will move it to `.env` (secure)

## 🎯 Quick Fix (Easiest Method)

### Option 1: One-Click Cleanup

1. Open Command Prompt in this folder
2. Run:
   ```cmd
   QUICK_START_CLEANUP.bat
   ```
3. Follow the prompts
4. Close and reopen VS Code
5. Done! ✅

### Option 2: PowerShell Manual

1. Open PowerShell in this folder
2. Run:
   ```powershell
   .\cleanup-project.ps1
   ```
3. Update settings:
   ```powershell
   Copy-Item .claude/settings.local.json.clean .claude/settings.local.json
   ```
4. Add API key to `.env`:
   ```bash
   echo "GOOGLE_API_KEY=AIzaSyChw8FaZaHzfm0MMLi0o_PvHnHEXm1QTaI" >> .env
   ```
5. Close and reopen VS Code
6. Done! ✅

## 📊 What Will Be Fixed

| Issue | Files Affected | Solution |
|-------|---------------|----------|
| Root clutter | 200+ files | Organized into `scripts/` and `docs/` |
| Test files | 44 files | Moved to `archive/` |
| Python scripts | 30+ files | Moved to `scripts/python-calculators/` |
| Report docs | 25+ files | Moved to `docs/reports/` |
| Log files | 15+ files | Removed/archived |
| API key exposure | 1 file | Moved to `.env` |
| Bloated permissions | 36 entries | Streamlined to 20 |

## ✅ Expected Results

**Before Cleanup:**
```
energen-calculator-v5.0/
├── test-1.cjs
├── test-2.cjs
├── test-3.cjs
├── ... (200+ files in root)
├── analyze-something.cjs
├── fix-this.py
├── REPORT_1.md
└── page_1.txt
```

**After Cleanup:**
```
energen-calculator-v5.0/
├── src/
├── frontend/
├── scripts/
│   ├── python-calculators/
│   ├── zoho-utils/
│   ├── patches/
│   └── admin/
├── docs/
│   └── reports/
├── archive/
├── package.json
└── README.md
```

## 🔍 Verification Steps

After running cleanup:

1. **Check the structure:**
   ```bash
   ls
   ```
   Should show clean root directory

2. **Verify settings:**
   ```bash
   cat .claude/settings.local.json
   ```
   Should NOT contain hardcoded API key

3. **Check .env:**
   ```bash
   cat .env
   ```
   Should contain `GOOGLE_API_KEY=...`

4. **Test Claude Code:**
   - Close VS Code
   - Reopen project
   - Open Claude Code panel
   - Should start without errors! ✅

## 🆘 Troubleshooting

### Claude Code still won't start?

1. **Check for errors:**
   - VS Code → View → Output
   - Select "Claude Code" from dropdown
   - Look for error messages

2. **Try rebuilding node_modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check MCP servers:**
   ```bash
   npx -y @wonderwhy-er/desktop-commander --version
   npx -y kapture-mcp --help
   ```

4. **Restore if needed:**
   ```bash
   Copy-Item BACKUP-BEFORE-CLEANUP\settings.local.json.backup .claude\settings.local.json
   ```

## 📚 Detailed Documentation

For more details, see:
- [PROJECT_CLEANUP_GUIDE.md](PROJECT_CLEANUP_GUIDE.md) - Full documentation
- [cleanup-project.ps1](cleanup-project.ps1) - Cleanup script source

## 🎉 Success Checklist

- [ ] Ran cleanup script
- [ ] Updated `.claude/settings.local.json`
- [ ] Moved API key to `.env`
- [ ] Tested Claude Code startup
- [ ] Committed changes to git
- [ ] Backed up old settings

---

**Time to complete:** ~5 minutes
**Difficulty:** Easy
**Risk:** Low (backups created automatically)

Ready to start? Run `QUICK_START_CLEANUP.bat` now!
