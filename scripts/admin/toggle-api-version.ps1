# Google Places API Version Toggle Script
# Safely switches between Legacy and New API implementations
#
# Usage:
#   .\toggle-api-version.ps1

param(
    [switch]$ToNew,
    [switch]$ToLegacy,
    [switch]$Status
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host $msg -ForegroundColor Yellow }

# Project root
$projectRoot = $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

Write-Host ""
Write-Info "=========================================="
Write-Info "  Google Places API Version Toggle"
Write-Info "=========================================="
Write-Host ""

# Check if .env file exists
if (-not (Test-Path $envFile)) {
    Write-Error "ERROR: .env file not found at: $envFile"
    Write-Error "Create a .env file with GOOGLE_MAPS_API_KEY and other settings first"
    exit 1
}

# Read current .env file
$envContent = Get-Content $envFile -Raw

# Function to get current API version
function Get-CurrentAPIVersion {
    $content = Get-Content $envFile
    $useLine = $content | Where-Object { $_ -match '^USE_NEW_PLACES_API=' }

    if ($useLine) {
        if ($useLine -match '=\s*true') {
            return "NEW"
        } elseif ($useLine -match '=\s*false') {
            return "LEGACY"
        }
    }

    return "LEGACY"  # Default
}

# Function to set API version
function Set-APIVersion {
    param([string]$version)

    $content = Get-Content $envFile
    $found = $false
    $newContent = @()

    foreach ($line in $content) {
        if ($line -match '^USE_NEW_PLACES_API=') {
            if ($version -eq "NEW") {
                $newContent += "USE_NEW_PLACES_API=true"
            } else {
                $newContent += "USE_NEW_PLACES_API=false"
            }
            $found = $true
        } else {
            $newContent += $line
        }
    }

    # If line doesn't exist, add it
    if (-not $found) {
        if ($version -eq "NEW") {
            $newContent += "USE_NEW_PLACES_API=true"
        } else {
            $newContent += "USE_NEW_PLACES_API=false"
        }
    }

    $newContent | Set-Content $envFile
}

# Function to find and kill Node.js server processes
function Stop-ServerProcesses {
    Write-Info "Stopping server processes..."

    # Find Node.js processes running server-secure.cjs
    $processes = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            $cmd -match "server-secure\.cjs"
        } catch {
            $false
        }
    }

    if ($processes) {
        foreach ($proc in $processes) {
            Write-Warning "  Killing process: PID $($proc.Id)"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        Write-Success "  Server processes stopped"
    } else {
        Write-Info "  No server processes found"
    }
}

# Function to start server
function Start-Server {
    Write-Info "Starting server..."

    $startScript = Join-Path $projectRoot "start-server.ps1"

    if (Test-Path $startScript) {
        Write-Info "  Using start-server.ps1..."
        Start-Process powershell -ArgumentList "-NoExit", "-File", $startScript
        Write-Success "  Server started in new window"
    } else {
        Write-Warning "  start-server.ps1 not found, starting manually..."
        $serverPath = Join-Path $projectRoot "src\api\server-secure.cjs"

        if (Test-Path $serverPath) {
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; node '$serverPath'"
            Write-Success "  Server started in new window"
        } else {
            Write-Error "  ERROR: Could not find server file"
        }
    }

    Write-Info "  Waiting for server to initialize..."
    Start-Sleep -Seconds 5
}

# Function to verify server is running
function Test-ServerHealth {
    param([string]$port = "3002")

    Write-Info "Checking server health..."

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 10 -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Success "  Server is healthy (HTTP $($response.StatusCode))"

            # Parse response if JSON
            try {
                $json = $response.Content | ConvertFrom-Json
                if ($json.status) {
                    Write-Success "  Status: $($json.status)"
                }
            } catch {
                # Not JSON, that's okay
            }

            return $true
        }
    } catch {
        Write-Error "  Server health check failed: $($_.Exception.Message)"
        return $false
    }
}

# Show status only
if ($Status) {
    $current = Get-CurrentAPIVersion
    Write-Info "Current API Version: $current"

    if ($current -eq "NEW") {
        Write-Success "Using NEW Google Places API"
    } else {
        Write-Info "Using LEGACY Google Places API"
    }

    # Check if server is running
    Write-Host ""
    Test-ServerHealth | Out-Null

    exit 0
}

# Get current version
$currentVersion = Get-CurrentAPIVersion
Write-Info "Current API Version: $currentVersion"

# Determine target version
$targetVersion = $null

if ($ToNew) {
    $targetVersion = "NEW"
} elseif ($ToLegacy) {
    $targetVersion = "LEGACY"
} else {
    # Toggle behavior (default)
    if ($currentVersion -eq "NEW") {
        $targetVersion = "LEGACY"
    } else {
        $targetVersion = "NEW"
    }
}

# Check if already at target
if ($currentVersion -eq $targetVersion) {
    Write-Warning "Already using $targetVersion API. No change needed."
    exit 0
}

# Confirm switch
Write-Host ""
Write-Warning "SWITCHING: $currentVersion -> $targetVersion"
Write-Host ""

$confirmation = Read-Host "Continue? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Info "Operation cancelled"
    exit 0
}

Write-Host ""

# Create backup of .env
$backupFile = "$envFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $envFile $backupFile
Write-Success "Backup created: $backupFile"

# Step 1: Update .env file
Write-Info "Step 1: Updating .env file..."
Set-APIVersion -version $targetVersion
Write-Success "  .env updated to $targetVersion API"

# Step 2: Stop server processes
Write-Info "Step 2: Stopping server processes..."
Stop-ServerProcesses

# Step 3: Start server with new configuration
Write-Info "Step 3: Starting server with $targetVersion API..."
Start-Server

# Step 4: Verify server health
Write-Info "Step 4: Verifying server health..."
$healthy = Test-ServerHealth

if ($healthy) {
    Write-Host ""
    Write-Success "=========================================="
    Write-Success "  MIGRATION SUCCESSFUL!"
    Write-Success "=========================================="
    Write-Success "Now using: $targetVersion Google Places API"
    Write-Host ""
    Write-Info "Test the API:"
    Write-Host "  curl http://localhost:3002/health"
    Write-Host ""
    Write-Info "To rollback:"
    Write-Host "  .\toggle-api-version.ps1 -ToLegacy"
    Write-Host ""
} else {
    Write-Host ""
    Write-Error "=========================================="
    Write-Error "  SERVER HEALTH CHECK FAILED"
    Write-Error "=========================================="
    Write-Error "Server may not be running properly"
    Write-Host ""
    Write-Warning "To rollback:"
    Write-Host "  .\rollback-to-legacy.ps1"
    Write-Host ""
}

# Show current status
Write-Host ""
Write-Info "Current Configuration:"
Write-Host "  API Version: $targetVersion"
Write-Host "  Env File: $envFile"
Write-Host "  Backup: $backupFile"
Write-Host ""
