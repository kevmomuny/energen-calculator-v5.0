#!/usr/bin/env python3
"""
ANR-6-2025 Quote Generator
Reads Excel equipment list and generates CPQ quote payloads for all generators
"""

import pandas as pd
import json
import re
from pathlib import Path

# Configuration
EXCEL_PATH = "Request for Proposal No. ANR-6-2025 Genertor Services/4-Equipment List 10-1-2025.xlsx"
OUTPUT_DIR = "data/quotes/ANR-6-2025"
CUSTOMER_ACCOUNT_ID = "6712770000003657470"
SITE_DISTANCE = 49
SERVER_URL = "http://localhost:3002"

def clean_kw_value(val):
    """Convert various kW formats to numeric kW value"""
    if pd.isna(val):
        return 0

    val_str = str(val).strip().upper()

    # Handle HP (horsepower) - convert to kW (1 HP = 0.746 kW)
    if 'HP' in val_str:
        hp = float(val_str.replace('HP', '').strip())
        return round(hp * 0.746, 1)

    # Handle MW (megawatts) - convert to kW
    if 'MW' in val_str:
        mw = float(val_str.replace('MW', '').strip())
        return mw * 1000

    # Handle kW/KW/eKW - extract just numbers
    if 'KW' in val_str or 'EKW' in val_str:
        kw_str = re.sub(r'[^0-9.]', '', val_str)
        return float(kw_str) if kw_str else 0

    # Try to parse as number
    try:
        return float(val_str)
    except:
        return 0

def get_kw_range(kw):
    """Map kW value to pricing range"""
    if kw <= 14:
        return "2-14"
    elif kw <= 30:
        return "15-30"
    elif kw <= 150:
        return "35-150"
    elif kw <= 250:
        return "151-250"
    elif kw <= 400:
        return "251-400"
    elif kw <= 500:
        return "401-500"
    elif kw <= 670:
        return "501-670"
    elif kw <= 1050:
        return "671-1050"
    elif kw <= 1500:
        return "1051-1500"
    else:
        return "1501+"

def create_quote_payload(row, unit_number):
    """Create a calculator-compatible quote payload"""

    building = row['Building/Asset']
    manufacturer = row['Manufacturer']
    model = row['Unit Model Number']
    serial = row['Unit Serial Number']
    kw = row['kW_numeric']
    kw_range = row['kw_range']

    payload = {
        "customer": {
            "zoho_account_id": CUSTOMER_ACCOUNT_ID,
            "companyName": "California Franchise Tax Board",
            "contactName": "Colleen Schwartz",
            "email": "Colleen.Schwartz@dgs.ca.gov",
            "phone": "",
            "address": "",
            "city": "Rancho Cordova",
            "state": "CA",
            "zip": ""
        },
        "quoteData": {
            "metadata": {
                "quoteNumber": f"ANR-6-2025-Unit-{unit_number:02d}",
                "projectName": f"Annual PM Service - {building}",
                "rfpNumber": "ANR-6-2025"
            },
            "generators": [
                {
                    "kw": kw,
                    "kwRating": kw,
                    "kwRange": kw_range,
                    "model": str(model) if not pd.isna(model) else "Unknown",
                    "serialNumber": str(serial) if not pd.isna(serial) else "",
                    "manufacturer": str(manufacturer) if not pd.isna(manufacturer) else "",
                    "building": str(building),
                    "fuelType": "Diesel",
                    "cylinders": None,
                    "injectorType": None
                }
            ],
            "calculation": {
                "distance": SITE_DISTANCE,
                "siteDistance": SITE_DISTANCE,
                "mileageRate": 0.67,
                "distanceCharge": round(SITE_DISTANCE * 0.67, 2),
                "prevailingWageApplied": True,
                "taxRate": 0,
                "actualTaxRate": 0,
                "salesTax": 0,
                "subtotal": 0,
                "total": 0
            },
            "services": [
                {
                    "code": "A",
                    "name": f"Annual Service A - {kw_range} kW",
                    "frequency": 1,
                    "timesPerYear": 1,
                    "price": 0,
                    "perVisitPrice": 0,
                    "description": "Annual preventive maintenance inspection"
                },
                {
                    "code": "B",
                    "name": "Load Bank Testing (2 hours)",
                    "frequency": 1,
                    "timesPerYear": 1,
                    "price": 0,
                    "perVisitPrice": 0,
                    "description": "2-hour load bank test"
                }
            ]
        }
    }

    return payload

def main():
    """Main execution flow"""
    print("=" * 80)
    print("ANR-6-2025 RFP Quote Generator")
    print("=" * 80)

    # Load Excel data
    print(f"\n[*] Loading Excel file: {EXCEL_PATH}")
    df = pd.read_excel(EXCEL_PATH)
    print(f"   Total rows: {len(df)}")
    print(f"   Columns: {', '.join(df.columns.tolist())}")

    # Clean kW values
    print("\n🔧 Cleaning kW values...")
    df['kW_numeric'] = df['Output KW'].apply(clean_kw_value)

    # Filter billable generators (exclude 0 kW auxiliary equipment)
    generators = df[df['kW_numeric'] > 0].copy()
    print(f"   Billable generators: {len(generators)}")

    # Map to kW ranges
    print("\n📊 Mapping to kW ranges...")
    generators['kw_range'] = generators['kW_numeric'].apply(get_kw_range)

    # Show distribution
    print("\n   kW Range Distribution:")
    range_counts = generators['kw_range'].value_counts().sort_index()
    for kw_range, count in range_counts.items():
        print(f"      {kw_range:12s}: {count:2d} units")

    # Generate payloads
    print(f"\n📝 Generating quote payloads for {len(generators)} generators...")
    quote_payloads = []

    for idx, (_, row) in enumerate(generators.iterrows(), start=1):
        payload = create_quote_payload(row, idx)
        quote_payloads.append(payload)

        # Show progress
        if idx % 5 == 0 or idx == len(generators):
            print(f"   Generated: {idx}/{len(generators)}")

    # Create output directory
    output_path = Path(OUTPUT_DIR)
    output_path.mkdir(parents=True, exist_ok=True)
    print(f"\n💾 Saving quote payloads to: {output_path.absolute()}")

    # Save individual payloads
    saved_files = []
    for idx, payload in enumerate(quote_payloads, start=1):
        filename = f"quote-unit-{idx:02d}.json"
        filepath = output_path / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)

        saved_files.append(str(filepath))

    print(f"   Saved {len(saved_files)} quote payload files")

    # Save summary manifest
    manifest = {
        "project": "ANR-6-2025 RFP",
        "customer": "California Franchise Tax Board",
        "customer_zoho_id": CUSTOMER_ACCOUNT_ID,
        "site_distance": SITE_DISTANCE,
        "prevailing_wage": True,
        "tax_exempt": True,
        "service_type": "Annual PM (Service A + B)",
        "total_generators": len(generators),
        "generated_at": pd.Timestamp.now().isoformat(),
        "kw_range_distribution": range_counts.to_dict(),
        "quote_files": saved_files,
        "generators": []
    }

    # Add generator details to manifest
    for idx, (_, row) in enumerate(generators.iterrows(), start=1):
        manifest["generators"].append({
            "unit_number": idx,
            "building": str(row['Building/Asset']),
            "manufacturer": str(row['Manufacturer']),
            "model": str(row['Unit Model Number']) if not pd.isna(row['Unit Model Number']) else "Unknown",
            "serial": str(row['Unit Serial Number']) if not pd.isna(row['Unit Serial Number']) else "",
            "kw": float(row['kW_numeric']),
            "kw_range": row['kw_range'],
            "quote_file": f"quote-unit-{idx:02d}.json"
        })

    manifest_path = output_path / "manifest.json"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print(f"   Saved manifest: {manifest_path}")

    # Summary report
    print("\n" + "=" * 80)
    print("✅ QUOTE GENERATION COMPLETE")
    print("=" * 80)
    print(f"\nProject: ANR-6-2025 RFP")
    print(f"Customer: California Franchise Tax Board")
    print(f"Total Generators: {len(generators)}")
    print(f"Quote Payloads Generated: {len(quote_payloads)}")
    print(f"Files Saved: {len(saved_files) + 1} (includes manifest)")
    print(f"\nOutput Location: {output_path.absolute()}")

    print("\n⚠️  IMPORTANT: These are quote PAYLOADS, not final quotes")
    print("Next steps:")
    print("  1. Review payloads for accuracy")
    print("  2. Call calculation engine to get proper Service A+B pricing")
    print("  3. Submit to Zoho CPQ API endpoint: POST /api/generate-pdf")
    print("  4. Verify quotes created in Zoho CRM")

    print("\n" + "=" * 80)

    return manifest

if __name__ == "__main__":
    try:
        manifest = main()
        print("\n✅ Script completed successfully")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
