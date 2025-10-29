# Energen Calculator v5.0 - Project Cleanup Script
# This script organizes the project structure for optimal Claude Code performance

Write-Host "Starting Project Cleanup..." -ForegroundColor Cyan

# Create archive and organized directories
$archiveDir = "archive/cleanup-$(Get-Date -Format 'yyyyMMdd')"
$scriptDirs = @(
    "scripts/python-calculators",
    "scripts/zoho-utils",
    "scripts/patches",
    "scripts/admin",
    "docs/reports",
    "docs/archived"
)

Write-Host "`nCreating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
foreach ($dir in $scriptDirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Move test files to archive
Write-Host "`nArchiving test files..." -ForegroundColor Yellow
Get-ChildItem -Path . -File | Where-Object { $_.Name -match '^test-.*\.(cjs|js|mjs|py)$' } |
    ForEach-Object { Move-Item $_.FullName -Destination $archiveDir -Force }

# Move Python calculation scripts
Write-Host "Organizing Python scripts..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.py" -File |
    ForEach-Object { Move-Item $_.FullName -Destination "scripts/python-calculators" -Force }

# Move Zoho utility scripts
Write-Host "Organizing Zoho utility scripts..." -ForegroundColor Yellow
$zohoPatterns = @('analyze-*.cjs', 'backup-*.cjs', 'fetch-*.cjs', 'find-*.cjs',
                  'fullbay-*.cjs', 'generate-*.cjs', 'migrate-*.cjs',
                  'simple-*.cjs', 'quick-*.cjs', 'comprehensive-*.cjs',
                  'zoho-*.cjs')
foreach ($pattern in $zohoPatterns) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue |
        ForEach-Object { Move-Item $_.FullName -Destination "scripts/zoho-utils" -Force }
}

# Move patch and fix scripts
Write-Host "Organizing patch files..." -ForegroundColor Yellow
$patchPatterns = @('*.patch', '*-patch.ps1', 'patch-*.cjs', 'insert-*.cjs', 'fix-*.ps1')
foreach ($pattern in $patchPatterns) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue |
        ForEach-Object { Move-Item $_.FullName -Destination "scripts/patches" -Force }
}

# Move admin/utility scripts
Write-Host "Organizing admin scripts..." -ForegroundColor Yellow
$adminScripts = @('server-manager.ps1', 'toggle-api-version.ps1', 'update-*.ps1',
                  '*.bat', 'kill-*.ps1', 'safe-*.ps1')
foreach ($pattern in $adminScripts) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '^(cleanup-project|start-server)' } |
        ForEach-Object { Move-Item $_.FullName -Destination "scripts/admin" -Force }
}

# Archive report markdown files
Write-Host "Archiving report documents..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*_*.md" -File |
    Where-Object { $_.Name -notmatch '^(README|CLAUDE)' } |
    ForEach-Object { Move-Item $_.FullName -Destination "docs/reports" -Force }

# Archive log and temp files
Write-Host "Cleaning temporary files..." -ForegroundColor Yellow
$tempPatterns = @('*.log', 'page_*.txt', '*-output.log', 'FINAL_FIX.txt',
                  'RELOAD_NOW.txt', 'START_HERE.txt', 'quote-creation-log.txt',
                  'field-creation-output.log', 'backend*.log', 'frontend*.log',
                  'server*.log', 'startup.err', 'startup.log', 'test-results.txt',
                  'test-output.log', 'nul', 'NUL')
foreach ($pattern in $tempPatterns) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue |
        ForEach-Object { Move-Item $_.FullName -Destination $archiveDir -Force }
}

# Archive data files
Write-Host "Archiving data files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.json" -File |
    Where-Object { $_.Name -match '(result|output|report|comparison)' } |
    ForEach-Object { Move-Item $_.FullName -Destination $archiveDir -Force }

# Clean up problematic files
Write-Host "Removing problematic files..." -ForegroundColor Yellow
$removeFiles = @(
    'C:fullbay-zoho-data-transfer.env',
    'C:fullbay-zoho-data-transfertransform-to-zoho-fields.cjs',
    'eng.traineddata'
)
foreach ($file in $removeFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removed: $file" -ForegroundColor Gray
    }
}

# Clean up settings.local.json - remove hardcoded secrets
Write-Host "`nCleaning .claude configuration..." -ForegroundColor Yellow
$settingsPath = ".claude/settings.local.json"
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json

    # Remove any permissions with hardcoded secrets
    if ($settings.permissions.allow) {
        $settings.permissions.allow = $settings.permissions.allow |
            Where-Object { $_ -notmatch 'API_KEY|SECRET|PASSWORD|TOKEN' }
    }

    # Backup original
    Copy-Item $settingsPath "$settingsPath.backup" -Force

    # Save cleaned version
    $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
    Write-Host "  Cleaned settings.local.json (backup created)" -ForegroundColor Green
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "`nProject structure organized:"
Write-Host "  - Test files archived to: $archiveDir"
Write-Host "  - Python scripts: scripts/python-calculators/"
Write-Host "  - Zoho utilities: scripts/zoho-utils/"
Write-Host "  - Patch files: scripts/patches/"
Write-Host "  - Admin scripts: scripts/admin/"
Write-Host "  - Reports: docs/reports/"
Write-Host "`nNext steps:"
Write-Host "  1. Review the changes with: git status"
Write-Host "  2. Test Claude Code startup"
Write-Host "  3. Commit the cleaned structure"
Write-Host ""
