import json
from pathlib import Path

# Update all quote payloads with LBNL logo and contact ID
quotes_dir = Path('data/quotes/ANR-6-2025')

# Data to add
lbnl_logo_url = "https://cdn.brandfetch.io/lbl.gov/w/200/h/200"
contact_id = "6712770000003648100"
contact_name = "Angelica Numazu Rogers"
contact_email = "anumazu@lbl.gov"
contact_phone = "(510) 486-4855"

updated_count = 0
errors = []

if quotes_dir.exists():
    for quote_file in quotes_dir.glob('quote-unit-*.json'):
        try:
            with open(quote_file, 'r') as f:
                data = json.load(f)

            # Update customer section with contact details
            if 'customer' in data:
                data['customer']['contactId'] = contact_id
                data['customer']['contactName'] = contact_name
                data['customer']['email'] = contact_email
                data['customer']['phone'] = contact_phone
                data['customer']['logoUrl'] = lbnl_logo_url

            # Update quoteData if exists
            if 'quoteData' in data:
                if 'customer' not in data['quoteData']:
                    data['quoteData']['customer'] = {}
                data['quoteData']['customer']['logoUrl'] = lbnl_logo_url

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
print(f"\nLogo URL added: {lbnl_logo_url}")
print(f"Contact ID added: {contact_id}")
print(f"Contact: {contact_name} ({contact_email})")

if errors:
    print("\nErrors:")
    for err in errors:
        print(f"  - {err}")
