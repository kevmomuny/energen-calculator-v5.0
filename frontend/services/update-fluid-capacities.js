/**
 * Update FTB Verified Units with Rounded Capacities
 * Rule: Round to nearest gallon + 1 gallon safety margin
 */

async function updateFluidCapacities() {
    const response = await fetch('./FTB_VERIFIED_UNITS_DATA.json');
    const data = await response.json();

    // Helper function: extract number, round up to nearest gallon, add 1
    function roundCapacity(capacityString) {
        const match = capacityString.match(/(\d+\.?\d*)\s*gallons?/i);
        if (!match) return capacityString;

        const gallons = parseFloat(match[1]);
        const rounded = Math.ceil(gallons) + 1; // Round up + 1 safety margin

        return `${rounded} gallons`;
    }

    // Update each unit's fluid capacities
    data.units.forEach(unit => {
        const fluids = unit.fluids;

        // Extract original values for reference
        const oilOriginal = fluids.oilCapacity;
        const coolantOriginal = fluids.coolantCapacity;

        // Round and add safety margin
        fluids.oilCapacityRounded = roundCapacity(oilOriginal);
        fluids.coolantCapacityRounded = roundCapacity(coolantOriginal);

        // Extract numeric values for calculations
        fluids.oilGallons = parseInt(fluids.oilCapacityRounded);
        fluids.coolantGallons = parseInt(fluids.coolantCapacityRounded);

        console.log(`Unit ${unit.unitNumber}: Oil ${oilOriginal} → ${fluids.oilCapacityRounded}, Coolant ${coolantOriginal} → ${fluids.coolantCapacityRounded}`);
    });

    // Calculate new facility totals
    const totalOil = data.units.reduce((sum, u) => sum + u.fluids.oilGallons, 0);
    const totalCoolant = data.units.reduce((sum, u) => sum + u.fluids.coolantGallons, 0);

    data.facilityTotals = {
        totalOilGallons: totalOil,
        totalCoolantGallons: totalCoolant,
        orderingGuidelines: {
            oil: `${totalOil} gallons minimum (15W-40 approved diesel engine oil)`,
            coolant: `${totalCoolant} gallons minimum (50/50 ethylene glycol mix)`,
            notes: "Rounded to nearest gallon + 1 gallon safety margin per unit"
        }
    };

    console.log('✅ Updated Capacities:', data.facilityTotals);

    return data;
}

// Make available globally
window.updateFluidCapacities = updateFluidCapacities;
