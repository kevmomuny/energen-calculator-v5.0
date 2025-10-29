#!/usr/bin/env python3
"""
Calculate the prevailing wage premium for LNBL
"""

print("=" * 80)
print("PREVAILING WAGE RATE CALCULATION")
print("=" * 80)

# Current standard rate breakdown (estimate)
standard_rate = 180.00
estimated_standard_tech_wage = 60.00  # Typical journeyman rate
estimated_business_costs = 180.00 - 60.00  # $120/hour

print("\nSTANDARD RATE (Non-Prevailing Wage):")
print("-" * 80)
print(f"Tech Wage (estimated):        ${estimated_standard_tech_wage:>10,.2f}/hour")
print(f"Business Costs:               ${estimated_business_costs:>10,.2f}/hour")
print(f"Total Standard Rate:          ${standard_rate:>10,.2f}/hour")
print("=" * 80)

# Prevailing wage requirement
prevailing_wage = 121.50  # DIR Electrician Inside Wireman - Alameda County

# Calculate new rate
prevailing_wage_increase = prevailing_wage - estimated_standard_tech_wage
new_total_rate = standard_rate + prevailing_wage_increase

print("\nPREVAILING WAGE RATE (LNBL):")
print("-" * 80)
print(f"Prevailing Wage Required:     ${prevailing_wage:>10,.2f}/hour")
print(f"Standard Tech Wage:           ${estimated_standard_tech_wage:>10,.2f}/hour")
print(f"Wage Increase:                ${prevailing_wage_increase:>10,.2f}/hour")
print("-" * 80)
print(f"Business Costs (unchanged):   ${estimated_business_costs:>10,.2f}/hour")
print("-" * 80)
print(f"NEW TOTAL RATE:               ${new_total_rate:>10,.2f}/hour")
print("=" * 80)

# Compare to your estimate
your_estimate = 215.00
difference = new_total_rate - your_estimate

print("\nCOMPARISON TO YOUR ESTIMATE:")
print("-" * 80)
print(f"Your Estimate:                ${your_estimate:>10,.2f}/hour")
print(f"Calculated Rate:              ${new_total_rate:>10,.2f}/hour")
print(f"Difference:                   ${difference:>10,.2f}/hour ({(difference/your_estimate)*100:+.1f}%)")
print("=" * 80)

# Show breakdown with different standard tech wage assumptions
print("\nSENSITIVITY ANALYSIS:")
print("(What if standard tech wage is different?)")
print("-" * 80)
print(f"{'Standard Wage':<15} {'Business Costs':<15} {'PW Premium':<15} {'New Total':<15}")
print("-" * 80)

for std_wage in [50, 55, 60, 65, 70]:
    business = 180 - std_wage
    premium = prevailing_wage - std_wage
    new_rate = std_wage + business + premium
    print(f"${std_wage:>6,.2f}/hour    ${business:>6,.2f}/hour    +${premium:>6,.2f}/hour    ${new_rate:>6,.2f}/hour")

print("=" * 80)
