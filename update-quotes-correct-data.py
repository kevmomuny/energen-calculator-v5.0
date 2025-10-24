import json
from pathlib import Path

# Update all quote payloads with CORRECT verified data
quotes_dir = Path('data/quotes/ANR-6-2025')

# VERIFIED DATA
correct_distance = 21  # From Google Distance Matrix API
correct_services = [
    {"code": "A", "name": "A-Comprehensive Inspection", "frequency": 4, "timesPerYear": 4, "description": "Complete system inspection (quarterly)"},
    {"code": "B", "name": "B-Oil & Filter Service", "frequency": 1, "timesPerYear": 1, "description": "Oil change and filters (annual)"},
    {"code": "C", "name": "C-Coolant Service", "frequency": 1, "timesPerYear": 1, "description": "Coolant flush and refill (annual)"},
    {"code": "D", "name": "D-Oil & Fuel Analysis", "frequency": 1, "timesPerYear": 1, "description": "Laboratory testing - oil, fuel, coolant sampling (annual)"},
    {"code": "E", "name": "E-Load Bank Testing", "frequency": 1, "timesPerYear": 1, "description": "2-hour full load testing (annual)"}
]

updated_count = 0
errors = []

if quotes_dir.exists():
    for quote_file in quotes_dir.glob('quote-unit-*.json'):
        try:
            with open(quote_file, 'r') as f:
                data = json.load(f)

            # Update distance
            if 'quoteData' in data and 'calculation' in data['quoteData']:
                data['quoteData']['calculation']['distance'] = correct_distance
                data['quoteData']['calculation']['siteDistance'] = correct_distance
                # Recalculate distance charge: 21 miles * 2 (round trip) * $0.67 = $28.14
                data['quoteData']['calculation']['distanceCharge'] = round(21 * 2 * 0.67, 2)

            # Update services
            if 'quoteData' in data:
                data['quoteData']['services'] = correct_services.copy()

            # Write back
            with open(quote_file, 'w') as f:
                json.dump(data, f, indent=2)

            updated_count += 1
            print(f"Updated {quote_file.name}")
        except Exception as e:
            errors.append(f"{quote_file.name}: {str(e)}")
            print(f"Error updating {quote_file.name}: {e}")

print(f"\n=== SUMMARY ===")
print(f"Files updated: {updated_count}")
print(f"Errors: {len(errors)}")
print(f"\nCorrect distance: {correct_distance} miles (was incorrectly 49 miles)")
print(f"Services updated: A, B, C, D, E (5 services)")
print(f"Distance charge: $28.14 (was $32.83)")

if errors:
    print("\nErrors:")
    for err in errors:
        print(f"  - {err}")
