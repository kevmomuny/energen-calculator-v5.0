import requests
import json
from pathlib import Path
import time

# Submit all quotes to Zoho CPQ via backend API
quotes_dir = Path('data/quotes/ANR-6-2025')
api_url = "http://localhost:3002/api/generate-pdf"

results = {
    "successful": [],
    "failed": [],
    "total": 0
}

quote_files = sorted(quotes_dir.glob('quote-unit-*.json'))
print(f"Found {len(quote_files)} quote files to process\n")

for i, quote_file in enumerate(quote_files, 1):
    try:
        # Read quote payload
        with open(quote_file, 'r') as f:
            payload = json.load(f)

        unit_num = quote_file.stem.replace('quote-unit-', '')
        generator = payload['quoteData']['generators'][0]

        print(f"[{i}/{len(quote_files)}] Processing Unit {unit_num}: {generator['building']} ({generator['kw']}kW)...")

        # Submit to Zoho CPQ
        response = requests.post(api_url, json=payload, timeout=60)

        if response.status_code == 200:
            data = response.json()

            # Extract Zoho quote ID if present
            zoho_quote_id = data.get('zohoQuoteId') or data.get('quoteId') or 'N/A'

            results['successful'].append({
                'unit': unit_num,
                'building': generator['building'],
                'kw': generator['kw'],
                'zoho_quote_id': zoho_quote_id,
                'file': quote_file.name
            })

            print(f"  SUCCESS - Zoho Quote ID: {zoho_quote_id}")
        else:
            results['failed'].append({
                'unit': unit_num,
                'building': generator['building'],
                'error': f"HTTP {response.status_code}: {response.text[:200]}"
            })
            print(f"  FAILED - {response.status_code}: {response.text[:100]}")

        # Rate limiting - 1 second between requests
        if i < len(quote_files):
            time.sleep(1)

    except Exception as e:
        results['failed'].append({
            'unit': unit_num,
            'error': str(e)
        })
        print(f"  ERROR - {str(e)}")

results['total'] = len(quote_files)

# Save results
results_file = quotes_dir / 'zoho-cpq-submission-results.json'
with open(results_file, 'w') as f:
    json.dump(results, f, indent=2)

# Print summary
print(f"\n{'='*60}")
print("SUBMISSION SUMMARY")
print(f"{'='*60}")
print(f"Total quotes: {results['total']}")
print(f"Successful: {len(results['successful'])}")
print(f"Failed: {len(results['failed'])}")
print(f"\nResults saved to: {results_file}")

if results['successful']:
    print(f"\nSuccessful Quotes:")
    for quote in results['successful'][:5]:
        print(f"  Unit {quote['unit']}: {quote['building']} - Zoho ID: {quote['zoho_quote_id']}")
    if len(results['successful']) > 5:
        print(f"  ... and {len(results['successful']) - 5} more")

if results['failed']:
    print(f"\nFailed Quotes:")
    for quote in results['failed']:
        print(f"  Unit {quote['unit']}: {quote['error'][:100]}")
