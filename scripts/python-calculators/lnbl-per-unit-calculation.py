#!/usr/bin/env python3
"""
LNBL RFP - Per-Unit Calculation
Calculate each generator individually to get proper per-unit pricing by kW rating
"""

import requests
import json
import pandas as pd
import time

# Generator data with Asset IDs and kW ratings
generators_data = [
    {"assetId": "02 EG 068", "kwRating": 300, "manufacturer": "Cummins"},
    {"assetId": "30 EG 114", "kwRating": 350, "manufacturer": "Kohler"},
    {"assetId": "33U EG 113", "kwRating": 350, "manufacturer": "Cummins"},
    {"assetId": "37 EG 111", "kwRating": 150, "manufacturer": "CAT"},
    {"assetId": "37 EG 120", "kwRating": 300, "manufacturer": "Kohler"},
    {"assetId": "48 EG 100", "kwRating": 230, "manufacturer": "Cummins"},
    {"assetId": "50A EG 101", "kwRating": 230, "manufacturer": "Cummins"},
    {"assetId": "55 EG 069", "kwRating": 230, "manufacturer": "Cummins"},
    {"assetId": "59 EG 112", "kwRating": 1300, "manufacturer": "Kohler"},
    {"assetId": "62 EG 102", "kwRating": 175, "manufacturer": "Cummins"},
    {"assetId": "62B EG 081", "kwRating": 20, "manufacturer": "Cummins"},
    {"assetId": "64 EG 079", "kwRating": 150, "manufacturer": "Cummins"},
    {"assetId": "66 EG 109", "kwRating": 250, "manufacturer": "Cummins"},
    {"assetId": "67A EG 001", "kwRating": 400, "manufacturer": "Kohler"},
    {"assetId": "69 EG 011", "kwRating": 31, "manufacturer": "Kohler"},
    {"assetId": "70 EG 106", "kwRating": 250, "manufacturer": "Cummins"},
    {"assetId": "70A EG 018", "kwRating": 550, "manufacturer": "CAT"},
    {"assetId": "72 EG 098", "kwRating": 125, "manufacturer": "Stamford"},
    {"assetId": "75 EG 089", "kwRating": 80, "manufacturer": "Cummins"},
    {"assetId": "76 EG 116", "kwRating": 200, "manufacturer": "Cummins"},
    {"assetId": "76 EG 117", "kwRating": 200, "manufacturer": "Cummins"},
    {"assetId": "76 EG 122", "kwRating": 275, "manufacturer": "Cummins"},
    {"assetId": "76 EG 123", "kwRating": 275, "manufacturer": "Cummins"},
    {"assetId": "76 EG 124", "kwRating": 275, "manufacturer": "Cummins"},
    {"assetId": "77 EG 094", "kwRating": 125, "manufacturer": "Cummins"},
    {"assetId": "84 EG 112", "kwRating": 400, "manufacturer": "Cummins"},
    {"assetId": "84B EG 099", "kwRating": 500, "manufacturer": "Cummins"},
    {"assetId": "85 EG 096", "kwRating": 350, "manufacturer": "Cummins"},
    {"assetId": "88 EG 090", "kwRating": 180, "manufacturer": "Katolight"},
    {"assetId": "91UEG 001", "kwRating": 600, "manufacturer": "CAT"},
    {"assetId": "92 EG 125", "kwRating": 2000, "manufacturer": "Cummins"},
    {"assetId": "SW MC 001", "kwRating": 55, "manufacturer": "Sullivan-Palatek"},
    {"assetId": "SW MC 002", "kwRating": 99, "manufacturer": "Sullivan-Palatek"},
    {"assetId": "SW MC 003", "kwRating": 99, "manufacturer": "Sullivan-Palatek"}
]

print(f"Calculating pricing for {len(generators_data)} generators individually...")
print("=" * 80)

results = []
total_cost = 0

for idx, gen in enumerate(generators_data, 1):
    # Calculate each generator individually
    payload = {
        "services": ["A", "B", "D", "E"],
        "customerInfo": {
            "name": "Lawrence Berkeley National Laboratory",
            "address": "1 Cyclotron Road",
            "city": "Berkeley",
            "state": "CA",
            "zip": "94720"
        },
        "generators": [{"kw": gen["kwRating"]}],
        "contractLength": 12,
        "taxRate": 0,
        "facilityType": "government",
        "serviceDFluids": {
            "oil": True,
            "fuel": True,
            "coolant": True
        }
    }

    response = requests.post(
        "http://localhost:3002/api/calculate",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30
    )

    if response.status_code == 200:
        result = response.json()
        calc = result['calculation']
        unit_total = float(calc['subtotal'])
        total_cost += unit_total

        # Extract service costs
        services = calc.get('serviceBreakdown', {})
        service_a = services.get('A - Comprehensive Inspection', {}).get('totalCost', 0)
        service_b = services.get('B - Oil & Filter Service', {}).get('totalCost', 0)
        service_d = services.get('D - Oil & Fuel Analysis', {}).get('totalCost', 0)
        service_e = services.get('E - Load Bank Testing', {}).get('totalCost', 0)

        results.append({
            'assetId': gen['assetId'],
            'manufacturer': gen['manufacturer'],
            'kwRating': gen['kwRating'],
            'serviceA': service_a,
            'serviceB': service_b,
            'serviceD': service_d,
            'serviceE': service_e,
            'totalAnnual': unit_total
        })

        print(f"{idx:2d}. {gen['assetId']:15s} {gen['kwRating']:4d}kW  ${unit_total:>10,.2f}")
    else:
        print(f"ERROR calculating {gen['assetId']}: {response.status_code}")

    # Add delay to avoid rate limiting (10 requests per minute = 6 second intervals)
    time.sleep(7)

print("=" * 80)
print(f"TOTAL ANNUAL COST: ${total_cost:,.2f}")
print("=" * 80)

# Save results to JSON
output_file = "G:/Shared drives/Energen Ops/2-Sales & Marketing/1-Sales/Bids/LNBL-Whole-Facility-RFP/per-unit-pricing.json"
with open(output_file, 'w') as f:
    json.dump(results, f, indent=2)

# Create DataFrame and save to CSV
df = pd.DataFrame(results)
csv_file = "G:/Shared drives/Energen Ops/2-Sales & Marketing/1-Sales/Bids/LNBL-Whole-Facility-RFP/per-unit-pricing.csv"
df.to_csv(csv_file, index=False)

print(f"\nResults saved to:")
print(f"  - per-unit-pricing.json")
print(f"  - per-unit-pricing.csv")
