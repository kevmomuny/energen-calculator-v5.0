/**
 * Reports View Module
 * Provides analytics and reporting functionality with Zoho integration
 * Data sources: Local quote files + Zoho CRM via MCP tools
 */

import Chart from 'chart.js/auto';

class ReportsView {
    constructor() {
        this.charts = {};
        this.currentData = null;
        this.dateRange = 30; // Default to last 30 days
    }

    /**
     * Initialize the reports view
     */
    async initialize() {
        console.log('Initializing Reports View...');

        // Set up event listeners
        const dateRangeSelect = document.getElementById('reportsDateRange');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.dateRange = e.target.value;
                this.refreshReports();
            });
        }

        // Load initial data
        await this.refreshReports();
    }

    /**
     * Refresh all reports data
     */
    async refreshReports() {
        try {
            console.log(`Loading reports for date range: ${this.dateRange} days`);

            // Show loading state
            this.showLoading();

            // Load data from local quotes
            const localData = await this.loadLocalQuotes();

            // Try to augment with Zoho data (if available)
            let zohoData = null;
            try {
                zohoData = await this.loadZohoData();
            } catch (error) {
                console.warn('Zoho data unavailable, using local data only:', error.message);
            }

            // Merge and process data
            this.currentData = this.processData(localData, zohoData);

            // Update all visualizations
            this.updateKPIs(this.currentData);
            this.renderServiceBreakdown(this.currentData);
            this.renderQuotesTimeline(this.currentData);
            this.renderTopCustomers(this.currentData);
            this.renderKWDistribution(this.currentData);

            console.log('Reports refreshed successfully');
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showError(error.message);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const kpiValues = ['kpi-total-quotes', 'kpi-total-revenue', 'kpi-avg-quote', 'kpi-total-customers'];
        kpiValues.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '...';
        });

        const kpiChanges = ['kpi-quotes-change', 'kpi-revenue-change', 'kpi-avg-change', 'kpi-customers-change'];
        kpiChanges.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Loading...';
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        const kpiChanges = ['kpi-quotes-change', 'kpi-revenue-change', 'kpi-avg-change', 'kpi-customers-change'];
        kpiChanges.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Error loading data';
        });
    }

    /**
     * Load quotes from local data/quotes directory
     */
    async loadLocalQuotes() {
        try {
            const response = await fetch('/api/reports/local-quotes');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('Failed to load local quotes from API, trying fallback:', error);

            // Fallback: Return empty array if API not available yet
            return [];
        }
    }

    /**
     * Load data from Zoho CRM using MCP tools
     */
    async loadZohoData() {
        // This would call Zoho analytics MCP tools when available
        // For now, return null
        return null;
    }

    /**
     * Process and merge data from multiple sources
     */
    processData(localQuotes, zohoData) {
        const now = new Date();
        const cutoffDate = this.dateRange === 'all' ? new Date(0) : new Date(now - this.dateRange * 24 * 60 * 60 * 1000);

        // Filter by date range
        const filteredQuotes = localQuotes.filter(quote => {
            const quoteDate = new Date(quote.timestamp);
            return quoteDate >= cutoffDate;
        });

        // Calculate metrics
        const totalQuotes = filteredQuotes.length;

        // Extract revenue from each quote
        const quotesWithRevenue = filteredQuotes.map(quote => {
            // Try to parse revenue from various possible locations
            let revenue = 0;

            if (quote.total) {
                // If total is a number
                revenue = typeof quote.total === 'number' ? quote.total : 0;
            } else if (quote.quote?.total) {
                revenue = this.parseMoneyString(quote.quote.total);
            } else if (quote.summary?.total) {
                revenue = this.parseMoneyString(quote.summary.total);
            }

            return { ...quote, revenue };
        });

        const totalRevenue = quotesWithRevenue.reduce((sum, q) => sum + q.revenue, 0);
        const avgQuote = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;

        // Unique customers
        const customers = new Set(filteredQuotes.map(q =>
            q.customer?.companyName || q.customer?.company || q.customer?.name || 'Unknown'
        ));

        // Service breakdown
        const serviceRevenue = {};
        const serviceCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'CUSTOM'];

        quotesWithRevenue.forEach(quote => {
            const services = quote.services || [];
            const quotedRevenue = quote.revenue / services.length; // Distribute evenly

            services.forEach(service => {
                if (serviceCodes.includes(service)) {
                    serviceRevenue[service] = (serviceRevenue[service] || 0) + quotedRevenue;
                }
            });
        });

        // Timeline data (group by day)
        const timeline = {};
        filteredQuotes.forEach(quote => {
            const date = new Date(quote.timestamp).toISOString().split('T')[0];
            timeline[date] = (timeline[date] || 0) + 1;
        });

        // Top customers
        const customerRevenue = {};
        quotesWithRevenue.forEach(quote => {
            const customer = quote.customer?.companyName || quote.customer?.company || 'Unknown';
            customerRevenue[customer] = (customerRevenue[customer] || 0) + quote.revenue;
        });

        const topCustomers = Object.entries(customerRevenue)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, revenue]) => ({ name, revenue }));

        // kW distribution
        const kwRanges = {
            '0-100kW': 0,
            '101-250kW': 0,
            '251-500kW': 0,
            '501-1000kW': 0,
            '1000kW+': 0
        };

        filteredQuotes.forEach(quote => {
            const generators = quote.generators || [];
            generators.forEach(gen => {
                const kw = gen.kw || 0;
                if (kw <= 100) kwRanges['0-100kW']++;
                else if (kw <= 250) kwRanges['101-250kW']++;
                else if (kw <= 500) kwRanges['251-500kW']++;
                else if (kw <= 1000) kwRanges['501-1000kW']++;
                else kwRanges['1000kW+']++;
            });
        });

        return {
            totalQuotes,
            totalRevenue,
            avgQuote,
            totalCustomers: customers.size,
            serviceRevenue,
            timeline,
            topCustomers,
            kwRanges
        };
    }

    /**
     * Parse money string like "$1,234.56" to number
     */
    parseMoneyString(str) {
        if (typeof str === 'number') return str;
        if (!str) return 0;

        const cleaned = str.toString().replace(/[$,]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Update KPI cards
     */
    updateKPIs(data) {
        // Total Quotes
        const quotesEl = document.getElementById('kpi-total-quotes');
        if (quotesEl) quotesEl.textContent = data.totalQuotes.toLocaleString();

        const quotesChangeEl = document.getElementById('kpi-quotes-change');
        if (quotesChangeEl) quotesChangeEl.textContent = `${this.dateRange} days`;

        // Total Revenue
        const revenueEl = document.getElementById('kpi-total-revenue');
        if (revenueEl) revenueEl.textContent = '$' + data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        const revenueChangeEl = document.getElementById('kpi-revenue-change');
        if (revenueChangeEl) revenueChangeEl.textContent = `${this.dateRange} days`;

        // Avg Quote
        const avgEl = document.getElementById('kpi-avg-quote');
        if (avgEl) avgEl.textContent = '$' + data.avgQuote.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        const avgChangeEl = document.getElementById('kpi-avg-change');
        if (avgChangeEl) avgChangeEl.textContent = data.totalQuotes > 0 ? 'Per quote' : 'No data';

        // Total Customers
        const customersEl = document.getElementById('kpi-total-customers');
        if (customersEl) customersEl.textContent = data.totalCustomers.toLocaleString();

        const customersChangeEl = document.getElementById('kpi-customers-change');
        if (customersChangeEl) customersChangeEl.textContent = `${this.dateRange} days`;
    }

    /**
     * Render service revenue breakdown pie chart
     */
    renderServiceBreakdown(data) {
        const ctx = document.getElementById('serviceBreakdownChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.serviceBreakdown) {
            this.charts.serviceBreakdown.destroy();
        }

        const services = Object.keys(data.serviceRevenue);
        const revenues = Object.values(data.serviceRevenue);

        if (services.length === 0) {
            ctx.getContext('2d').font = '14px sans-serif';
            ctx.getContext('2d').fillStyle = '#666';
            ctx.getContext('2d').textAlign = 'center';
            ctx.getContext('2d').fillText('No data available', ctx.width / 2, ctx.height / 2);
            return;
        }

        this.charts.serviceBreakdown = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: services.map(s => `Service ${s}`),
                datasets: [{
                    data: revenues,
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
                        '#f97316', '#6366f1', '#14b8a6', '#a855f7'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#d1d5db',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render quotes over time line chart
     */
    renderQuotesTimeline(data) {
        const ctx = document.getElementById('quotesTimelineChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.quotesTimeline) {
            this.charts.quotesTimeline.destroy();
        }

        const dates = Object.keys(data.timeline).sort();
        const counts = dates.map(date => data.timeline[date]);

        if (dates.length === 0) {
            ctx.getContext('2d').font = '14px sans-serif';
            ctx.getContext('2d').fillStyle = '#666';
            ctx.getContext('2d').textAlign = 'center';
            ctx.getContext('2d').fillText('No data available', ctx.width / 2, ctx.height / 2);
            return;
        }

        this.charts.quotesTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Quotes Generated',
                    data: counts,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ca3af',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#d1d5db'
                        }
                    }
                }
            }
        });
    }

    /**
     * Render top customers table
     */
    renderTopCustomers(data) {
        const container = document.getElementById('topCustomersTable');
        if (!container) return;

        if (data.topCustomers.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No customer data available</div>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="border-bottom: 1px solid var(--border-subtle);">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">#</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Customer</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Revenue</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.topCustomers.forEach((customer, index) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border-subtle)';
            row.innerHTML = `
                <td style="padding: 12px; color: var(--text-tertiary);">${index + 1}</td>
                <td style="padding: 12px; color: var(--text-primary);">${customer.name}</td>
                <td style="padding: 12px; text-align: right; color: var(--accent-success); font-weight: 600;">$${customer.revenue.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.innerHTML = '';
        container.appendChild(table);
    }

    /**
     * Render kW distribution bar chart
     */
    renderKWDistribution(data) {
        const ctx = document.getElementById('kwDistributionChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.kwDistribution) {
            this.charts.kwDistribution.destroy();
        }

        const ranges = Object.keys(data.kwRanges);
        const counts = Object.values(data.kwRanges);

        if (counts.every(c => c === 0)) {
            ctx.getContext('2d').font = '14px sans-serif';
            ctx.getContext('2d').fillStyle = '#666';
            ctx.getContext('2d').textAlign = 'center';
            ctx.getContext('2d').fillText('No generator data available', ctx.width / 2, ctx.height / 2);
            return;
        }

        this.charts.kwDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ranges,
                datasets: [{
                    label: 'Number of Generators',
                    data: counts,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ca3af'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#d1d5db'
                        }
                    }
                }
            }
        });
    }

    /**
     * Export data to CSV
     */
    async exportToCSV() {
        if (!this.currentData) {
            alert('No data to export');
            return;
        }

        const csv = [];
        csv.push('Quote Summary Report');
        csv.push(`Date Range: ${this.dateRange} days`);
        csv.push('');
        csv.push('Summary Metrics');
        csv.push(`Total Quotes,${this.currentData.totalQuotes}`);
        csv.push(`Total Revenue,$${this.currentData.totalRevenue.toFixed(2)}`);
        csv.push(`Average Quote,$${this.currentData.avgQuote.toFixed(2)}`);
        csv.push(`Total Customers,${this.currentData.totalCustomers}`);
        csv.push('');
        csv.push('Top Customers');
        csv.push('Rank,Customer Name,Revenue');
        this.currentData.topCustomers.forEach((c, i) => {
            csv.push(`${i + 1},${c.name},$${c.revenue.toFixed(2)}`);
        });

        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `energen-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export to PDF (uses existing PDF service)
     */
    async exportToPDF() {
        alert('PDF export feature coming soon - will use existing PDF generation service');
    }

    /**
     * Export chart as image
     */
    async exportChart(chartName) {
        const chartMap = {
            'service-breakdown': this.charts.serviceBreakdown,
            'quotes-timeline': this.charts.quotesTimeline,
            'kw-distribution': this.charts.kwDistribution
        };

        const chart = chartMap[chartName];
        if (!chart) {
            alert('Chart not found');
            return;
        }

        const url = chart.toBase64Image();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;
        a.click();
    }

    /**
     * Export table to CSV
     */
    async exportTable(tableName) {
        if (tableName === 'top-customers') {
            const csv = ['Rank,Customer Name,Revenue'];
            this.currentData.topCustomers.forEach((c, i) => {
                csv.push(`${i + 1},${c.name},$${c.revenue.toFixed(2)}`);
            });

            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `top-customers-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
}

// Create singleton instance
const reportsView = new ReportsView();

// Export for global access
window.reportsView = reportsView;

export default reportsView;
