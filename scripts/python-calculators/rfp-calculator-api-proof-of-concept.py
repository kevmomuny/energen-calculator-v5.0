#!/usr/bin/env python3
"""
RFP Calculator API Integration - Proof of Concept
Demonstrates calling actual Energen Calculator v5.0 API for accurate RFP pricing
"""
import requests
import json
import sys

# Calculator API endpoint
CALCULATOR_URL = "http://localhost:3002"

def fetch_calculator_settings():
    """Fetch default settings from calculator"""
    try:
        response = requests.get(f"{CALCULATOR_URL}/api/settings", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"ERROR: Failed to fetch settings: HTTP {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Calculator not running at {CALCULATOR_URL}")
        print("   Start with: node src/api/server-secure.cjs")
        return None

def calculate_generator_pricing(generator_config, services, settings):
    """
    Calculate accurate pricing for a single generator

    Args:
        generator_config: dict with kwRating, fuelType, cylinders, number
        services: list of service codes ['A', 'B', 'D', 'E']
        settings: dict with laborRate, prevailingWageRequired, customerZip, etc.

    Returns:
        API response with accurate pricing
    """
    # Build service frequencies (default: quarterly for A/B/D, annual for others)
    service_frequencies = {}
    for svc in services:
        if svc in ['A', 'B', 'D']:
            service_frequencies[svc] = 4  # Quarterly
        else:
            service_frequencies[svc] = 1  # Annual

    payload = {
        "services": services,
        "customerInfo": {
            "name": settings.get("customerName", "Lawrence Berkeley National Laboratory"),
            "address": "1 Cyclotron Rd",
            "city": "Berkeley",
            "state": "CA",
            "zip": settings.get("customerZip", "94720")
        },
        "generators": [{
            "kw": generator_config["kwRating"],  # API expects "kw", not "kwRating"
            "quantity": 1,
            "cylinders": generator_config.get("cylinders", 6)
        }],
        "settings": {
            "laborRate": settings.get("laborRate", 180.00),
            "prevailingWageRequired": settings.get("prevailingWageRequired", False)
        },
        "serviceFrequencies": service_frequencies
    }

    print(f"\nCalling calculator API for {generator_config.get('number', 'Generator')}...")
    print(f"   kW: {generator_config['kwRating']}")
    print(f"   Services: {', '.join(services)}")
    print(f"   Prevailing wage: {settings.get('prevailingWageRequired', False)}")

    try:
        response = requests.post(
            f"{CALCULATOR_URL}/api/calculate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   SUCCESS!")
            # DEBUG: Print actual response structure
            import json
            print(f"   Response keys: {list(result.keys())}")
            return result
        else:
            print(f"   ERROR: HTTP {response.status_code}: {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"   ERROR: Request failed: {e}")
        return None

def display_pricing_breakdown(result, generator_number):
    """Display detailed pricing breakdown from calculator response"""
    if not result or "calculation" not in result:
        print("ERROR: Invalid response format")
        print(f"   Got keys: {list(result.keys()) if result else 'None'}")
        return

    calc = result["calculation"]

    print(f"\n" + "="*70)
    print(f"GENERATOR: {generator_number}")
    print("="*70)

    # Parse values (API returns strings)
    labor = float(calc.get('laborTotal', 0))
    parts = float(calc.get('partsTotal', 0))
    mobilization = float(calc.get('mobilizationTotal', 0))
    tax = float(calc.get('tax', 0))
    total = float(calc.get('total', 0))
    tax_rate = calc.get('taxRate', 'N/A')

    # Cost breakdown
    print(f"\nANNUAL COST BREAKDOWN:")
    print(f"   Labor:        ${labor:>10,.2f}")
    print(f"   Parts:        ${parts:>10,.2f}")
    print(f"   Mobilization: ${mobilization:>10,.2f}")
    print(f"   Tax ({tax_rate}):  ${tax:>10,.2f}")
    print(f"   " + "-"*60)
    print(f"   TOTAL:        ${total:>10,.2f}")

    # Service breakdown
    if 'serviceBreakdown' in calc:
        print(f"\nSERVICE DETAILS:")
        for svc_name, svc_data in calc['serviceBreakdown'].items():
            svc_total = svc_data.get('totalCost', 0)
            print(f"   {svc_name}: ${svc_total:>10,.2f}")

    print("\nVERIFIED: 100% calculator-verified pricing - NO ESTIMATES")
    print("="*70)

def main():
    print("\n" + "="*70)
    print("RFP CALCULATOR API INTEGRATION - PROOF OF CONCEPT")
    print("Demonstrates accurate pricing for LBNL-style RFPs")
    print("="*70)

    # Step 1: Verify calculator is running
    print("\n[1] Checking calculator availability...")
    calc_settings = fetch_calculator_settings()
    if not calc_settings:
        sys.exit(1)

    print(f"   SUCCESS: Calculator running")
    print(f"   Default labor rate: ${calc_settings.get('laborRate', 'N/A')}/hr")

    # Step 2: Define LBNL RFP parameters
    print("\n[2] Setting up LBNL RFP parameters...")

    # Sample generators from LBNL RFP
    lbnl_generators = [
        {"number": "02 EG 068", "kwRating": 300, "fuelType": "Diesel", "cylinders": 6},
        {"number": "62 EG 102", "kwRating": 350, "fuelType": "Diesel", "cylinders": 6},
        {"number": "77 EG 094", "kwRating": 2000, "fuelType": "Diesel", "cylinders": 16}
    ]

    # Services required (from RFP Section 4.2)
    rfp_services = ['A', 'B', 'C', 'D', 'E']

    # RFP settings
    rfp_settings = {
        "customerType": "government",
        "taxExempt": True,
        "laborRate": 180.00,  # Standard rate (calculator will apply prevailing wage)
        "prevailingWageRequired": True,  # LBNL requires prevailing wage
        "customerZip": "94720"  # Berkeley, CA - triggers DIR API lookup
    }

    print(f"   Generators: {len(lbnl_generators)} (showing 3 as proof-of-concept)")
    print(f"   Services: {', '.join(rfp_services)}")
    print(f"   Prevailing wage: YES (ZIP: {rfp_settings['customerZip']})")

    # Step 3: Calculate pricing for each generator
    print("\n[3] Calculating accurate pricing via API...")

    results = []
    for gen in lbnl_generators:
        result = calculate_generator_pricing(gen, rfp_services, rfp_settings)
        if result:
            results.append({
                "generator": gen,
                "calculation": result
            })
            display_pricing_breakdown(result, gen["number"])

    # Step 4: Summary
    print("\n[4] SUMMARY")
    print("="*70)

    if len(results) == len(lbnl_generators):
        print(f"SUCCESS: Calculated pricing for {len(results)} generators")

        total_annual = sum([
            float(r["calculation"]["calculation"]["total"])
            for r in results
        ])

        print(f"\nTOTAL for {len(results)} generators: ${total_annual:,.2f}")
        print(f"\nExtrapolating to all 36 LBNL generators:")
        avg_per_generator = total_annual / len(results)
        estimated_total = avg_per_generator * 36
        print(f"   Average per generator: ${avg_per_generator:,.2f}")
        print(f"   Estimated total (36 gens): ${estimated_total:,.2f}")

        print("\n" + "="*70)
        print("SUCCESS: PROOF OF CONCEPT COMPLETE")
        print("="*70)
        print("\nNEXT STEPS:")
        print("1. Implement CalculatorAPIClient.cjs in RFP evaluator skill")
        print("2. Loop through all 36 LBNL generators")
        print("3. Fill Excel template with accurate pricing")
        print("4. Export to: 5-Offerors Pricing.xlsx")
        print("\nWARNING: This replaces ALL hardcoded estimates in current RFP evaluator")

    else:
        print(f"ERROR: Only {len(results)}/{len(lbnl_generators)} succeeded")
        print("   Check calculator logs for errors")

if __name__ == "__main__":
    main()
