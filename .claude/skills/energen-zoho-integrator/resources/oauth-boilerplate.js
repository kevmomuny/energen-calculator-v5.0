/**
 * OAuth Boilerplate for Zoho Integration
 * Reusable OAuth handling patterns
 */

/**
 * Get or refresh Zoho access token with promise-based locking
 * Prevents concurrent token refresh requests
 */
async function getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
    }

    // If refresh is already in progress, wait for it
    if (this.tokenRefreshPromise) {
        return this.tokenRefreshPromise;
    }

    // Start new refresh
    this.tokenRefreshPromise = (async () => {
        try {
            const tokenUrl = `${this.accountsUrl}/oauth/v2/token`;
            const params = new URLSearchParams({
                refresh_token: this.refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token'
            });

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('Token refresh failed:', response.status, errorText);
                this.accessToken = null;
                this.tokenExpiry = null;
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;

            // Set expiry 5 minutes early to avoid race conditions
            const expiresIn = data.expires_in || 3600;
            this.tokenExpiry = new Date(Date.now() + ((expiresIn - 300) * 1000));

            return this.accessToken;
        } catch (error) {
            this.logger.error('❌ Failed to refresh Zoho access token:', error.message);
            throw error;
        } finally {
            // Clear promise lock
            this.tokenRefreshPromise = null;
        }
    })();

    return this.tokenRefreshPromise;
}

/**
 * Make API request with retry logic
 * Implements exponential backoff for transient failures
 */
async function makeApiRequestWithRetry(apiCall, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            lastError = error;

            // Don't retry on client errors (4xx except 429 rate limit)
            if (error.response?.status >= 400 &&
                error.response?.status < 500 &&
                error.response?.status !== 429) {
                throw error;
            }

            // Don't retry on authentication errors
            if (error.response?.status === 401) {
                throw error;
            }

            // Log retry attempt
            this.logger.warn(`Zoho API call failed (attempt ${attempt}/${maxRetries}):`, {
                error: error.message,
                status: error.response?.status,
                willRetry: attempt < maxRetries
            });

            // Don't wait after last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // All retries exhausted
    throw new Error(`Zoho API call failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Build search criteria from object
 * Converts object to Zoho API criteria string
 */
function buildSearchCriteria(criteria) {
    const conditions = [];

    Object.keys(criteria).forEach(field => {
        const value = criteria[field];
        if (typeof value === 'object' && value.operator) {
            // Advanced criteria with operator
            conditions.push(`(${field}:${value.operator}:${value.value})`);
        } else {
            // Simple equality criteria
            conditions.push(`(${field}:equals:${value})`);
        }
    });

    return conditions.join('and');
}

/**
 * Rate limit handler
 * Enforces delays between API calls
 */
class RateLimiter {
    constructor(callsPerMinute = 100) {
        this.callsPerMinute = callsPerMinute;
        this.callTimes = [];
    }

    async waitIfNeeded() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Remove calls older than 1 minute
        this.callTimes = this.callTimes.filter(time => time > oneMinuteAgo);

        // If at limit, wait until oldest call expires
        if (this.callTimes.length >= this.callsPerMinute) {
            const oldestCall = this.callTimes[0];
            const waitTime = oldestCall + 60000 - now;

            if (waitTime > 0) {
                console.warn(`⚠️  Rate limit reached. Waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        // Record this call
        this.callTimes.push(now);
    }
}

/**
 * Environment configuration loader
 * Validates required OAuth credentials
 */
function loadZohoConfig() {
    const requiredVars = [
        'ZOHO_CLIENT_ID',
        'ZOHO_CLIENT_SECRET',
        'ZOHO_REFRESH_TOKEN'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
        clientId: process.env.ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN,
        apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
        accountsUrl: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com'
    };
}

module.exports = {
    getAccessToken,
    makeApiRequestWithRetry,
    buildSearchCriteria,
    RateLimiter,
    loadZohoConfig
};
