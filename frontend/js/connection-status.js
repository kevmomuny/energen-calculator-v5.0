/**
 * Connection Status Monitor
 * Dynamically updates both the top-right and bottom-left "Connected" indicators based on API health
 */

async function updateConnectionStatus() {
    const topStatusElement = document.getElementById('connection-status');
    const bottomStatusBar = document.querySelector('.status-bar span:first-child');
    const statusMessage = document.getElementById('status-message');

    try {
        const response = await fetch('/health', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Check if all critical services are healthy
            // API returns: { status: 'healthy', services: { calculator, excel, zoho } }
            const allHealthy = data.status === 'ok' || data.status === 'healthy';
            const services = data.services || {};

            // Check individual services
            const failedServices = [];
            if (services.calculator !== 'ready') failedServices.push('Calculator');
            if (services.excel !== 'ready') failedServices.push('Excel Engine');
            if (services.zoho && services.zoho !== 'configured' && services.zoho !== 'ready') {
                failedServices.push('Zoho');
            }

            if (allHealthy && failedServices.length === 0) {
                // All APIs functional - green indicator
                updateStatusIndicators(
                    topStatusElement,
                    bottomStatusBar,
                    statusMessage,
                    'connected',
                    'All APIs functional',
                    'Ready'
                );
            } else {
                // Some APIs degraded - yellow indicator
                const failureMsg = failedServices.length > 0
                    ? `Limited: ${failedServices.join(', ')} unavailable`
                    : 'Some services degraded';

                updateStatusIndicators(
                    topStatusElement,
                    bottomStatusBar,
                    statusMessage,
                    'limited',
                    failureMsg,
                    failureMsg
                );
            }
        } else {
            throw new Error(`Health check failed: ${response.status}`);
        }
    } catch (error) {
        // API not reachable - red indicator
        console.warn('API health check failed:', error.message);

        updateStatusIndicators(
            topStatusElement,
            bottomStatusBar,
            statusMessage,
            'disconnected',
            'API server not reachable',
            'Server Disconnected'
        );
    }
}

/**
 * Update all status indicators consistently
 */
function updateStatusIndicators(topElement, bottomElement, messageElement, state, tooltip, message) {
    const states = {
        connected: {
            color: '#10b981',
            text: 'Connected',
            icon: '<span class="status-indicator" style="background-color: #10b981; width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>'
        },
        limited: {
            color: '#f59e0b',
            text: 'Limited',
            icon: '<span class="status-indicator" style="background-color: #f59e0b; width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>'
        },
        disconnected: {
            color: '#ef4444',
            text: 'Disconnected',
            icon: '<span class="status-indicator" style="background-color: #ef4444; width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>'
        }
    };

    const currentState = states[state];

    // Update top-right status (nav bar)
    if (topElement) {
        topElement.innerHTML = `${currentState.icon} ${currentState.text}`;
        topElement.style.color = currentState.color;
        topElement.title = tooltip;
    }

    // Update bottom-left status (status bar)
    if (bottomElement) {
        bottomElement.innerHTML = `${currentState.icon}${currentState.text}`;
        bottomElement.style.color = currentState.color;
        bottomElement.title = tooltip;
    }

    // Update status message
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.color = currentState.color;
        messageElement.title = tooltip;
    }
}

// Initialize connection status monitoring
function initConnectionStatus() {
    // Check immediately on page load
    updateConnectionStatus();

    // Re-check every 30 seconds
    setInterval(updateConnectionStatus, 30000);

    console.log('Connection status monitor initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConnectionStatus);
} else {
    // DOM already loaded
    initConnectionStatus();
}

// Make available globally for manual refresh
window.updateConnectionStatus = updateConnectionStatus;
