/**
 * Event Bus Bridge for HTTP Endpoints
 * Bridges HTTP requests to event bus events
 * @module @energen/api-gateway/event-bridge
 * @version 4.5.0
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * EventBridge class to connect HTTP endpoints with event bus
 */
export class EventBridge {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.pendingRequests = new Map();
    this.timeout = 30000; // 30 second timeout
  }

  /**
     * Bridge an HTTP request to an event
     */
  async bridgeRequest(eventName, data, responseEvent) {
    const requestId = uuidv4();

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout for ${eventName}`));
      }, this.timeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
        startTime: Date.now()
      });

      // Listen for response
      const responseHandler = (event) => {
        if (event.requestId === requestId) {
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(requestId);

            if (event.success) {
              resolve(event.data);
            } else {
              reject(new Error(event.error || 'Request failed'));
            }
          }

          // Clean up listener
          this.eventBus.off(responseEvent, responseHandler);
        }
      };

      // Register response handler
      this.eventBus.on(responseEvent, responseHandler);

      // Emit request event
      this.eventBus.emit(eventName, {
        requestId,
        data
      });
    });
  }

  /**
     * Set up prevailing wage endpoints
     */
  setupPrevailingWageEndpoints(app) {
    // Get prevailing wage data
    app.get('/api/prevailing-wage/:zip', async (req, res) => {
      try {
        const { zip } = req.params;
        const { state = 'CA' } = req.query;

        const data = await this.bridgeRequest(
          'prevailing-wage:request',
          { zip, state },
          'prevailing-wage:response'
        );

        res.json({
          success: true,
          data
        });
      } catch (error) {
        console.error('Prevailing wage error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get per diem rates
    app.get('/api/per-diem/:zip', async (req, res) => {
      try {
        const { zip } = req.params;
        const { state = 'CA' } = req.query;

        const data = await this.bridgeRequest(
          'per-diem:request',
          { zip, state },
          'per-diem:response'
        );

        res.json({
          success: true,
          data
        });
      } catch (error) {
        console.error('Per diem error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Check if prevailing wage is required
    app.post('/api/prevailing-wage/check', async (req, res) => {
      try {
        const { county, state = 'CA' } = req.body;

        const data = await this.bridgeRequest(
          'prevailing-wage:check-required',
          { county, state },
          'prevailing-wage:check-response'
        );

        res.json({
          success: true,
          data
        });
      } catch (error) {
        console.error('Prevailing wage check error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
     * Set up CPI endpoints
     */
  setupCPIEndpoints(app) {
    // Get CPI data
    app.get('/api/cpi/:metro', async (req, res) => {
      try {
        const { metro } = req.params;
        const { zip } = req.query;

        const data = await this.bridgeRequest(
          'cpi:request',
          { metro, zip },
          'cpi:response'
        );

        res.json({
          success: true,
          data
        });
      } catch (error) {
        console.error('CPI error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Calculate inflation adjustment
    app.post('/api/cpi/adjust', async (req, res) => {
      try {
        const { amount, fromYear, toYear, metro = 'US' } = req.body;

        const data = await this.bridgeRequest(
          'cpi:calculate-adjustment',
          { amount, fromYear, toYear, metro },
          'cpi:adjustment-response'
        );

        res.json({
          success: true,
          data
        });
      } catch (error) {
        console.error('CPI adjustment error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get metro area from ZIP
    app.get('/api/cpi/metro/:zip', async (req, res) => {
      try {
        const { zip } = req.params;

        const data = await this.bridgeRequest(
          'cpi:get-metro',
          { zip },
          'cpi:metro-response'
        );

        res.json({
          success: true,
          data
        });
      } catch (error) {
        console.error('CPI metro error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
     * Set up all bridged endpoints
     */
  setupEndpoints(app) {
    this.setupPrevailingWageEndpoints(app);
    this.setupCPIEndpoints(app);
  }

  /**
     * Get bridge statistics
     */
  getStatistics() {
    return {
      pendingRequests: this.pendingRequests.size,
      requests: Array.from(this.pendingRequests.entries()).map(([id, req]) => ({
        id,
        age: Date.now() - req.startTime
      }))
    };
  }

  /**
     * Clean up pending requests
     */
  cleanup() {
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timer);
      request.reject(new Error('Bridge shutdown'));
    }
    this.pendingRequests.clear();
  }
}

export default EventBridge;
