/**
 * Import Verified Unit Data into Calculator
 * Loads pre-verified Cummins generator specifications with HIGH confidence
 *
 * Usage: Call importVerifiedUnits() from browser console or initialization
 */

/**
 * Import verified unit data and populate calculator
 * @param {string} jsonPath - Path to FTB_VERIFIED_UNITS_DATA.json
 */
async function importVerifiedUnits(jsonPath = './FTB_VERIFIED_UNITS_DATA.json') {
    try {
        console.log('📥 Loading verified unit data from:', jsonPath);

        // Fetch the JSON file
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Loaded data for ${data.units.length} units`);

        // Helper function: extract gallons and round (nearest + 1)
        function extractAndRoundGallons(capacityString) {
            const match = capacityString.match(/(\d+\.?\d*)\s*gallons?/i);
            if (!match) return null;
            const gallons = parseFloat(match[1]);
            return Math.ceil(gallons) + 1; // Round up + 1 safety margin
        }

        // Store in localStorage with HIGH confidence (AI search modal will read from localStorage)
        for (const unit of data.units) {
            const cacheKey = `${unit.kw}-${unit.brand}-${unit.model}-${unit.serial}`;

            // Round capacities for service calculations
            const oilGallons = extractAndRoundGallons(unit.fluids.oilCapacity);
            const coolantGallons = extractAndRoundGallons(unit.fluids.coolantCapacity);

            const maintenanceData = {
                fluids: {
                    oilType: {
                        value: unit.fluids.oilType,
                        confidence: 'high',
                        source: unit.fluids.source
                    },
                    oilCapacity: {
                        value: unit.fluids.oilCapacity,
                        gallons: oilGallons,
                        rounded: `${oilGallons} gallons`,
                        confidence: 'high',
                        source: unit.fluids.source
                    },
                    coolantType: {
                        value: unit.fluids.coolantType,
                        confidence: 'high',
                        source: unit.fluids.source
                    },
                    coolantCapacity: {
                        value: unit.fluids.coolantCapacity,
                        gallons: coolantGallons,
                        rounded: `${coolantGallons} gallons`,
                        confidence: 'high',
                        source: unit.fluids.source
                    }
                },
                consumables: {
                    oilFilter: {
                        value: unit.consumables.oilFilter,
                        confidence: unit.consumables.confidence,
                        source: 'Cummins Parts Catalog'
                    },
                    fuelFilter: {
                        value: unit.consumables.fuelFilter,
                        confidence: unit.consumables.confidence,
                        source: 'Cummins Parts Catalog'
                    },
                    airFilter: {
                        value: unit.consumables.airFilter,
                        confidence: unit.consumables.confidence,
                        source: 'Cummins Parts Catalog'
                    }
                },
                intervals: {
                    oilChange: {
                        value: unit.intervals.oilChange,
                        confidence: unit.intervals.confidence,
                        source: 'Cummins Maintenance Schedule'
                    },
                    airFilter: {
                        value: unit.intervals.airFilter,
                        confidence: unit.intervals.confidence,
                        source: 'Cummins Maintenance Schedule'
                    },
                    fuelFilter: {
                        value: unit.intervals.fuelFilter,
                        confidence: unit.intervals.confidence,
                        source: 'Cummins Maintenance Schedule'
                    },
                    coolantService: {
                        value: unit.intervals.coolantService,
                        confidence: unit.intervals.confidence,
                        source: 'Cummins Maintenance Schedule'
                    }
                },
                confidence: unit.confidence,
                source: unit.fluids.source,
                engine: unit.engine,
                verified: true,
                verifiedDate: data.metadata.lastUpdated
            };

            // Store in localStorage for persistence
            const storageKey = `aiUnitCache_${cacheKey}`;
            localStorage.setItem(storageKey, JSON.stringify({
                data: maintenanceData,
                timestamp: Date.now(),
                expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
            }));

            console.log(`✅ Cached ${unit.name} (${cacheKey})`);
        }

        console.log('✅ All units imported successfully!');
        console.log(`📊 Totals: ${data.facilityTotals.totalOilCapacity} oil, ${data.facilityTotals.totalCoolantCapacity} coolant`);

        return {
            success: true,
            unitsImported: data.units.length,
            data: data
        };

    } catch (error) {
        console.error('❌ Failed to import verified units:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Load verified data from localStorage cache
 */
function loadCachedVerifiedUnits() {
    const cachedUnits = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aiUnitCache_')) {
            try {
                const cached = JSON.parse(localStorage.getItem(key));
                if (cached && cached.data && cached.data.verified) {
                    cachedUnits.push({
                        key: key.replace('aiUnitCache_', ''),
                        data: cached.data,
                        timestamp: cached.timestamp
                    });
                }
            } catch (e) {
                console.warn('Failed to parse cached unit:', key);
            }
        }
    }

    return cachedUnits;
}

/**
 * Clear all cached unit data
 */
function clearVerifiedUnitsCache() {
    let cleared = 0;
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aiUnitCache_')) {
            keys.push(key);
        }
    }

    keys.forEach(key => {
        localStorage.removeItem(key);
        cleared++;
    });

    console.log(`🗑️ Cleared ${cleared} cached unit entries`);
    return cleared;
}

/**
 * Auto-populate calculator with verified units
 */
async function autoPopulateUnits(jsonPath) {
    try {
        const response = await fetch(jsonPath || './New folder/FTB_VERIFIED_UNITS_DATA.json');
        const data = await response.json();

        console.log('🚀 Auto-populating calculator with verified units...');

        // Clear existing units (optional - comment out if you want to keep existing)
        // while (window.state.unitCounter > 0) {
        //     window.removeUnit(`unit-${window.state.unitCounter}`);
        // }

        for (const unit of data.units) {
            // Add new unit to calculator
            const unitId = window.addNewUnit();

            // Populate unit data
            const unitElement = document.getElementById(unitId);
            if (unitElement) {
                // Set kW
                const kwInput = unitElement.querySelector('input[placeholder="kW Rating"]');
                if (kwInput) kwInput.value = unit.kw;

                // Set brand
                const brandSelect = unitElement.querySelector('select[id$="-brand"]');
                if (brandSelect) brandSelect.value = unit.brand;

                // Set model
                const modelInput = unitElement.querySelector('input[placeholder="Enter model"]');
                if (modelInput) modelInput.value = unit.model;

                // Set serial
                const serialInput = unitElement.querySelector('input[placeholder="Enter serial"]');
                if (serialInput) serialInput.value = unit.serial;

                // Set fuel type
                const fuelSelect = unitElement.querySelector('select[id$="-fuelType"]');
                if (fuelSelect) fuelSelect.value = unit.fuelType;

                // Trigger change events to update state
                [kwInput, brandSelect, modelInput, serialInput, fuelSelect].forEach(el => {
                    if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
                });

                console.log(`✅ Populated ${unit.name}`);
            }
        }

        // Also import into AI cache
        await importVerifiedUnits(jsonPath);

        console.log('✅ Auto-population complete!');
        return { success: true, unitsAdded: data.units.length };

    } catch (error) {
        console.error('❌ Auto-population failed:', error);
        return { success: false, error: error.message };
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.importVerifiedUnits = importVerifiedUnits;
    window.loadCachedVerifiedUnits = loadCachedVerifiedUnits;
    window.clearVerifiedUnitsCache = clearVerifiedUnitsCache;
    window.autoPopulateUnits = autoPopulateUnits;
}

// Auto-import on page load if data file exists
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🔍 Checking for verified units data...');
        try {
            const response = await fetch('./FTB_VERIFIED_UNITS_DATA.json');
            if (response.ok) {
                console.log('✅ Found verified units data file');
                // Uncomment to auto-import on load:
                // await importVerifiedUnits();
            }
        } catch (e) {
            console.log('ℹ️ No verified units data file found (optional)');
        }
    });
}
