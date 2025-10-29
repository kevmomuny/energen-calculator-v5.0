# PowerShell script to add routes to server-secure.cjs
$file = "C:\ECalc\active\energen-calculator-v5.0\src\api\server-secure.cjs"
$content = Get-Content $file -Raw

# Add import
$importLine = "const quoteManagement = require('./quote-management-endpoints.cjs')"
$importAnchor = "const bidRecreation = require('./bid-recreation-endpoints.cjs')"

if ($content -notmatch "quote-management-endpoints") {
    $content = $content -replace [regex]::Escape($importAnchor), "$importAnchor`n`n// Import quote management endpoints (email and revision)`n$importLine"
    Write-Host "Added import statement"
} else {
    Write-Host "Import already exists"
}

# Add routes
$routesBlock = @"

// =============================================================================
// QUOTE MANAGEMENT ENDPOINTS (EMAIL & REVISION)
// =============================================================================

app.post('/api/email-quote', async (req, res) => {
  await quoteManagement.emailQuote(req, res, logger)
})

app.post('/api/quote/create-revision', async (req, res) => {
  await quoteManagement.createRevision(req, res, logger)
})
"@

$routesAnchor = "app.post('/api/bid/sessions/cleanup', bidRecreation.cleanupExpiredSessions)"

if ($content -notmatch "/api/email-quote") {
    $content = $content -replace [regex]::Escape($routesAnchor), "$routesAnchor$routesBlock"
    Write-Host "Added routes"
} else {
    Write-Host "Routes already exist"
}

# Save file
$content | Set-Content $file -NoNewline
Write-Host "File updated successfully"
