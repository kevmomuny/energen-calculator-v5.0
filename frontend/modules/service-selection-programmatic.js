/**
 * Programmatic Service Selection API
 * Solves E2E-004: Allows programmatic service selection without DOM interaction
 * @module service-selection-programmatic
 * @version 5.0.0
 */

/**
 * PROGRAMMATIC API: Set services and trigger calculation
 * This function allows test automation and programmatic quote generation
 * without requiring DOM button clicks
 *
 * @param {string} unitId - Unit ID (e.g., 'unit-1')
 * @param {string[]} serviceCodes - Array of service codes to select (e.g., ['A', 'B', 'C'])
 * @param {Object} [frequencies] - Optional frequency map (e.g., { A: 4, B: 2, C: 1 })
 * @returns {Promise<Object>} - Resolves when calculation completes with totals
 *
 * @example
 * // Select services A (quarterly) and B (annual) for unit-1
 * const result = await setServicesAndCalculate('unit-1', ['A', 'B'], { A: 4, B: 1 });
 * console.log('Total:', result.totals.total); // Should be > $0
 */
export async function setServicesAndCalculate(unitId, serviceCodes, frequencies = {}) {
    console.log('%c=== PROGRAMMATIC API: setServicesAndCalculate() ===', 'background: #00ff00; color: #000', {
        unitId,
        serviceCodes,
        frequencies,
        timestamp: Date.now()
    });

    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) {
        throw new Error(`Unit not found: ${unitId}`);
    }

    // Validate service codes
    const validServiceCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'CUSTOM'];
    const invalidCodes = serviceCodes.filter(code => !validServiceCodes.includes(code));
    if (invalidCodes.length > 0) {
        throw new Error(`Invalid service codes: ${invalidCodes.join(', ')}`);
    }

    // Set services (immutable update)
    unit.services = [...serviceCodes];
    console.log('✅ Services set:', [...unit.services]);

    // Set frequencies if provided, otherwise use defaults
    serviceCodes.forEach(code => {
        if (frequencies[code] !== undefined) {
            unit.serviceFrequencies[code] = frequencies[code];
        } else if (!unit.serviceFrequencies[code]) {
            // Default to annual (1x/year) if not specified
            unit.serviceFrequencies[code] = 1;
        }
    });
    console.log('✅ Frequencies set:', { ...unit.serviceFrequencies });

    // Update UI - mark service cards as active
    serviceCodes.forEach(code => {
        const serviceCard = document.getElementById(`${unitId}-service-${code}`);
        if (serviceCard) serviceCard.classList.add('active');
    });

    // Update service count
    const serviceCountElement = document.getElementById(`${unitId}-service-count`);
    if (serviceCountElement) {
        serviceCountElement.textContent = `${unit.services.length} services selected`;
    }

    // Trigger calculation using the unified pipeline
    console.log('🔄 Triggering calculation...');
    if (window.updateServicePrices) {
        // Use non-debounced version for programmatic calls (immediate response)
        await window.updateServicePrices(unitId);
    } else if (window.debouncedUpdateServicePrices) {
        // Fallback to debounced version
        window.debouncedUpdateServicePrices(unitId);
        // Wait for debounce delay + estimated API time
        await new Promise(resolve => setTimeout(resolve, 500));
    } else {
        throw new Error('Calculation service not available');
    }

    // Wait a bit longer to ensure serverCalculations is populated
    // The API call is async and updateServicePrices returns before storing results
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return the calculated totals
    console.log('✅ Calculation complete, returning totals:', unit.serverCalculations);
    return {
        success: true,
        unitId,
        services: [...unit.services],
        frequencies: { ...unit.serviceFrequencies },
        totals: unit.serverCalculations || {
            total: 0,
            laborCost: 0,
            materialsCost: 0,
            mobilizationCost: 0,
            tax: 0
        }
    };
}

// Expose to window for use in tests and automation
if (typeof window !== 'undefined') {
    window.setServicesAndCalculate = setServicesAndCalculate;
}
