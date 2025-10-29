import requests, json

# Check labor rate being used in calculations
payload = {
    "services": ["A"], 
    "customerInfo": {"name": "Test", "address": "Test", "city": "Berkeley", "state": "CA", "zip": "94720"}, 
    "generators": [{"kw": 300}], 
    "contractLength": 12, 
    "taxRate": 0, 
    "serviceFrequencies": {"A": 1}
}

r = requests.post("http://localhost:3002/api/calculate", json=payload, timeout=30)

if r.status_code == 200:
    result = r.json()
    calc = result['calculation']
    
    # Service A details
    svc_a = calc['serviceBreakdown']['A - Comprehensive Inspection']
    labor_cost = svc_a.get('laborCost', 0)
    labor_hours = svc_a.get('laborHours', 0)
    
    # Calculate rate
    if labor_hours > 0:
        labor_rate = labor_cost / labor_hours
        print("=" * 60)
        print("LABOR RATE VERIFICATION")
        print("=" * 60)
        print(f"Service A (300kW generator):")
        print(f"  Labor Hours: {labor_hours}")
        print(f"  Labor Cost: ${labor_cost:,.2f}")
        print(f"  Calculated Rate: ${labor_rate:.2f}/hour")
        print("=" * 60)
        
        # Check mobilization rate
        mob = calc.get('mobilization', {})
        mob_hours = mob.get('hours', 0)
        mob_cost = mob.get('total', 0)
        if mob_hours > 0:
            mob_rate = mob_cost / mob_hours
            print(f"\nMobilization:")
            print(f"  Hours: {mob_hours}")
            print(f"  Cost: ${mob_cost:,.2f}")
            print(f"  Rate: ${mob_rate:.2f}/hour")
        print("=" * 60)
else:
    print(f"Error: {r.status_code}")
