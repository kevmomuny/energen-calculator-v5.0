#!/usr/bin/env python3
"""
Verify Service B oil calculations for LNBL RFP
Check if oil quantities are correct for each generator
"""

import requests
import json
import time

# Test a few sample generators from different kW ranges
test_generators = [
    {"kw": 20, "expected_gallons": 1.5, "range": "2-14 kW"},
    {"kw": 150, "expected_gallons": 5.0, "range": "35-150 kW"},
    {"kw": 250, "expected_gallons": 8.0, "range": "151-250 kW"},
    {"kw": 300, "expected_gallons": 12.0, "range": "251-400 kW"},
    {"kw": 500, "expected_gallons": 18.0, "range": "401-500 kW"},
    {"kw": 550, "expected_gallons": 30.0, "range": "501-670 kW"},
    {"kw": 1300, "expected_gallons": 50.0, "range": "671-1050 kW"},
    {"kw": 2000, "expected_gallons": 75.0, "range": "1501-2050 kW"}
]

oil_price_per_gallon = 24.00  # $16 base × 1.5 markup

print("=" * 80)
print("SERVICE B OIL CALCULATION VERIFICATION")
print("=" * 80)
print(f"Oil price: ${oil_price_per_gallon:.2f}/gallon ($16 base × 1.5 markup)")
print("=" * 80)

for gen in test_generators:
    payload = {
        "services": ["B"],
        "customerInfo": {
            "name": "Test",
            "address": "Test",
            "city": "Berkeley",
            "state": "CA",
            "zip": "94720"
        },
        "generators": [{"kw": gen["kw"]}],
        "contractLength": 12,
        "taxRate": 0,
        "serviceFrequencies": {"B": 1}
    }

    response = requests.post(
        "http://localhost:3002/api/calculate",
        json=payload,
        timeout=30
    )

    if response.status_code == 200:
        result = response.json()
        svc_b = result['calculation']['serviceBreakdown']['B - Oil & Filter Service']

        oil_cost = svc_b.get('oilCost', 0)
        filter_cost = svc_b.get('filterCost', 0)
        parts_cost = svc_b.get('partsCost', 0)

        # Calculate expected oil cost
        expected_oil_cost = gen["expected_gallons"] * oil_price_per_gallon

        # Check if actual matches expected
        oil_match = "✓" if abs(oil_cost - expected_oil_cost) < 1 else "✗"

        print(f"\n{gen['kw']}kW ({gen['range']}):")
        print(f"  Expected: {gen['expected_gallons']} gal × ${oil_price_per_gallon:.2f} = ${expected_oil_cost:,.2f}")
        print(f"  Actual Oil Cost: ${oil_cost:,.2f} {oil_match}")
        print(f"  Filter Cost: ${filter_cost:,.2f}")
        print(f"  Total Parts: ${parts_cost:,.2f}")

    else:
        print(f"\n{gen['kw']}kW - ERROR: {response.status_code}")

    time.sleep(7)  # Rate limiting

print("\n" + "=" * 80)
