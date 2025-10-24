import requests
import json

# Calculate distance from Energen base to LBNL using backend API
url = "http://localhost:3002/api/enrichment/distance"

# Energen base (Concord, CA) to LBNL (Berkeley, CA)
payload = {
    "origin": "Concord, CA",
    "destination": "1 Cyclotron Road, Berkeley, CA 94720"
}

print("Calculating distance...")
print(f"From: {payload['origin']}")
print(f"To: {payload['destination']}")
print(f"\nCalling: POST {url}")

try:
    response = requests.post(url, json=payload, timeout=10)
    print(f"\nStatus: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nResponse:")
        print(json.dumps(data, indent=2))

        if 'distanceInMiles' in data:
            print(f"\n=== RESULT ===")
            print(f"Distance: {data['distanceInMiles']} miles")
            print(f"Duration: {data.get('durationMinutes', 'N/A')} minutes")
    else:
        print(f"Error: {response.text}")

except Exception as e:
    print(f"Error: {e}")
