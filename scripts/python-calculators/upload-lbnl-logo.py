import requests
import json

# Upload LBNL logo using enrichment API
url = "http://localhost:3002/api/enrichment/logo"
payload = {
    "companyName": "Lawrence Berkeley National Laboratory",
    "domain": "lbl.gov"
}

print("Uploading LBNL logo...")
print(f"Request: POST {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(url, json=payload, timeout=15)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        data = response.json()
        if 'logoUrl' in data:
            print(f"\n✅ Logo uploaded successfully!")
            print(f"Logo URL: {data['logoUrl']}")
        else:
            print(f"\n✅ Response received but check data structure")
    else:
        print(f"\n❌ Error: {response.status_code}")

except Exception as e:
    print(f"\n❌ Error: {e}")
