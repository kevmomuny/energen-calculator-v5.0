# Update Claude Desktop MCP Configuration
# Adds official Zoho MCP to the configuration

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$backupPath = "$env:APPDATA\Claude\claude_desktop_config.json.backup"

Write-Host "Updating Claude Desktop MCP Configuration..." -ForegroundColor Cyan
Write-Host ""

# Backup existing config
if (Test-Path $configPath) {
    Write-Host "Creating backup: $backupPath" -ForegroundColor Yellow
    Copy-Item -Path $configPath -Destination $backupPath -Force
}

# New configuration
$newConfig = @{
    mcpServers = @{
        "zoho-crm" = @{
            command = "C:/Program Files/nodejs/node.exe"
            args = @("C:/ECalc/active/energen-calculator-v5.0/modules/zoho-integration/start-mcp-server.js")
            env = @{
                ZOHO_CLIENT_ID = "1000.3048WYPLW66UPPFS6JJE2CLXQ8XAM"
                ZOHO_CLIENT_SECRET = "3ce8f854d592e9d2bc3bbd3c56d2a0dc4aa7d1fc24"
                ZOHO_REFRESH_TOKEN = "1000.3475107ddf273a25e97dab50d8b4f85f.2a3d11d8dbc7ab44c8fba94f75c062c0"
                ZOHO_API_DOMAIN = "https://www.zohoapis.com"
                ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
            }
        }
        ZohoMCP = @{
            url = "https://zohomcp-8921.onzatalyst.com/mcp/message?key=fY2ep5208fb6edd8791d8326316d0a"
        }
    }
}

# Convert to JSON and save
$json = $newConfig | ConvertTo-Json -Depth 10
$json | Out-File -FilePath $configPath -Encoding UTF8

Write-Host "✅ Configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration saved to: $configPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Claude Desktop (or Claude Code in VS Code)"
Write-Host "2. Look for 🔌 MCP connection indicator"
Write-Host "3. You should now have access to Zoho MCP tools!"
Write-Host ""
Write-Host "Available Zoho MCP tools will include:" -ForegroundColor Cyan
Write-Host "  - list_contacts (Books customers)"
Write-Host "  - create_customer"
Write-Host "  - create_invoice"
Write-Host "  - get_contact"
Write-Host "  - And many more..."
