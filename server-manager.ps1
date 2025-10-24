# Server Manager for Energen v5.0
# Tracks and manages all Node processes on port 3002

$PORT = 3002
$PROJECT_ROOT = "C:\ECalc\active\energen-calculator-v5.0"
$SERVER_SCRIPT = "src\api\server-secure.cjs"
$LOG_FILE = "server-manager.log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LOG_FILE -Append
}

function Get-PortProcesses {
    Write-Log "Checking for processes on port $PORT..."
    $processes = netstat -ano | Select-String ":$PORT" | ForEach-Object {
        if ($_ -match "\s+(\d+)$") {
            $pid = $matches[1]
            try {
                $proc = Get-Process -Id $pid -ErrorAction Stop
                [PSCustomObject]@{
                    PID = $pid
                    Name = $proc.Name
                    Path = $proc.Path
                    StartTime = $proc.StartTime
                    CPU = [math]::Round($proc.CPU, 2)
                    Memory = [math]::Round($proc.WorkingSet64 / 1MB, 2)
                }
            } catch {
                [PSCustomObject]@{
                    PID = $pid
                    Name = "Unknown"
                    Path = "N/A"
                    StartTime = "N/A"
                    CPU = 0
                    Memory = 0
                }
            }
        }
    } | Sort-Object -Property PID -Unique

    return $processes
}

function Stop-AllServerProcesses {
    Write-Log "=== STOPPING ALL PROCESSES ON PORT $PORT ==="
    $processes = Get-PortProcesses

    if ($processes.Count -eq 0) {
        Write-Log "[OK] No processes found on port $PORT"
        return $true
    }

    Write-Log "Found $($processes.Count) process(es) on port $PORT"
    $processes | Format-Table -AutoSize | Out-String | Write-Log

    foreach ($proc in $processes) {
        Write-Log "Killing PID $($proc.PID) ($($proc.Name))..."
        try {
            taskkill /F /PID $proc.PID 2>&1 | Out-Null
            Start-Sleep -Milliseconds 500

            # Verify it's dead
            $check = Get-Process -Id $proc.PID -ErrorAction SilentlyContinue
            if ($check) {
                Write-Log "⚠️ WARNING: Process $($proc.PID) still alive, forcing again..."
                Stop-Process -Id $proc.PID -Force -ErrorAction SilentlyContinue
            } else {
                Write-Log "✅ Successfully killed PID $($proc.PID)"
            }
        } catch {
            Write-Log "❌ Error killing PID $($proc.PID): $_"
        }
    }

    # Final verification
    Start-Sleep -Seconds 1
    $remaining = Get-PortProcesses
    if ($remaining.Count -eq 0) {
        Write-Log "✅ Port $PORT is now free"
        return $true
    } else {
        Write-Log "❌ WARNING: $($remaining.Count) process(es) still on port $PORT"
        return $false
    }
}

function Start-Server {
    Write-Log "=== STARTING SERVER ==="

    # Verify project root exists
    if (-not (Test-Path $PROJECT_ROOT)) {
        Write-Log "❌ ERROR: Project root not found: $PROJECT_ROOT"
        return $false
    }

    # Verify server script exists
    $serverPath = Join-Path $PROJECT_ROOT $SERVER_SCRIPT
    if (-not (Test-Path $serverPath)) {
        Write-Log "❌ ERROR: Server script not found: $serverPath"
        return $false
    }

    # Check if .env exists
    $envPath = Join-Path $PROJECT_ROOT ".env"
    if (Test-Path $envPath) {
        Write-Log "✅ Found .env file"
    } else {
        Write-Log "⚠️ WARNING: No .env file found - using defaults"
    }

    Write-Log "Starting server: node $SERVER_SCRIPT"
    Write-Log "Working directory: $PROJECT_ROOT"

    # Start the server in a new window (so we can see logs)
    $startParams = @{
        FilePath = "node"
        ArgumentList = $SERVER_SCRIPT
        WorkingDirectory = $PROJECT_ROOT
        PassThru = $true
        WindowStyle = "Normal"
    }

    try {
        $process = Start-Process @startParams
        Write-Log "✅ Server started with PID: $($process.Id)"

        # Wait a bit and verify it's running
        Start-Sleep -Seconds 3
        $check = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
        if ($check) {
            Write-Log "✅ Server is running (PID: $($process.Id))"

            # Check if it's listening on the port
            Start-Sleep -Seconds 2
            $listening = Get-PortProcesses | Where-Object { $_.PID -eq $process.Id }
            if ($listening) {
                Write-Log "✅ Server is listening on port $PORT"
                Write-Log "🚀 Server URL: http://localhost:$PORT"
                Write-Log "🚀 Frontend URL: http://localhost:$PORT/frontend/integrated-ui.html"
                return $true
            } else {
                Write-Log "⚠️ WARNING: Server running but not yet listening on port $PORT (may still be starting)"
                return $true
            }
        } else {
            Write-Log "❌ ERROR: Server process died immediately after starting"
            return $false
        }
    } catch {
        Write-Log "❌ ERROR starting server: $_"
        return $false
    }
}

function Restart-Server {
    Write-Log ""
    Write-Log "=========================================="
    Write-Log "SERVER RESTART INITIATED"
    Write-Log "=========================================="
    Write-Log ""

    # Step 1: Stop all existing processes
    $stopped = Stop-AllServerProcesses
    if (-not $stopped) {
        Write-Log "❌ FAILED to clean up old processes"
        Write-Log "Manual intervention required - check Task Manager"
        return $false
    }

    Write-Log ""

    # Step 2: Start new server
    $started = Start-Server
    if (-not $started) {
        Write-Log "❌ FAILED to start server"
        return $false
    }

    Write-Log ""
    Write-Log "=========================================="
    Write-Log "SERVER RESTART COMPLETE ✅"
    Write-Log "=========================================="
    Write-Log ""

    return $true
}

function Show-ServerStatus {
    Write-Log "=== SERVER STATUS ==="
    $processes = Get-PortProcesses

    if ($processes.Count -eq 0) {
        Write-Log "❌ No server running on port $PORT"
        return
    }

    Write-Log "✅ Found $($processes.Count) process(es) on port $PORT:"
    $processes | Format-Table -AutoSize | Out-String | Write-Log
}

function Show-Menu {
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "   ENERGEN V5.0 SERVER MANAGER"
    Write-Host "=========================================="
    Write-Host ""
    Write-Host "1. Show Server Status"
    Write-Host "2. Restart Server (Stop All + Start Fresh)"
    Write-Host "3. Stop All Servers"
    Write-Host "4. Start Server"
    Write-Host "5. View Recent Logs"
    Write-Host "6. Open Frontend in Browser"
    Write-Host "Q. Quit"
    Write-Host ""
}

# Main execution
if ($args.Count -eq 0) {
    # Interactive menu mode
    while ($true) {
        Show-Menu
        $choice = Read-Host "Enter choice"

        switch ($choice.ToUpper()) {
            "1" { Show-ServerStatus }
            "2" { Restart-Server }
            "3" { Stop-AllServerProcesses }
            "4" { Start-Server }
            "5" {
                if (Test-Path $LOG_FILE) {
                    Get-Content $LOG_FILE -Tail 50
                } else {
                    Write-Host "No log file found"
                }
            }
            "6" {
                Start-Process "http://localhost:$PORT/frontend/integrated-ui.html"
                Write-Log "Opened frontend in browser"
            }
            "Q" {
                Write-Log "Server Manager exiting..."
                exit 0
            }
            default { Write-Host "Invalid choice" }
        }

        Write-Host ""
        Write-Host "Press any key to continue..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Clear-Host
    }
} else {
    # Command-line mode
    switch ($args[0].ToLower()) {
        "status" { Show-ServerStatus }
        "restart" { Restart-Server }
        "stop" { Stop-AllServerProcesses }
        "start" { Start-Server }
        "logs" { Get-Content $LOG_FILE -Tail 50 }
        default {
            Write-Host "Usage: .\server-manager.ps1 [status|restart|stop|start|logs]"
            Write-Host "   Or run without arguments for interactive menu"
        }
    }
}
