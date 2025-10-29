# Start Energen Server with Google Custom Search Configuration

Write-Host "Starting Energen v5.0 Server with Google Custom Search..." -ForegroundColor Cyan

# Set Google API credentials
$env:GOOGLE_API_KEY = "AIzaSyChw8FaZaHzfm0MMLi0o_PvHnHEXm1QTaI"
$env:GOOGLE_SEARCH_ENGINE_ID = "8578917a3152c4259"

Write-Host "✓ Google Custom Search API configured" -ForegroundColor Green
Write-Host "  API Key: $($env:GOOGLE_API_KEY.Substring(0,20))..." -ForegroundColor Gray
Write-Host "  Search Engine ID: $env:GOOGLE_SEARCH_ENGINE_ID" -ForegroundColor Gray
Write-Host ""

# Start the server
Write-Host "Starting server on port 3002..." -ForegroundColor Cyan
cd "C:/ECalc/active/energen-calculator-v5.0"
node src/api/server-secure.cjs
