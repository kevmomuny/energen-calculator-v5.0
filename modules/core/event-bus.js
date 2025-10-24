/**
 * Event Bus for Inter-Module Communication
 * Provides loose coupling between modules
 * @module core/event-bus
 * @version 4.1.0
 */

/**
 * Event emitter with advanced features
 */
export class EventBus {
  constructor(options = {}) {
    this.events = new Map();
    this.wildcardHandlers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.debug = options.debug || false;
    this.asyncHandlers = new Set();
    this.middleware = [];
    this.metrics = {
      totalEvents: 0,
      eventCounts: new Map(),
      handlerCounts: new Map(),
      errors: []
    };
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name or pattern (supports wildcards)
   * @param {Function} handler - Event handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    const { 
      once = false, 
      priority = 0, 
      async = false,
      context = null 
    } = options;

    // Handle wildcard subscriptions
    if (event.includes('*')) {
      return this.onWildcard(event, handler, options);
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const wrappedHandler = {
      handler,
      once,
      priority,
      async,
      context,
      id: this.generateHandlerId()
    };

    if (async) {
      this.asyncHandlers.add(wrappedHandler.id);
    }

    const handlers = this.events.get(event);
    handlers.push(wrappedHandler);
    
    // Sort by priority (higher priority first)
    handlers.sort((a, b) => b.priority - a.priority);

    this.updateMetrics('subscribe', event);

    // Return unsubscribe function
    return () => this.off(event, wrappedHandler.id);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    return this.on(event, handler, { once: true });
  }

  /**
   * Subscribe to wildcard pattern
   * @private
   */
  onWildcard(pattern, handler, options) {
    const regex = this.patternToRegex(pattern);
    const wrappedHandler = {
      pattern,
      regex,
      handler,
      ...options,
      id: this.generateHandlerId()
    };

    if (!this.wildcardHandlers.has(pattern)) {
      this.wildcardHandlers.set(pattern, []);
    }

    this.wildcardHandlers.get(pattern).push(wrappedHandler);

    return () => this.offWildcard(pattern, wrappedHandler.id);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {string} handlerId - Handler ID
   */
  off(event, handlerId) {
    if (!this.events.has(event)) return;

    const handlers = this.events.get(event);
    const index = handlers.findIndex(h => h.id === handlerId);
    
    if (index !== -1) {
      const handler = handlers[index];
      this.asyncHandlers.delete(handler.id);
      handlers.splice(index, 1);
      
      if (handlers.length === 0) {
        this.events.delete(event);
      }
      
      this.updateMetrics('unsubscribe', event);
    }
  }

  /**
   * Unsubscribe from wildcard pattern
   * @private
   */
  offWildcard(pattern, handlerId) {
    if (!this.wildcardHandlers.has(pattern)) return;

    const handlers = this.wildcardHandlers.get(pattern);
    const index = handlers.findIndex(h => h.id === handlerId);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      
      if (handlers.length === 0) {
        this.wildcardHandlers.delete(pattern);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<Array>} Results from all handlers
   */
  async emit(event, data) {
    this.updateMetrics('emit', event);
    this.addToHistory(event, data);

    // Apply middleware
    const processedData = await this.applyMiddleware(event, data);

    const results = [];
    const errors = [];

    // Execute direct handlers
    if (this.events.has(event)) {
      const handlers = [...this.events.get(event)];
      
      for (const handler of handlers) {
        try {
          const result = await this.executeHandler(handler, processedData, event);
          results.push(result);
          
          // Remove once handlers
          if (handler.once) {
            this.off(event, handler.id);
          }
        } catch (error) {
          errors.push({ handler: handler.id, error });
          this.handleError(error, event, handler);
        }
      }
    }

    // Execute wildcard handlers
    for (const [pattern, handlers] of this.wildcardHandlers) {
      for (const handler of handlers) {
        if (handler.regex.test(event)) {
          try {
            const result = await this.executeHandler(handler, processedData, event);
            results.push(result);
            
            if (handler.once) {
              this.offWildcard(pattern, handler.id);
            }
          } catch (error) {
            errors.push({ handler: handler.id, error });
            this.handleError(error, event, handler);
          }
        }
      }
    }

    if (errors.length > 0 && this.debug) {
      console.error(`Errors emitting event '${event}':`, errors);
    }

    return results;
  }

  /**
   * Emit an event synchronously (blocks until all handlers complete)
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Array} Results from all handlers
   */
  emitSync(event, data) {
    this.updateMetrics('emit', event);
    this.addToHistory(event, data);

    const results = [];
    const errors = [];

    // Execute direct handlers
    if (this.events.has(event)) {
      const handlers = [...this.events.get(event)];
      
      for (const handler of handlers) {
        try {
          const result = this.executeHandlerSync(handler, data, event);
          results.push(result);
          
          if (handler.once) {
            this.off(event, handler.id);
          }
        } catch (error) {
          errors.push({ handler: handler.id, error });
          this.handleError(error, event, handler);
        }
      }
    }

    return results;
  }

  /**
   * Execute a handler
   * @private
   */
  async executeHandler(handler, data, event) {
    const context = handler.context || this;
    
    if (handler.async || this.asyncHandlers.has(handler.id)) {
      return await handler.handler.call(context, data, event);
    } else {
      return handler.handler.call(context, data, event);
    }
  }

  /**
   * Execute a handler synchronously
   * @private
   */
  executeHandlerSync(handler, data, event) {
    const context = handler.context || this;
    return handler.handler.call(context, data, event);
  }

  /**
   * Add middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Apply middleware to event data
   * @private
   */
  async applyMiddleware(event, data) {
    let processedData = data;
    
    for (const middleware of this.middleware) {
      processedData = await middleware(event, processedData);
    }
    
    return processedData;
  }

  /**
   * Wait for an event
   * @param {string} event - Event name
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Resolves with event data
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event '${event}'`));
      }, timeout);

      const handler = this.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional, removes all if not specified)
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
      
      // Remove matching wildcard handlers
      for (const [pattern, handlers] of this.wildcardHandlers) {
        if (pattern === event) {
          this.wildcardHandlers.delete(pattern);
        }
      }
    } else {
      this.events.clear();
      this.wildcardHandlers.clear();
      this.asyncHandlers.clear();
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    let count = 0;
    
    if (this.events.has(event)) {
      count += this.events.get(event).length;
    }
    
    // Count wildcard matches
    for (const [pattern, handlers] of this.wildcardHandlers) {
      const regex = this.patternToRegex(pattern);
      if (regex.test(event)) {
        count += handlers.length;
      }
    }
    
    return count;
  }

  /**
   * Get all events with listeners
   * @returns {Array<string>}
   */
  eventNames() {
    return [
      ...this.events.keys(),
      ...this.wildcardHandlers.keys()
    ];
  }

  /**
   * Convert pattern to regex
   * @private
   */
  patternToRegex(pattern) {
    const regexStr = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
    return new RegExp(`^${regexStr}$`);
  }

  /**
   * Generate unique handler ID
   * @private
   */
  generateHandlerId() {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add event to history
   * @private
   */
  addToHistory(event, data) {
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date(),
      listeners: this.listenerCount(event)
    });

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Update metrics
   * @private
   */
  updateMetrics(action, event) {
    this.metrics.totalEvents++;
    
    if (!this.metrics.eventCounts.has(event)) {
      this.metrics.eventCounts.set(event, 0);
    }
    
    if (action === 'emit') {
      this.metrics.eventCounts.set(
        event, 
        this.metrics.eventCounts.get(event) + 1
      );
    }
    
    if (!this.metrics.handlerCounts.has(event)) {
      this.metrics.handlerCounts.set(event, 0);
    }
    
    this.metrics.handlerCounts.set(event, this.listenerCount(event));
  }

  /**
   * Handle errors
   * @private
   */
  handleError(error, event, handler) {
    this.metrics.errors.push({
      error: error.message,
      event,
      handlerId: handler.id,
      timestamp: new Date()
    });

    if (this.debug) {
      console.error(`Error in event handler for '${event}':`, error);
    }

    // Emit error event
    if (event !== 'error') {
      this.emit('error', { error, event, handler });
    }
  }

  /**
   * Get event history
   * @param {string} event - Optional event filter
   * @returns {Array}
   */
  getHistory(event) {
    if (event) {
      return this.eventHistory.filter(h => h.event === event);
    }
    return [...this.eventHistory];
  }

  /**
   * Get metrics
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.metrics,
      eventCounts: Object.fromEntries(this.metrics.eventCounts),
      handlerCounts: Object.fromEntries(this.metrics.handlerCounts),
      activeEvents: this.events.size,
      wildcardPatterns: this.wildcardHandlers.size,
      asyncHandlers: this.asyncHandlers.size
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = {
      totalEvents: 0,
      eventCounts: new Map(),
      handlerCounts: new Map(),
      errors: []
    };
    this.eventHistory = [];
  }
}

/**
 * Create a singleton event bus for global use
 */
export const globalEventBus = new EventBus({ debug: false });

/**
 * Event types for type safety
 */
export const EventTypes = {
  // Module events
  MODULE_INIT: 'module:init',
  MODULE_READY: 'module:ready',
  MODULE_ERROR: 'module:error',
  MODULE_SHUTDOWN: 'module:shutdown',
  
  // Data events
  DATA_CREATED: 'data:created',
  DATA_UPDATED: 'data:updated',
  DATA_DELETED: 'data:deleted',
  DATA_SYNC: 'data:sync',
  
  // Calculation events
  CALC_START: 'calc:start',
  CALC_COMPLETE: 'calc:complete',
  CALC_ERROR: 'calc:error',
  
  // API events
  API_REQUEST: 'api:request',
  API_RESPONSE: 'api:response',
  API_ERROR: 'api:error',
  
  // System events
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info'
};

export default EventBus;