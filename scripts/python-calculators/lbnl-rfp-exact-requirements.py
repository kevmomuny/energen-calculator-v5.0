"""
LBNL RFP - Exact Requirements from Statement of Work
Price ONLY what is stipulated in the RFP. No more, no less.

RFP REQUIREMENTS:
- Section 4: Annual Preventative Maintenance (1x/year per unit)
  Includes: Inspection + Oil Change + Load Bank Test (bundled in one visit)
- Section 6: Oil, Fuel, Coolant Sampling (1x/year with PM)
- Coolant Service: As needed only (not included in base bid)

CONTRACT LENGTH: 12 months (1 year)
"""

import requests
import json

# Equipment list from RFP
equipment = [
    {"name": "60 EG 68", "kw": 500},
    {"name": "60 EG 69", "kw": 500},
    {"name": "60 EG 78", "kw": 750},
    {"name": "64 EG 79", "kw": 350},
    {"name": "64 EG 80", "kw": 350},
    {"name": "70 EG 83", "kw": 750},
    {"name": "70A EG 84", "kw": 400},
    {"name": "72 EG 86", "kw": 750},
    {"name": "72 EG 87", "kw": 500},
    {"name": "74 EG 88", "kw": 1500},
    {"name": "74 EG 89", "kw": 500},
    {"name": "77 EG 90", "kw": 500},
    {"name": "77 EG 91", "kw": 500},
    {"name": "77A EG 92", "kw": 200},
    {"name": "77A EG 93", "kw": 200},
    {"name": "77A EG 94", "kw": 200},
    {"name": "77B EG 95", "kw": 200},
    {"name": "78 EG 96", "kw": 30},
    {"name": "78 EG 97", "kw": 30},
    {"name": "80 EG 102", "kw": 150},
    {"name": "84 EG 106", "kw": 800},
    {"name": "84 EG 107", "kw": 800},
    {"name": "84 EG 108", "kw": 350},
    {"name": "84 EG 109", "kw": 300},
    {"name": "85 EG 110", "kw": 500},
    {"name": "85 EG 111", "kw": 500},
    {"name": "88 EG 116", "kw": 750},
    {"name": "88 EG 117", "kw": 750},
    {"name": "90 EG 120", "kw": 350},
    {"name": "92 EG 125", "kw": 2000},
    {"name": "94 EG 127", "kw": 300},
    # Non-generator equipment (also requires maintenance per RFP equipment list)
    {"name": "B25E Fire Pump", "kw": 100, "type": "fire_pump"},
    {"name": "B25E Air Compressor 1", "kw": 50, "type": "air_compressor"},
    {"name": "B25E Air Compressor 2", "kw": 50, "type": "air_compressor"},
    {"name": "B25E Air Compressor 3", "kw": 50, "type": "air_compressor"},
    {"name": "B51B Light Tower", "kw": 20, "type": "light_tower"}
]

print("="*80)
print("LBNL RFP CALCULATION - EXACT RFP REQUIREMENTS ONLY")
print("="*80)
print(f"\nTotal Equipment: {len(equipment)} units")
print("Contract Length: 12 months (1 year)")
print("\nRFP REQUIREMENTS:")
print("  - Annual PM (1x/year): Inspection + Oil Change + Load Bank Test")
print("  - Lab Analysis (1x/year): Oil, Fuel, Coolant sampling")
print("  - Coolant Service: As needed only (not in base bid)")
print("  - DPF Regeneration: 10 units annually")
print("\n" + "="*80)

# Call Calculator API for each unit
# Services: A (inspection), B (oil), D (analysis), E (load bank)
# Service C (coolant) excluded - as needed only

api_url = "http://localhost:3002/api/calculate"

calculations = []

for i, unit in enumerate(equipment, 1):
    print(f"\nProcessing {i}/36: {unit['name']} ({unit['kw']} kW)...")

    payload = {
        "services": ["A", "B", "D", "E"],  # Only what RFP requires
        "customerInfo": {
            "name": "Lawrence Berkeley National Laboratory",
            "address": "1 Cyclotron Road",
            "city": "Berkeley",
            "state": "CA",
            "zip": "94720"
        },
        "generators": [
            {
                "kw": unit['kw'],
                "quantity": 1
            }
        ],
        "contractLength": 12
    }

    response = requests.post(api_url, json=payload)

    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            data = result['data']
            services = data['services']

            # Extract service costs
            svc_a = services.get('A - Comprehensive Inspection', {})
            svc_b = services.get('B - Oil & Filter Service', {})
            svc_d = services.get('D - Oil & Fuel Analysis', {})
            svc_e = services.get('E - Load Bank Testing', {})

            unit_calc = {
                'name': unit['name'],
                'kw': unit['kw'],
                'service_a': svc_a.get('totalCost', 0),
                'service_b': svc_b.get('totalCost', 0),
                'service_d': svc_d.get('totalCost', 0),
                'service_e': svc_e.get('totalCost', 0)
            }

            # NOTE: Calculator returns costs at standard $180/hr rate
            # These will need prevailing wage adjustment

            calculations.append(unit_calc)
            print(f"  Service A (Annual PM): ${unit_calc['service_a']:,.2f}")
            print(f"  Service B (Oil/Filter): ${unit_calc['service_b']:,.2f}")
            print(f"  Service D (Lab Analysis): ${unit_calc['service_d']:,.2f}")
            print(f"  Service E (Load Bank): ${unit_calc['service_e']:,.2f}")
        else:
            print(f"  ERROR: {result.get('error')}")
    else:
        print(f"  ERROR: HTTP {response.status_code}")

# Calculate totals AT STANDARD RATE
print("\n" + "="*80)
print("TOTALS AT STANDARD COMMERCIAL RATE ($180/hr):")
print("="*80)

total_a = sum(c['service_a'] for c in calculations)
total_b = sum(c['service_b'] for c in calculations)
total_d = sum(c['service_d'] for c in calculations)
total_e = sum(c['service_e'] for c in calculations)

print(f"\nService A (Annual PM):        ${total_a:>12,.2f}")
print(f"Service B (Oil & Filter):     ${total_b:>12,.2f}")
print(f"Service D (Lab Analysis):     ${total_d:>12,.2f}")
print(f"Service E (Load Bank Test):   ${total_e:>12,.2f}")
print(f"{'─'*50}")
print(f"SUBTOTAL (Standard Rate):     ${total_a + total_b + total_d + total_e:>12,.2f}")

# Apply prevailing wage adjustment
print("\n" + "="*80)
print("PREVAILING WAGE ADJUSTMENT:")
print("="*80)

STANDARD_RATE = 180.00
PREVAILING_TECH_WAGE = 156.24  # CA DIR Operating Engineers Group 8
BUSINESS_OVERHEAD = 155.00
PREVAILING_TOTAL_RATE = PREVAILING_TECH_WAGE + BUSINESS_OVERHEAD  # $311.24/hr
RATE_MULTIPLIER = PREVAILING_TOTAL_RATE / STANDARD_RATE

print(f"\nStandard Commercial Rate:     ${STANDARD_RATE:.2f}/hr")
print(f"Prevailing Wage Rate:         ${PREVAILING_TECH_WAGE:.2f}/hr")
print(f"Business Overhead:            ${BUSINESS_OVERHEAD:.2f}/hr")
print(f"Total Prevailing Labor Rate:  ${PREVAILING_TOTAL_RATE:.2f}/hr")
print(f"Rate Multiplier:              {RATE_MULTIPLIER:.4f}x ({(RATE_MULTIPLIER-1)*100:.1f}% increase)")

# Apply multiplier to labor portions only
# Services A, B, E have labor components
# Service D is lab fees only (no labor)

total_a_prevailing = total_a * RATE_MULTIPLIER
total_b_prevailing = total_b * RATE_MULTIPLIER
total_d_prevailing = total_d  # No labor, just lab fees
total_e_prevailing = total_e * RATE_MULTIPLIER

print("\n" + "="*80)
print("TOTALS AT PREVAILING WAGE RATE ($311.24/hr):")
print("="*80)

print(f"\nService A (Annual PM):        ${total_a_prevailing:>12,.2f}")
print(f"Service B (Oil & Filter):     ${total_b_prevailing:>12,.2f}")
print(f"Service D (Lab Analysis):     ${total_d_prevailing:>12,.2f}")
print(f"Service E (Load Bank Test):   ${total_e_prevailing:>12,.2f}")
print(f"{'─'*50}")
subtotal = total_a_prevailing + total_b_prevailing + total_d_prevailing + total_e_prevailing
print(f"SUBTOTAL:                     ${subtotal:>12,.2f}")

# Add RFP-specific factors
print("\n" + "="*80)
print("RFP-SPECIFIC ADDITIONAL COSTS:")
print("="*80)

# Overhead per unit (LOTO, CMMS, Photos, Notifications)
LOTO_HOURS = 0.42
CMMS_HOURS = 0.50
PHOTOS_HOURS = 0.25
NOTIFICATIONS_HOURS = 0.17
TOTAL_OVERHEAD_HOURS = LOTO_HOURS + CMMS_HOURS + PHOTOS_HOURS + NOTIFICATIONS_HOURS
OVERHEAD_COST_PER_UNIT = TOTAL_OVERHEAD_HOURS * PREVAILING_TOTAL_RATE

print(f"\nOverhead per Unit:")
print(f"  LOTO (Lockout/Tagout):      {LOTO_HOURS} hrs")
print(f"  CMMS Data Entry (Maximo):   {CMMS_HOURS} hrs")
print(f"  Photo Documentation:        {PHOTOS_HOURS} hrs")
print(f"  Notifications:              {NOTIFICATIONS_HOURS} hrs")
print(f"  Total Overhead:             {TOTAL_OVERHEAD_HOURS} hrs × ${PREVAILING_TOTAL_RATE:.2f}/hr")
print(f"  Cost per Unit:              ${OVERHEAD_COST_PER_UNIT:.2f}")
total_overhead = OVERHEAD_COST_PER_UNIT * len(equipment)
print(f"\nTotal Overhead (36 units):    ${total_overhead:>12,.2f}")

# DPF Regeneration (10 units)
DPF_HOURS_PER_UNIT = 3.5
DPF_UNITS = 10
total_dpf_hours = DPF_HOURS_PER_UNIT * DPF_UNITS
total_dpf_cost = total_dpf_hours * PREVAILING_TOTAL_RATE

print(f"\nDPF Regeneration:")
print(f"  Units with DPF:             {DPF_UNITS}")
print(f"  Hours per unit:             {DPF_HOURS_PER_UNIT} hrs")
print(f"  Total hours:                {total_dpf_hours} hrs")
print(f"  Total DPF Cost:             ${total_dpf_cost:>12,.2f}")

# DOE Oversight (15% multiplier on all labor)
DOE_OVERSIGHT_MULTIPLIER = 0.15
total_labor_cost = total_a_prevailing + total_b_prevailing + total_e_prevailing + total_overhead + total_dpf_cost
doe_oversight_cost = total_labor_cost * DOE_OVERSIGHT_MULTIPLIER

print(f"\nDOE Oversight (15% of labor):")
print(f"  Base labor:                 ${total_labor_cost:,.2f}")
print(f"  DOE Oversight:              ${doe_oversight_cost:>12,.2f}")

# Training (one-time cost)
NFPA_70E_COST = 1400.00
QEW2_TRAINING_COST = 2800.00
LBNL_EHS_HOURS = 16
LBNL_EHS_COST = LBNL_EHS_HOURS * PREVAILING_TOTAL_RATE
total_training = NFPA_70E_COST + QEW2_TRAINING_COST + LBNL_EHS_COST

print(f"\nTraining (One-Time):")
print(f"  NFPA 70E Certification:     ${NFPA_70E_COST:>12,.2f}")
print(f"  QEW2 Training:              ${QEW2_TRAINING_COST:>12,.2f}")
print(f"  LBNL EHS Training:          ${LBNL_EHS_COST:>12,.2f} ({LBNL_EHS_HOURS} hrs)")
print(f"  Total Training:             ${total_training:>12,.2f}")

# GRAND TOTAL
print("\n" + "="*80)
print("GRAND TOTAL - 12 MONTH CONTRACT:")
print("="*80)

grand_total = (subtotal + total_overhead + total_dpf_cost +
               doe_oversight_cost + total_training)

print(f"\nBase Services (A+B+D+E):      ${subtotal:>12,.2f}")
print(f"Overhead (LOTO, CMMS, etc):   ${total_overhead:>12,.2f}")
print(f"DPF Regeneration (10 units):  ${total_dpf_cost:>12,.2f}")
print(f"DOE Oversight (15%):          ${doe_oversight_cost:>12,.2f}")
print(f"Training (One-Time):          ${total_training:>12,.2f}")
print(f"{'='*50}")
print(f"GRAND TOTAL:                  ${grand_total:>12,.2f}")

print("\n" + "="*80)
print(f"Total Equipment: {len(equipment)} units")
print(f"Average Cost per Unit: ${grand_total/len(equipment):,.2f}")
print("="*80)

# Save results
output = {
    "rfp_id": "ANR-6-2025",
    "contract_months": 12,
    "equipment_count": len(equipment),
    "services": {
        "service_a": total_a_prevailing,
        "service_b": total_b_prevailing,
        "service_d": total_d_prevailing,
        "service_e": total_e_prevailing
    },
    "additional_costs": {
        "overhead": total_overhead,
        "dpf_regeneration": total_dpf_cost,
        "doe_oversight": doe_oversight_cost,
        "training": total_training
    },
    "grand_total": grand_total,
    "per_unit_average": grand_total / len(equipment)
}

with open('lbnl-rfp-exact-calculation.json', 'w') as f:
    json.dump(output, f, indent=2)

print("\n[OK] Results saved to: lbnl-rfp-exact-calculation.json")
