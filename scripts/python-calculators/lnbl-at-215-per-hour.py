#!/usr/bin/env python3
"""
LNBL RFP - At $215/hour (your prevailing wage estimate)
Standard rate: $180/hour
Prevailing wage premium: +$35/hour
New rate: $215/hour
"""

import requests
import json

generators = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
]

# Settings with $215/hour rate (prevailing wage)
settings = {
    "laborRate": 215.00,
    "mobilizationRate": 215.00,
    "oilPrice": 16.00,
    "oilMarkup": 1.5
}

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
    "taxRate": 0,  # Tax exempt
    "facilityType": "government",
    "settings": settings,
    "serviceDFluids": {
        "oil": True,
        "fuel": True,
        "coolant": True
    },
    "serviceFrequencies": {
        "A": 1,  # Annual
        "B": 1,  # Annual
        "D": 1,  # Annual
        "E": 1   # Annual
    }
}

print("=" * 80)
print("LNBL RFP - PREVAILING WAGE CALCULATION @ $215/HOUR")
print("=" * 80)
print(f"Generators: {len(generators)}")
print(f"Services: Annual PM (A+B+D+E)")
print(f"")
print(f"Standard Labor Rate:                   $180.00/hour")
print(f"Prevailing Wage Premium:               + $35.00/hour")
print(f"TOTAL LABOR RATE (Prevailing Wage):   $215.00/hour")
print("=" * 80)

response = requests.post(
    "http://localhost:3002/api/calculate",
    json=payload,
    headers={"Content-Type": "application/json"},
    timeout=60
)

if response.status_code == 200:
    result = response.json()
    calc = result['calculation']

    subtotal = float(calc['subtotal'])
    labor = float(calc.get('laborTotal', 0))
    parts = float(calc.get('partsTotal', 0))
    mobilization = float(calc.get('mobilizationTotal', 0))

    print("\nRESULTS:")
    print("=" * 80)
    print(f"Labor @ $215/hour:             ${labor:>12,.2f}")
    print(f"Parts & Materials:             ${parts:>12,.2f}")
    print(f"Travel/Mobilization:           ${mobilization:>12,.2f}")
    print("-" * 80)
    print(f"TOTAL ANNUAL COST:             ${subtotal:>12,.2f}")
    print("=" * 80)

    # Calculate labor hours for verification
    labor_hours = labor / 215.00
    standard_portion = labor_hours * 180.00
    prevailing_premium = labor_hours * 35.00

    print("\nLABOR BREAKDOWN:")
    print("-" * 80)
    print(f"Total Labor Hours:             {labor_hours:>12,.1f}")
    print(f"Standard Rate Portion:         ${standard_portion:>12,.2f} (@ $180/hour)")
    print(f"Prevailing Wage Premium:       ${prevailing_premium:>12,.2f} (+ $35/hour)")
    print(f"Total Labor Billing:           ${labor:>12,.2f}")
    print("=" * 80)

    # Service breakdown
    services = calc.get('serviceBreakdown', {})
    print("\nSERVICE BREAKDOWN:")
    print("-" * 80)
    for svc_name, svc_data in services.items():
        total = svc_data.get('totalCost', 0)
        labor_cost = svc_data.get('laborCost', 0)
        parts_cost = svc_data.get('partsCost', 0)
        print(f"{svc_name:35s} Labor: ${labor_cost:>10,.2f}  Parts: ${parts_cost:>10,.2f}  Total: ${total:>10,.2f}")

    print("=" * 80)

    # Comparison to original bid
    original_total = 214018.13
    difference = subtotal - original_total
    pct_change = (difference / original_total) * 100

    print("\nCOMPARISON TO ORIGINAL BID:")
    print("-" * 80)
    print(f"Original Bid (@ $180/hour):    ${original_total:>12,.2f}")
    print(f"New Bid (@ $215/hour):         ${subtotal:>12,.2f}")
    print(f"Difference:                    ${difference:>12,.2f} ({pct_change:+.1f}%)")
    print("=" * 80)

    # Cost per generator
    per_generator = subtotal / len(generators)
    print("\nPER GENERATOR:")
    print("-" * 80)
    print(f"Annual Cost per Unit:          ${per_generator:>12,.2f}")
    print(f"Monthly Cost per Unit:         ${per_generator/12:>12,.2f}")
    print("=" * 80)

    # Save
    with open("lnbl-at-215-per-hour-result.json", 'w') as f:
        json.dump(result, f, indent=2)

    print("\nSaved to: lnbl-at-215-per-hour-result.json")

else:
    print(f"\nERROR {response.status_code}: {response.text}")
