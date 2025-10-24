/**
 * Template Processor
 * Handles loading and processing HTML templates with variable substitution
 * Uses Vite's ?raw import feature for clean template loading
 */

/**
 * Process a template string with variable substitution
 * @param {string} template - HTML template string
 * @param {Object} data - Data object for variable substitution
 * @returns {string} Processed HTML
 */
export function processTemplate(template, data) {
    // Replace ${variable} with data.variable
    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
        const keys = key.trim().split('.');
        let value = data;
        for (const k of keys) {
            value = value?.[k];
        }
        return value !== undefined ? value : match;
    });
}

/**
 * Process template with function calls (advanced)
 * Supports: ${functionName(arg1, arg2)}
 * @param {string} template - HTML template string
 * @param {Object} data - Data object
 * @param {Object} helpers - Helper functions
 * @returns {string} Processed HTML
 */
export function processTemplateAdvanced(template, data, helpers = {}) {
    // First, replace function calls
    let processed = template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
        // Check if it's a function call
        const functionMatch = expression.match(/^(\w+)\((.*)\)$/);
        if (functionMatch) {
            const [, funcName, argsStr] = functionMatch;
            if (helpers[funcName]) {
                // Parse arguments (simple implementation)
                const args = argsStr.split(',').map(arg => {
                    arg = arg.trim();
                    // Remove quotes if present
                    if ((arg.startsWith('"') && arg.endsWith('"')) ||
                        (arg.startsWith("'") && arg.endsWith("'"))) {
                        return arg.slice(1, -1);
                    }
                    // Try to evaluate as number
                    if (!isNaN(arg)) return parseFloat(arg);
                    // Try to get from data
                    return data[arg];
                });
                return helpers[funcName](...args);
            }
        }

        // Standard variable substitution
        const keys = expression.trim().split('.');
        let value = data;
        for (const k of keys) {
            value = value?.[k];
        }
        return value !== undefined ? value : match;
    });

    return processed;
}

/**
 * Render array of items with template
 * @param {string} template - Template for each item
 * @param {Array} items - Array of data items
 * @param {Object} helpers - Optional helper functions
 * @returns {string} Concatenated HTML
 */
export function renderArray(template, items, helpers = {}) {
    return items.map(item => processTemplateAdvanced(template, item, helpers)).join('');
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.processTemplate = processTemplate;
    window.processTemplateAdvanced = processTemplateAdvanced;
    window.renderArray = renderArray;
}
