#!/usr/bin/env python3
"""
LNBL RFP Bid Calculator
Submits 34 generators to Energen Calculator v5.0 API
"""

import requests
import json

# Generator kW ratings from equipment list
generators = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
]

# API payload
payload = {
    "services": ["A", "B", "D", "E"],
    "customerInfo": {
        "name": "Lawrence Berkeley National Laboratory",
        "address": "1 Cyclotron Road",
        "city": "Berkeley",
        "state": "CA",
        "zip": "94720"
    },
    "generators": [{"kw": kw} for kw in generators],
    "contractLength": 12,
    "taxRate": 0,  # Tax exempt (government)
    "facilityType": "government"
}

print(f"Submitting {len(generators)} generators to Calculator v5.0...")
print(f"Services: {payload['services']}")

# Submit to API
response = requests.post(
    "http://localhost:3002/api/calculate",
    json=payload,
    headers={"Content-Type": "application/json"},
    timeout=60
)

print(f"\nAPI Response: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    print("\nSUCCESS! Calculation complete\n")
    print("=" * 60)
    print(f"Total Annual Cost: ${result.get('total', 0):,.2f}")
    print("=" * 60)

    if 'summary' in result:
        summary = result['summary']
        print(f"\nSubtotal: ${summary.get('subtotal', 0):,.2f}")
        print(f"Tax: ${summary.get('tax', 0):,.2f}")
        print(f"Grand Total: ${summary.get('grandTotal', 0):,.2f}")

    # Save full result
    output_file = "G:/Shared drives/Energen Ops/2-Sales & Marketing/1-Sales/Bids/LNBL-Whole-Facility-RFP/calculator-results.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\nFull results saved to: calculator-results.json")

    # Show breakdown by service
    if 'serviceBreakdown' in result:
        print("\n" + "=" * 60)
        print("SERVICE BREAKDOWN")
        print("=" * 60)
        for service, data in result['serviceBreakdown'].items():
            print(f"{service}: ${data.get('total', 0):,.2f}")

else:
    print(f"\nError: {response.text}")
