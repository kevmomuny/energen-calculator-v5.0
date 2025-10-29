#!/usr/bin/env python3
"""
LNBL RFP - WITH PREVAILING WAGE
Government contract requires prevailing wage rates
"""

import requests
import json

generators = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
]

# Settings with prevailing wage ENABLED
settings = {
    "prevailingWage": {
        "enabled": True,
        "classification": "group8",  # Operating Engineers
        "zone": "zone3",  # Central Valley (includes Berkeley area)
        "electricianJourneyman": 75.00,
        "electricianForeman": 85.00
    }
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
print("LNBL RFP CALCULATION - WITH PREVAILING WAGE")
print("=" * 80)
print(f"Generators: {len(generators)}")
print(f"Services: Annual PM (A+B+D+E)")
print(f"Prevailing Wage: ENABLED (Operating Engineers, Zone 3)")
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
    print(f"Labor (Prevailing Wage):       ${labor:>12,.2f}")
    print(f"Parts & Materials:             ${parts:>12,.2f}")
    print(f"Travel/Mobilization:           ${mobilization:>12,.2f}")
    print("-" * 80)
    print(f"TOTAL ANNUAL COST:             ${subtotal:>12,.2f}")
    print("=" * 80)

    # Service breakdown
    services = calc.get('serviceBreakdown', {})
    print("\nSERVICE BREAKDOWN:")
    print("-" * 80)
    for svc_name, svc_data in services.items():
        total = svc_data.get('totalCost', 0)
        freq = svc_data.get('frequency', 1)
        labor_cost = svc_data.get('laborCost', 0)
        parts_cost = svc_data.get('partsCost', 0)
        print(f"{svc_name:35s} Labor: ${labor_cost:>10,.2f}  Parts: ${parts_cost:>10,.2f}  Total: ${total:>10,.2f}")

    print("=" * 80)

    # Save
    with open("G:/Shared drives/Energen Ops/2-Sales & Marketing/1-Sales/Bids/LNBL-Whole-Facility-RFP/with-prevailing-wage.json", 'w') as f:
        json.dump(result, f, indent=2)

    print("\nSaved to: with-prevailing-wage.json")

else:
    print(f"\nERROR {response.status_code}: {response.text}")
