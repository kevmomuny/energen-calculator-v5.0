#!/usr/bin/env python3
"""
LNBL RFP - MANUAL BID RATE CALCULATION (REFACTORED)

This script uses $336.50/hour as MANUAL BID RATE (strategic pricing decision).
Pricing values (oil, coolant, Service D costs) are fetched from calculator API.

IMPORTANT: This does NOT test the prevailing wage system.
It tests a manual bid rate configuration.

For actual prevailing wage testing, see: test-actual-prevailing-wage.py
"""

import requests
import json
import sys
import os

# Add test-helpers to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'test-helpers'))

try:
    from fetch_calculator_settings import fetch_calculator_settings, print_settings_summary
except ImportError:
    print("❌ Could not import settings fetcher")
    print("   Make sure test-helpers/fetch_calculator_settings.py exists")
    sys.exit(1)

# Fetch calculator settings
print("=" * 80)
print("FETCHING CALCULATOR SETTINGS")
print("=" * 80)

calc_settings = fetch_calculator_settings()

if not calc_settings:
    print("\n❌ Cannot proceed without calculator settings")
    print("   Start the server: node src/api/server-secure.cjs")
    sys.exit(1)

print("\n✅ Settings fetched from calculator API")
print(f"   Oil Price: ${calc_settings['oilPrice']:.2f}/gal @ {calc_settings['oilMarkup']}x markup")
print(f"   Service D: Oil=${calc_settings['serviceD']['oilAnalysisCost']:.2f}, "
      f"Coolant=${calc_settings['serviceD']['coolantAnalysisCost']:.2f}, "
      f"Fuel=${calc_settings['serviceD']['fuelAnalysisCost']:.2f}")

# Test data from LBNL RFP (34 generators)
generators = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
]

# Build settings using FETCHED calculator values + manual bid rate override
settings = {
    # MANUAL BID RATE (user decision - overrides calculator default)
    "laborRate": 336.50,
    "mobilizationRate": 336.50,
    
    # FETCHED from calculator (not hardcoded)
    "oilPrice": calc_settings['oilPrice'],
    "oilMarkup": calc_settings['oilMarkup'],
    
    # Note: prevailingWage object is NOT USED by the system
    # System only reads prevailingWageRequired flag and fetches its own data
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

print("\n" + "=" * 80)
print("LNBL RFP - MANUAL BID RATE CALCULATION")
print("=" * 80)
print(f"Generators: {len(generators)}")
print(f"Services: Annual PM (A+B+D+E)")
print(f"")
print(f"Using MANUAL BID RATE: $336.50/hr")
print(f"(Calculator standard rate: ${calc_settings['laborRate']:.2f}/hr)")
print(f"(Calculated prevailing wage: $241.50/hr)")
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
    print(f"Labor @ $336.50/hour (MANUAL): ${labor:>12,.2f}")
    print(f"Parts & Materials:             ${parts:>12,.2f}")
    print(f"Travel/Mobilization:           ${mobilization:>12,.2f}")
    print("-" * 80)
    print(f"TOTAL ANNUAL COST:             ${subtotal:>12,.2f}")
    print("=" * 80)

    # Calculate labor hours and comparison
    labor_hours = labor / 336.50
    
    # Calculate what cost would be at different rates
    standard_labor_cost = labor_hours * calc_settings['laborRate']  # From calculator
    calculated_pw_cost = labor_hours * 241.50  # Calculated prevailing wage
    manual_premium = labor - calculated_pw_cost

    print("\nLABOR BREAKDOWN:")
    print("-" * 80)
    print(f"Total Labor Hours:                    {labor_hours:>12,.1f}")
    print(f"")
    print(f"At Standard Rate (${calc_settings['laborRate']:.2f}/hr):  ${standard_labor_cost:>12,.2f}")
    print(f"At Calculated PW ($241.50/hr):        ${calculated_pw_cost:>12,.2f}")
    print(f"At Manual Bid ($336.50/hr):           ${labor:>12,.2f}")
    print(f"")
    print(f"Manual Bid Premium over PW:           ${manual_premium:>12,.2f}")
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
    print(f"Original Bid (@ $180/hour):           ${original_total:>12,.2f}")
    print(f"Calculated Prevailing (@ $241.50/hr): ${calculated_pw_cost + parts + mobilization:>12,.2f}")
    print(f"Manual Bid Rate (@ $336.50/hour):     ${subtotal:>12,.2f}")
    print(f"Difference (Manual vs Original):      ${difference:>12,.2f} ({pct_change:+.1f}%)")
    print("=" * 80)

    # Verify calculator pricing was used
    print("\n✅ VERIFICATION: Calculator pricing used")
    print("-" * 80)
    print(f"Oil Price from calculator:    ${calc_settings['oilPrice']:.2f}/gal")
    print(f"Oil Markup from calculator:   {calc_settings['oilMarkup']:.2f}x")
    print(f"Service D costs from calculator:")
    print(f"  Oil Analysis:    ${calc_settings['serviceD']['oilAnalysisCost']:.2f}")
    print(f"  Coolant Analysis: ${calc_settings['serviceD']['coolantAnalysisCost']:.2f}")
    print(f"  Fuel Analysis:    ${calc_settings['serviceD']['fuelAnalysisCost']:.2f}")
    print("=" * 80)

    # Save
    with open("lnbl-corrected-prevailing-wage-result.json", 'w') as f:
        # Add metadata about settings source
        output = {
            "metadata": {
                "settingsSource": "calculator API",
                "oilPriceUsed": calc_settings['oilPrice'],
                "oilMarkupUsed": calc_settings['oilMarkup'],
                "manualBidRate": 336.50,
                "calculatorStandardRate": calc_settings['laborRate']
            },
            "calculation": result
        }
        json.dump(output, f, indent=2)

    print("\n💾 Saved to: lnbl-corrected-prevailing-wage-result.json")

else:
    print(f"\n❌ ERROR {response.status_code}: {response.text}")
    sys.exit(1)

print("\n" + "=" * 80)
print("✅ CALCULATION COMPLETE")
print("=" * 80)
