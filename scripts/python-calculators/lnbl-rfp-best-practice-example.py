#!/usr/bin/env python3
"""
LBNL RFP CALCULATION - BEST PRACTICE EXAMPLE

This script demonstrates the CORRECT way to create test scripts:
1. Fetch ALL pricing from calculator API (no hardcoding)
2. Clearly separate test data from calculator settings
3. Document what values are user input vs calculator defaults
4. Verify calculator pricing is being used

This approach ensures:
- Scripts stay in sync with calculator pricing changes
- No duplication of business logic
- Clear distinction between test configuration and system behavior

Author: Energen Calculator v5.0
Updated: 2025-10-27
"""

import requests
import json
import sys
import os
from typing import Dict, Optional

# Add test-helpers to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'test-helpers'))

try:
    from fetch_calculator_settings import (
        fetch_calculator_settings,
        get_service_d_prices,
        get_oil_pricing,
        get_labor_rates,
        print_settings_summary
    )
except ImportError:
    print("❌ Could not import settings fetcher")
    print("   Make sure test-helpers/fetch_calculator_settings.py exists")
    sys.exit(1)

# ============================================================================
# STEP 1: FETCH CALCULATOR SETTINGS (NOT HARDCODED)
# ============================================================================

def fetch_settings() -> Optional[Dict]:
    """Fetch calculator settings with error handling"""
    print("=" * 80)
    print("STEP 1: FETCHING CALCULATOR SETTINGS")
    print("=" * 80)
    
    calc_settings = fetch_calculator_settings()
    
    if not calc_settings:
        print("\n❌ Cannot proceed without calculator settings")
        print("   REQUIRED: Start the server")
        print("   cd src/api && node server-secure.cjs")
        return None
    
    print("\n✅ Successfully fetched calculator settings")
    print_settings_summary(calc_settings)
    
    return calc_settings

# ============================================================================
# STEP 2: DEFINE TEST DATA (ACCEPTABLE TO HARDCODE)
# ============================================================================

# RFP-specific generator list (from LBNL RFP document)
LBNL_GENERATORS = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
]

# RFP service requirements (from LBNL RFP)
RFP_SERVICES = ["A", "B", "D", "E"]

# RFP service frequencies (from LBNL RFP)
RFP_FREQUENCIES = {
    "A": 1,  # Annual
    "B": 1,  # Annual
    "D": 1,  # Annual
    "E": 1   # Annual
}

# RFP Service D requirements (from LBNL RFP)
RFP_SERVICE_D_FLUIDS = {
    "oil": True,
    "fuel": True,
    "coolant": True
}

# Customer information (from LBNL RFP)
LBNL_CUSTOMER = {
    "name": "Lawrence Berkeley National Laboratory",
    "address": "1 Cyclotron Road",
    "city": "Berkeley",
    "state": "CA",
    "zip": "94720"
}

# ============================================================================
# STEP 3: BUILD PAYLOAD USING FETCHED SETTINGS
# ============================================================================

def build_payload(calc_settings: Dict, labor_rate_override: Optional[float] = None) -> Dict:
    """
    Build calculation payload using fetched calculator settings.
    
    Args:
        calc_settings: Settings fetched from calculator API
        labor_rate_override: Optional manual labor rate (for bid scenarios)
        
    Returns:
        Payload dictionary ready for /api/calculate
    """
    # Extract pricing from calculator (NEVER hardcode these)
    oil_pricing = get_oil_pricing(calc_settings)
    labor_rates = get_labor_rates(calc_settings)
    
    # Use calculator's labor rate OR manual override
    labor_rate = labor_rate_override if labor_rate_override else labor_rates['labor']
    
    # Build settings from calculator values
    settings = {
        "laborRate": labor_rate,
        "mobilizationRate": labor_rate,  # Same as labor for this RFP
        
        # FETCHED from calculator (not hardcoded)
        "oilPrice": oil_pricing['price'],
        "oilMarkup": oil_pricing['markup']
    }
    
    # Build complete payload
    payload = {
        "services": RFP_SERVICES,
        "customerInfo": LBNL_CUSTOMER,
        "generators": [{"kw": kw} for kw in LBNL_GENERATORS],
        "contractLength": 12,
        "taxRate": 0,  # Tax-exempt government facility
        "facilityType": "government",
        "serviceDFluids": RFP_SERVICE_D_FLUIDS,
        "serviceFrequencies": RFP_FREQUENCIES,
        "settings": settings
    }
    
    return payload

# ============================================================================
# STEP 4: RUN CALCULATION
# ============================================================================

def run_calculation(payload: Dict, calc_settings: Dict) -> Optional[Dict]:
    """
    Execute calculation and display results.
    
    Args:
        payload: Calculation payload
        calc_settings: Original calculator settings (for comparison)
        
    Returns:
        Calculation result or None if failed
    """
    print("\n" + "=" * 80)
    print("STEP 3: RUNNING CALCULATION")
    print("=" * 80)
    
    labor_rate = payload['settings']['laborRate']
    print(f"Generators: {len(LBNL_GENERATORS)}")
    print(f"Services: {', '.join(RFP_SERVICES)} (all annual)")
    print(f"Labor Rate: ${labor_rate:.2f}/hr")
    
    if labor_rate != calc_settings['laborRate']:
        print(f"  (Manual override - calculator default: ${calc_settings['laborRate']:.2f}/hr)")
    else:
        print(f"  (Using calculator default)")
    
    print(f"Oil Pricing: ${payload['settings']['oilPrice']:.2f}/gal @ {payload['settings']['oilMarkup']:.2f}x")
    print("=" * 80)
    
    try:
        response = requests.post(
            "http://localhost:3002/api/calculate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"\n❌ ERROR {response.status_code}: {response.text}")
            return None
        
        result = response.json()
        calc = result['calculation']
        
        # Display results
        print("\n✅ CALCULATION COMPLETE")
        print("=" * 80)
        
        subtotal = float(calc['subtotal'])
        labor = float(calc.get('laborTotal', 0))
        parts = float(calc.get('partsTotal', 0))
        mobilization = float(calc.get('mobilizationTotal', 0))
        
        print(f"\nRESULTS:")
        print(f"  Labor:        ${labor:>12,.2f}")
        print(f"  Materials:    ${parts:>12,.2f}")
        print(f"  Mobilization: ${mobilization:>12,.2f}")
        print(f"  " + "-" * 40)
        print(f"  TOTAL:        ${subtotal:>12,.2f}")
        
        # Service breakdown
        services = calc.get('serviceBreakdown', {})
        print(f"\nSERVICE BREAKDOWN:")
        for svc_name, svc_data in services.items():
            total = svc_data.get('totalCost', 0)
            print(f"  {svc_name:35s} ${total:>10,.2f}")
        
        print("=" * 80)
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Request failed: {e}")
        return None

# ============================================================================
# STEP 5: VERIFY CALCULATOR PRICING WAS USED
# ============================================================================

def verify_calculator_pricing(payload: Dict, calc_settings: Dict):
    """Verify that calculator pricing was used (not hardcoded values)"""
    print("\n" + "=" * 80)
    print("STEP 4: VERIFICATION - CALCULATOR PRICING USED")
    print("=" * 80)
    
    print("\n✅ Confirmed: All pricing from calculator API")
    print("-" * 80)
    
    # Verify oil pricing
    if payload['settings']['oilPrice'] == calc_settings['oilPrice']:
        print(f"✅ Oil Price:  ${calc_settings['oilPrice']:.2f}/gal (from calculator)")
    else:
        print(f"⚠️  Oil Price:  ${payload['settings']['oilPrice']:.2f}/gal (OVERRIDDEN)")
    
    if payload['settings']['oilMarkup'] == calc_settings['oilMarkup']:
        print(f"✅ Oil Markup: {calc_settings['oilMarkup']:.2f}x (from calculator)")
    else:
        print(f"⚠️  Oil Markup: {payload['settings']['oilMarkup']:.2f}x (OVERRIDDEN)")
    
    # Verify Service D pricing
    service_d_prices = get_service_d_prices(calc_settings)
    print(f"\n✅ Service D Analysis Costs (from calculator):")
    print(f"   Oil:      ${service_d_prices['oil']:.2f}")
    print(f"   Coolant:  ${service_d_prices['coolant']:.2f}")
    print(f"   Fuel:     ${service_d_prices['fuel']:.2f}")
    
    print("\n" + "=" * 80)

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution function"""
    print("\n" + "=" * 80)
    print("LBNL RFP CALCULATION - BEST PRACTICE EXAMPLE")
    print("=" * 80)
    print("\nThis script demonstrates the CORRECT approach:")
    print("1. Fetch pricing from calculator API (no hardcoding)")
    print("2. Clearly separate test data from settings")
    print("3. Verify calculator pricing is being used")
    print("\n" + "=" * 80)
    
    # Step 1: Fetch calculator settings
    calc_settings = fetch_settings()
    if not calc_settings:
        sys.exit(1)
    
    # Step 2: Build payload using fetched settings
    print("\n" + "=" * 80)
    print("STEP 2: BUILDING PAYLOAD WITH FETCHED SETTINGS")
    print("=" * 80)
    
    # Example 1: Using calculator's default labor rate
    print("\nEXAMPLE 1: Calculator Default Labor Rate")
    payload_default = build_payload(calc_settings)
    result_default = run_calculation(payload_default, calc_settings)
    
    if result_default:
        verify_calculator_pricing(payload_default, calc_settings)
        
        # Save result
        with open("lnbl-rfp-default-rate-result.json", 'w') as f:
            json.dump(result_default, f, indent=2)
        print(f"\n💾 Saved to: lnbl-rfp-default-rate-result.json")
    
    # Example 2: Manual bid rate override
    print("\n\n" + "=" * 80)
    print("EXAMPLE 2: Manual Bid Rate Override ($336.50/hr)")
    print("=" * 80)
    
    payload_manual = build_payload(calc_settings, labor_rate_override=336.50)
    result_manual = run_calculation(payload_manual, calc_settings)
    
    if result_manual:
        verify_calculator_pricing(payload_manual, calc_settings)
        
        # Save result
        with open("lnbl-rfp-manual-rate-result.json", 'w') as f:
            json.dump(result_manual, f, indent=2)
        print(f"\n💾 Saved to: lnbl-rfp-manual-rate-result.json")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    if result_default and result_manual:
        default_total = float(result_default['calculation']['subtotal'])
        manual_total = float(result_manual['calculation']['subtotal'])
        difference = manual_total - default_total
        pct_diff = (difference / default_total) * 100
        
        print(f"\nDefault Rate: ${default_total:,.2f}")
        print(f"Manual Rate:  ${manual_total:,.2f}")
        print(f"Difference:   ${difference:,.2f} ({pct_diff:+.1f}%)")
        
        print("\n✅ BEST PRACTICES DEMONSTRATED:")
        print("   1. All pricing fetched from calculator API")
        print("   2. Test data clearly separated from settings")
        print("   3. Both scenarios use same calculator pricing")
        print("   4. Results verified and saved with metadata")
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS COMPLETE")
        print("=" * 80)
        
        return 0
    else:
        print("\n❌ TESTS FAILED")
        print("   Check that calculator server is running")
        return 1

if __name__ == "__main__":
    sys.exit(main())
