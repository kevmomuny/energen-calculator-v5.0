#!/usr/bin/env python3
"""
LNBL RFP Bid Calculator - CORRECTED
Service D configured with all 3 fluids (oil, fuel, coolant) = $93.10 per generator
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

# API payload with Service D fluids configured
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
    "facilityType": "government",
    "serviceDFluids": {
        "oil": True,
        "fuel": True,
        "coolant": True
    }
}

print(f"Submitting {len(generators)} generators to Calculator v5.0...")
print(f"Services: {payload['services']}")
print(f"Service D: Oil + Fuel + Coolant analysis ($93.10/unit)")

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
    print("=" * 70)

    # Extract actual total from calculation object
    calc = result.get('calculation', {})
    subtotal = float(calc.get('subtotal', 0))
    tax = float(calc.get('tax', 0))
    total_with_tax = float(calc.get('total', 0))

    print(f"Subtotal (Tax-Exempt):     ${subtotal:,.2f}")
    print(f"Tax (if applicable):       ${tax:,.2f}")
    print(f"Total with Tax:            ${total_with_tax:,.2f}")
    print("=" * 70)

    # Show service breakdown
    if 'serviceBreakdown' in calc:
        print("\nSERVICE BREAKDOWN")
        print("=" * 70)
        for service, data in calc['serviceBreakdown'].items():
            total_cost = data.get('totalCost', 0)
            frequency = data.get('frequency', 1)
            print(f"{service:35} ${total_cost:>12,.2f}  ({frequency}x/year)")
        print("=" * 70)

    # Calculate Service D verification
    service_d = calc.get('serviceBreakdown', {}).get('D - Oil & Fuel Analysis', {})
    service_d_total = service_d.get('totalCost', 0)
    per_unit = service_d_total / len(generators) if len(generators) > 0 else 0
    print(f"\nService D Verification:")
    print(f"  Total: ${service_d_total:,.2f}")
    print(f"  Per Unit: ${per_unit:.2f} (should be $93.10)")
    print(f"  Units: {len(generators)}")

    # Save full result
    output_file = "G:/Shared drives/Energen Ops/2-Sales & Marketing/1-Sales/Bids/LNBL-Whole-Facility-RFP/calculator-results-corrected.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\nFull results saved to: calculator-results-corrected.json")

else:
    print(f"\nError: {response.text}")
