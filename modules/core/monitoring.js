/**
 * Module Health Monitoring Service
 * Tracks module health, performance, and metrics
 * @module core/monitoring
 * @version 4.1.0
 */

import { EventBus } from './event-bus.js';

/**
 * Health check result
 * @typedef {Object} HealthCheckResult
 * @property {boolean} healthy - Overall health status
 * @property {string} status - Status message
 * @property {Object} modules - Module-specific health
 * @property {Object} system - System health metrics
 * @property {Date} timestamp - Check timestamp
 */

/**
 * Monitoring service for module health and metrics
 */
export class MonitoringService {
  constructor(options = {}) {
    this.modules = new Map();
    this.metrics = new Map();
    this.alerts = [];
    this.eventBus = options.eventBus || new EventBus();
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.alertThresholds = options.alertThresholds || this.getDefaultThresholds();
    this.maxAlertHistory = options.maxAlertHistory || 100;
    this.checkTimer = null;
    this.startTime = Date.now();
    this.logger = options.logger || console;
  }

  /**
   * Get default alert thresholds
   */
  getDefaultThresholds() {
    return {
      errorRate: 0.1, // 10% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.9, // 90% memory usage
      cpuUsage: 0.8, // 80% CPU usage
      uptime: 60000 // Minimum 1 minute uptime
    };
  }

  /**
   * Register a module for monitoring
   * @param {string} name - Module name
   * @param {Object} module - Module instance
   */
  registerModule(name, module) {
    this.modules.set(name, {
      module,
      lastCheck: null,
      status: 'unknown',
      metrics: {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastError: null
      }
    });

    this.logger.info(`Registered module for monitoring: ${name}`);
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.checkTimer) {
      this.logger.warn('Monitoring already started');
      return;
    }

    this.checkTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    // Perform initial check
    this.performHealthCheck();

    this.logger.info('Monitoring service started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.logger.info('Monitoring service stopped');
    }
  }

  /**
   * Perform health check on all modules
   * @returns {HealthCheckResult}
   */
  async performHealthCheck() {
    const results = {
      healthy: true,
      status: 'healthy',
      modules: {},
      system: await this.getSystemMetrics(),
      timestamp: new Date()
    };

    // Check each module
    for (const [name, data] of this.modules) {
      try {
        const moduleHealth = await this.checkModuleHealth(name, data);
        results.modules[name] = moduleHealth;
        
        if (!moduleHealth.healthy) {
          results.healthy = false;
          results.status = 'degraded';
        }
        
        data.lastCheck = Date.now();
        data.status = moduleHealth.healthy ? 'healthy' : 'unhealthy';
      } catch (error) {
        this.logger.error(`Health check failed for module ${name}:`, error);
        results.modules[name] = {
          healthy: false,
          status: 'error',
          error: error.message
        };
        results.healthy = false;
        results.status = 'critical';
      }
    }

    // Check system health
    if (!this.isSystemHealthy(results.system)) {
      results.healthy = false;
      results.status = results.status === 'critical' ? 'critical' : 'degraded';
    }

    // Emit health check event
    this.eventBus.emit('monitoring:healthCheck', results);

    // Check for alerts
    this.checkAlerts(results);

    return results;
  }

  /**
   * Check module health
   * @private
   */
  async checkModuleHealth(name, data) {
    const { module } = data;
    
    // Get module's own health status if available
    if (typeof module.getHealth === 'function') {
      const health = await module.getHealth();
      
      // Update metrics
      if (health.metrics) {
        this.updateModuleMetrics(name, health.metrics);
      }
      
      return {
        healthy: health.healthy,
        status: health.status,
        uptime: health.uptime,
        metrics: health.metrics,
        checks: health.checks
      };
    }

    // Fallback health check
    return {
      healthy: module.state === 'initialized',
      status: module.state || 'unknown',
      uptime: module.startTime ? Date.now() - module.startTime : 0,
      metrics: data.metrics
    };
  }

  /**
   * Update module metrics
   * @private
   */
  updateModuleMetrics(name, metrics) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const history = this.metrics.get(name);
    history.push({
      ...metrics,
      timestamp: Date.now()
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get system metrics
   * @private
   */
  async getSystemMetrics() {
    const metrics = {
      uptime: Date.now() - this.startTime,
      memory: this.getMemoryMetrics(),
      timestamp: Date.now()
    };

    // Add CPU metrics if available
    if (typeof process !== 'undefined' && process.cpuUsage) {
      metrics.cpu = process.cpuUsage();
    }

    return metrics;
  }

  /**
   * Get memory metrics
   * @private
   */
  getMemoryMetrics() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external,
        percentage: usage.heapUsed / usage.heapTotal
      };
    }

    return {
      heapUsed: 0,
      heapTotal: 0,
      percentage: 0
    };
  }

  /**
   * Check if system is healthy
   * @private
   */
  isSystemHealthy(system) {
    // Check memory usage
    if (system.memory.percentage > this.alertThresholds.memoryUsage) {
      return false;
    }

    // Check uptime
    if (system.uptime < this.alertThresholds.uptime) {
      return false;
    }

    return true;
  }

  /**
   * Check for alert conditions
   * @private
   */
  checkAlerts(results) {
    const alerts = [];

    // Check module health
    for (const [name, health] of Object.entries(results.modules)) {
      if (!health.healthy) {
        alerts.push({
          type: 'module_unhealthy',
          severity: 'warning',
          module: name,
          message: `Module ${name} is unhealthy: ${health.status}`,
          timestamp: new Date()
        });
      }

      // Check error rate
      if (health.metrics && health.metrics.errorRate) {
        const errorRate = parseFloat(health.metrics.errorRate) / 100;
        if (errorRate > this.alertThresholds.errorRate) {
          alerts.push({
            type: 'high_error_rate',
            severity: 'warning',
            module: name,
            message: `Module ${name} has high error rate: ${health.metrics.errorRate}`,
            timestamp: new Date()
          });
        }
      }
    }

    // Check system health
    if (results.system.memory.percentage > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'critical',
        message: `High memory usage: ${(results.system.memory.percentage * 100).toFixed(2)}%`,
        timestamp: new Date()
      });
    }

    // Add alerts to history
    for (const alert of alerts) {
      this.addAlert(alert);
      this.eventBus.emit('monitoring:alert', alert);
    }
  }

  /**
   * Add alert to history
   * @private
   */
  addAlert(alert) {
    this.alerts.push(alert);
    
    // Trim alerts if needed
    if (this.alerts.length > this.maxAlertHistory) {
      this.alerts.shift();
    }
    
    this.logger.warn(`Alert: ${alert.message}`);
  }

  /**
   * Get monitoring dashboard data
   * @returns {Object}
   */
  getDashboard() {
    const dashboard = {
      status: 'healthy',
      uptime: Date.now() - this.startTime,
      modules: {},
      alerts: this.getRecentAlerts(),
      metrics: {
        totalModules: this.modules.size,
        healthyModules: 0,
        unhealthyModules: 0
      }
    };

    // Aggregate module status
    for (const [name, data] of this.modules) {
      dashboard.modules[name] = {
        status: data.status,
        lastCheck: data.lastCheck,
        metrics: data.metrics
      };

      if (data.status === 'healthy') {
        dashboard.metrics.healthyModules++;
      } else {
        dashboard.metrics.unhealthyModules++;
      }
    }

    // Determine overall status
    if (dashboard.metrics.unhealthyModules > 0) {
      dashboard.status = dashboard.metrics.unhealthyModules === dashboard.metrics.totalModules 
        ? 'critical' 
        : 'degraded';
    }

    return dashboard;
  }

  /**
   * Get recent alerts
   * @param {number} count - Number of alerts to return
   * @returns {Array}
   */
  getRecentAlerts(count = 10) {
    return this.alerts.slice(-count);
  }

  /**
   * Get module metrics history
   * @param {string} name - Module name
   * @returns {Array}
   */
  getModuleMetrics(name) {
    return this.metrics.get(name) || [];
  }

  /**
   * Record custom metric
   * @param {string} module - Module name
   * @param {string} metric - Metric name
   * @param {any} value - Metric value
   */
  recordMetric(module, metric, value) {
    if (!this.modules.has(module)) {
      this.logger.warn(`Module ${module} not registered for monitoring`);
      return;
    }

    const data = this.modules.get(module);
    data.metrics[metric] = value;
    
    // Emit metric event
    this.eventBus.emit('monitoring:metric', {
      module,
      metric,
      value,
      timestamp: new Date()
    });
  }

  /**
   * Set alert threshold
   * @param {string} threshold - Threshold name
   * @param {number} value - Threshold value
   */
  setThreshold(threshold, value) {
    this.alertThresholds[threshold] = value;
    this.logger.info(`Updated alert threshold ${threshold} to ${value}`);
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
    this.logger.info('Cleared all alerts');
  }

  /**
   * Export metrics for analysis
   * @returns {Object}
   */
  exportMetrics() {
    const exported = {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      modules: {},
      alerts: this.alerts,
      system: this.getSystemMetrics()
    };

    for (const [name, metrics] of this.metrics) {
      exported.modules[name] = metrics;
    }

    return exported;
  }

  /**
   * Generate health report
   * @returns {string}
   */
  async generateReport() {
    const health = await this.performHealthCheck();
    const dashboard = this.getDashboard();
    
    let report = `
# Health Report
Generated: ${new Date().toISOString()}

## System Status
- Overall: ${health.status}
- Uptime: ${Math.floor(dashboard.uptime / 1000 / 60)} minutes
- Memory Usage: ${(health.system.memory.percentage * 100).toFixed(2)}%

## Module Status
`;

    for (const [name, status] of Object.entries(dashboard.modules)) {
      report += `\n### ${name}
- Status: ${status.status}
- Last Check: ${new Date(status.lastCheck).toISOString()}
- Error Rate: ${status.metrics.errorRate || 'N/A'}
- Requests: ${status.metrics.requests || 0}
`;
    }

    if (dashboard.alerts.length > 0) {
      report += '\n## Recent Alerts\n';
      for (const alert of dashboard.alerts) {
        report += `- [${alert.severity}] ${alert.message} (${alert.timestamp})\n`;
      }
    }

    return report;
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();
export default monitoring;