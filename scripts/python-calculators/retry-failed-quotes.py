import requests
import json
from pathlib import Path
import time

# Retry the 15 failed quotes with longer delays
quotes_dir = Path('data/quotes/ANR-6-2025')
api_url = "http://localhost:3002/api/generate-pdf"

# Load previous results to get failed units
with open(quotes_dir / 'zoho-cpq-submission-results.json', 'r') as f:
    previous_results = json.load(f)

failed_units = [f['unit'] for f in previous_results['failed']]
print(f"Retrying {len(failed_units)} failed quotes with 5-second delays\n")

results = {
    "successful": [],
    "failed": [],
    "total": len(failed_units)
}

for i, unit_num in enumerate(failed_units, 1):
    try:
        quote_file = quotes_dir / f'quote-unit-{unit_num}.json'

        # Read quote payload
        with open(quote_file, 'r') as f:
            payload = json.load(f)

        generator = payload['quoteData']['generators'][0]

        print(f"[{i}/{len(failed_units)}] Retrying Unit {unit_num}: {generator['building']} ({generator['kw']}kW)...")

        # Submit to Zoho CPQ
        response = requests.post(api_url, json=payload, timeout=60)

        if response.status_code == 200:
            data = response.json()

            # Look for quote ID in various places
            zoho_quote_id = (
                data.get('zohoQuoteId') or
                data.get('quoteId') or
                data.get('quote', {}).get('id') or
                data.get('zohoResult', {}).get('quoteId') or
                'N/A'
            )

            results['successful'].append({
                'unit': unit_num,
                'building': generator['building'],
                'kw': generator['kw'],
                'zoho_quote_id': zoho_quote_id,
                'response_keys': list(data.keys())  # Debug: see what keys are in response
            })

            print(f"  SUCCESS - Response keys: {list(data.keys())[:5]}")
        else:
            results['failed'].append({
                'unit': unit_num,
                'building': generator['building'],
                'error': f"HTTP {response.status_code}: {response.text[:200]}"
            })
            print(f"  FAILED - {response.status_code}")

        # Longer delay to avoid rate limiting
        if i < len(failed_units):
            time.sleep(5)

    except Exception as e:
        results['failed'].append({
            'unit': unit_num,
            'error': str(e)
        })
        print(f"  ERROR - {str(e)}")

# Save retry results
retry_file = quotes_dir / 'zoho-cpq-retry-results.json'
with open(retry_file, 'w') as f:
    json.dump(results, f, indent=2)

# Print summary
print(f"\n{'='*60}")
print("RETRY SUMMARY")
print(f"{'='*60}")
print(f"Total retried: {results['total']}")
print(f"Successful: {len(results['successful'])}")
print(f"Failed: {len(results['failed'])}")
print(f"\nResults saved to: {retry_file}")

if results['successful'] and len(results['successful']) > 0:
    print(f"\nFirst successful response keys:")
    print(results['successful'][0].get('response_keys', []))
