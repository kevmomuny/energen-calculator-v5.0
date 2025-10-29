#!/usr/bin/env python3
"""
LNBL RFP - FINAL CORRECTED Calculation
Service A = ANNUAL (1x/year), not quarterly!
"""

import requests
import json

# All 34 generators
generators = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
]

# API payload with CORRECT service frequencies
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
    "taxRate": 0,
    "facilityType": "government",
    "serviceDFluids": {
        "oil": True,
        "fuel": True,
        "coolant": True
    },
    "serviceFrequencies": {
        "A": 1,  # ANNUAL - Once per year
        "B": 1,  # ANNUAL - Once per year
        "D": 1,  # ANNUAL - Once per year
        "E": 1   # ANNUAL - Once per year
    }
}

print(f"Calculating {len(generators)} generators with CORRECT frequencies...")
print("Service A: ANNUAL (1x/year) - not quarterly!")
print("Service B: ANNUAL (1x/year)")
print("Service D: ANNUAL (1x/year)")
print("Service E: ANNUAL (1x/year)")
print("=" * 80)

response = requests.post(
    "http://localhost:3002/api/calculate",
    json=payload,
    headers={"Content-Type": "application/json"},
    timeout=60
)

print(f"\nAPI Response: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    calc = result['calculation']

    subtotal = float(calc['subtotal'])

    print("\n" + "=" * 80)
    print("SUCCESS! CORRECTED CALCULATION")
    print("=" * 80)
    print(f"\nTOTAL ANNUAL COST: ${subtotal:,.2f}")
    print("=" * 80)

    # Service breakdown
    services = calc.get('serviceBreakdown', {})
    print("\nSERVICE BREAKDOWN:")
    print("-" * 80)

    for svc_name, svc_data in services.items():
        total = svc_data.get('totalCost', 0)
        freq = svc_data.get('frequency', 1)
        print(f"{svc_name:40s} ${total:>12,.2f}  ({freq}x/year)")

    print("=" * 80)

    # Save result
    output_file = "G:/Shared drives/Energen Ops/2-Sales & Marketing/1-Sales/Bids/LNBL-Whole-Facility-RFP/final-corrected-calculation.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\nResults saved to: final-corrected-calculation.json")

else:
    print(f"\nERROR: {response.text}")
