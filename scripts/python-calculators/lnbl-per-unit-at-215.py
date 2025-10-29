#!/usr/bin/env python3
"""
LNBL Per-Unit Calculation at $215/hour (Prevailing Wage)
Calculate each generator individually by kW rating
"""

import requests
import json
import time

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

print("=" * 100)
print("LNBL RFP - PER-UNIT BREAKDOWN @ $215/HOUR (PREVAILING WAGE)")
print("=" * 100)
print(f"Total Generators: {len(generators)}")
print(f"Labor Rate: $215/hour (Standard $180 + Prevailing Wage Premium $35)")
print("=" * 100)

results = []
total_cost = 0
total_labor = 0
total_parts = 0
total_mobilization = 0

print(f"\n{'#':<4} {'kW':<6} {'Service A':<12} {'Service B':<12} {'Service D':<12} {'Service E':<12} {'Total':<12}")
print("-" * 100)

for idx, kw in enumerate(generators, 1):
    payload = {
        "services": ["A", "B", "D", "E"],
        "customerInfo": {
            "name": "Lawrence Berkeley National Laboratory",
            "city": "Berkeley",
            "state": "CA",
            "zip": "94720"
        },
        "generators": [{"kw": kw}],
        "contractLength": 12,
        "taxRate": 0,
        "facilityType": "government",
        "settings": settings,
        "serviceDFluids": {
            "oil": True,
            "fuel": True,
            "coolant": True
        },
        "serviceFrequencies": {
            "A": 1,
            "B": 1,
            "D": 1,
            "E": 1
        }
    }

    try:
        response = requests.post(
            "http://localhost:3002/api/calculate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            calc = result['calculation']
            services = calc.get('serviceBreakdown', {})

            service_a = services.get('A - Comprehensive Inspection', {}).get('totalCost', 0)
            service_b = services.get('B - Oil & Filter Service', {}).get('totalCost', 0)
            service_d = services.get('D - Oil & Fuel Analysis', {}).get('totalCost', 0)
            service_e = services.get('E - Load Bank Testing', {}).get('totalCost', 0)

            unit_total = float(calc['subtotal'])
            unit_labor = float(calc.get('laborTotal', 0))
            unit_parts = float(calc.get('partsTotal', 0))
            unit_mobilization = float(calc.get('mobilizationTotal', 0))

            results.append({
                'unit': idx,
                'kw': kw,
                'serviceA': service_a,
                'serviceB': service_b,
                'serviceD': service_d,
                'serviceE': service_e,
                'total': unit_total,
                'labor': unit_labor,
                'parts': unit_parts,
                'mobilization': unit_mobilization
            })

            total_cost += unit_total
            total_labor += unit_labor
            total_parts += unit_parts
            total_mobilization += unit_mobilization

            print(f"{idx:<4} {kw:<6} ${service_a:>10,.2f} ${service_b:>10,.2f} ${service_d:>10,.2f} ${service_e:>10,.2f} ${unit_total:>10,.2f}")

        else:
            print(f"{idx:<4} {kw:<6} ERROR: {response.status_code}")

    except Exception as e:
        print(f"{idx:<4} {kw:<6} ERROR: {str(e)}")

    # Rate limiting: 10 requests per minute
    time.sleep(7)

print("=" * 100)
print(f"{'TOTAL':<17} ${sum(r['serviceA'] for r in results):>10,.2f} ${sum(r['serviceB'] for r in results):>10,.2f} ${sum(r['serviceD'] for r in results):>10,.2f} ${sum(r['serviceE'] for r in results):>10,.2f} ${total_cost:>10,.2f}")
print("=" * 100)

print("\n" + "=" * 100)
print("COST SUMMARY")
print("=" * 100)
print(f"Total Labor:                ${total_labor:>12,.2f}")
print(f"Total Parts & Materials:    ${total_parts:>12,.2f}")
print(f"Total Mobilization:         ${total_mobilization:>12,.2f}")
print("-" * 100)
print(f"TOTAL ANNUAL COST:          ${total_cost:>12,.2f}")
print("=" * 100)

# Show range
if results:
    min_cost = min(r['total'] for r in results)
    max_cost = max(r['total'] for r in results)
    min_unit = next(r for r in results if r['total'] == min_cost)
    max_unit = next(r for r in results if r['total'] == max_cost)

    print("\nCOST RANGE:")
    print("-" * 100)
    print(f"Smallest Unit: #{min_unit['unit']} ({min_unit['kw']}kW) = ${min_cost:,.2f}/year")
    print(f"Largest Unit:  #{max_unit['unit']} ({max_unit['kw']}kW) = ${max_cost:,.2f}/year")
    print(f"Range: ${max_cost - min_cost:,.2f}")
    print("=" * 100)

# Save detailed results
with open("lnbl-per-unit-at-215-detailed.json", 'w') as f:
    json.dump(results, f, indent=2)

print("\nSaved to: lnbl-per-unit-at-215-detailed.json")
