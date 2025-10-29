@echo off
echo Updating Claude Desktop configuration...
echo.

set CONFIG_FILE=%APPDATA%\Claude\claude_desktop_config.json
set BACKUP_FILE=%APPDATA%\Claude\claude_desktop_config.json.backup

if exist "%CONFIG_FILE%" (
    echo Creating backup...
    copy "%CONFIG_FILE%" "%BACKUP_FILE%" >nul
)

echo Writing new configuration...
(
echo {
echo   "mcpServers": {
echo     "zoho-crm": {
echo       "command": "C:/Program Files/nodejs/node.exe",
echo       "args": ["C:/ECalc/active/energen-calculator-v5.0/modules/zoho-integration/start-mcp-server.js"],
echo       "env": {
echo         "ZOHO_CLIENT_ID": "1000.3048WYPLW66UPPFS6JJE2CLXQ8XAM",
echo         "ZOHO_CLIENT_SECRET": "3ce8f854d592e9d2bc3bbd3c56d2a0dc4aa7d1fc24",
echo         "ZOHO_REFRESH_TOKEN": "1000.3475107ddf273a25e97dab50d8b4f85f.2a3d11d8dbc7ab44c8fba94f75c062c0",
echo         "ZOHO_API_DOMAIN": "https://www.zohoapis.com",
echo         "ZOHO_ACCOUNTS_URL": "https://accounts.zoho.com"
echo       }
echo     },
echo     "ZohoMCP": {
echo       "url": "https://zohomcp-8921.onzatalyst.com/mcp/message?key=fY2ep5208fb6edd8791d8326316d0a"
echo     }
echo   }
echo }
) > "%CONFIG_FILE%"

echo.
echo ✓ Configuration updated successfully!
echo.
echo Config file: %CONFIG_FILE%
echo Backup file: %BACKUP_FILE%
echo.
echo Next steps:
echo 1. Restart Claude Desktop or Claude Code
echo 2. Look for MCP connection indicator
echo 3. Zoho MCP tools should now be available!
echo.
pause
