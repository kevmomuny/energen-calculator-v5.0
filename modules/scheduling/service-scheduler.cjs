/**
 * Service Scheduling Module
 * Generates optimized quarterly service schedules for multi-unit contracts
 *
 * @module scheduling/service-scheduler
 * @version 1.0.0
 *
 * RULES:
 * 1. Avoid rainy months for load bank testing (Service E)
 * 2. Don't couple heavy services with other heavy services same day
 * 3. Fluid tests (Service D) precede fluid services (B/C)
 * 4. Service A (quarterly) happens every quarter for all units
 * 5. Optimize for crew size and daily labor hour limits
 */

class ServiceScheduler {
  constructor(config = {}) {
    this.config = {
      crewSize: config.crewSize || 3,
      hoursPerTech: config.hoursPerTech || 6,
      maxDailyHours: config.maxDailyHours || 18,
      location: config.location || 'Sacramento, CA',
      ...config
    };

    // Weather data by location
    this.weatherPatterns = {
      'Sacramento, CA': {
        rainyMonths: [11, 12, 1, 2, 3],  // Nov-Mar
        dryMonths: [4, 5, 6, 7, 8, 9, 10], // Apr-Oct
        bestLoadBankMonths: [4, 5, 6, 7, 8, 9] // Apr-Sep
      }
    };

    // Service labor hours by kW range
    this.serviceLaborHours = {
      'A': {
        '2-14': 1, '15-30': 1, '35-150': 2, '151-250': 2,
        '251-400': 2.5, '401-500': 2.5, '501-670': 3,
        '671-1050': 3, '1051-1500': 4, '1501-2050': 4
      },
      'B': {
        '2-14': 1, '15-30': 1, '35-150': 2, '151-250': 2,
        '251-400': 4, '401-500': 6, '501-670': 8,
        '671-1050': 12, '1051-1500': 16, '1501-2050': 16
      },
      'C': {
        '2-14': 2, '15-30': 2, '35-150': 2, '151-250': 3,
        '251-400': 3, '401-500': 4, '501-670': 4,
        '671-1050': 6, '1051-1500': 6, '1501-2050': 8
      },
      'D': {
        // Fluid testing - no field labor, lab only
        'all': 0
      },
      'E': {
        '2-14': 3, '15-30': 3, '35-150': 3, '151-250': 4,
        '251-400': 6, '401-500': 6, '501-670': 8,
        '671-1050': 8, '1051-1500': 8, '1501-2050': 12
      },
      'I': {
        '2-14': 2, '15-30': 2, '35-150': 3, '151-250': 3,
        '251-400': 4, '401-500': 4, '501-670': 6,
        '671-1050': 6, '1051-1500': 6, '1501-2050': 6
      }
    };

    // Service classifications
    this.heavyServices = ['B', 'C', 'E']; // High labor hours
    this.lightServices = ['A', 'D', 'I']; // Lower labor hours
    this.fluidTestService = 'D';
    this.fluidServices = ['B', 'C']; // Must follow D
    this.loadBankService = 'E'; // Weather sensitive
  }

  /**
     * Get kW range key for labor lookup
     */
  getKwRange(kw) {
    if (kw <= 14) return '2-14';
    if (kw <= 30) return '15-30';
    if (kw <= 150) return '35-150';
    if (kw <= 250) return '151-250';
    if (kw <= 400) return '251-400';
    if (kw <= 500) return '401-500';
    if (kw <= 670) return '501-670';
    if (kw <= 1050) return '671-1050';
    if (kw <= 1500) return '1051-1500';
    return '1501-2050';
  }

  /**
     * Get labor hours for a specific service and unit
     */
  getLaborHours(serviceCode, kw) {
    const kwRange = this.getKwRange(kw);
    const serviceData = this.serviceLaborHours[serviceCode];

    if (!serviceData) return 0;
    if (serviceData.all !== undefined) return serviceData.all;

    return serviceData[kwRange] || 0;
  }

  /**
     * Check if service is heavy labor
     */
  isHeavyService(serviceCode, kw) {
    const hours = this.getLaborHours(serviceCode, kw);
    return hours >= 6;
  }

  /**
     * Generate quarterly schedule for multiple units at same site
     */
  generateSchedule(units, services, options = {}) {
    const contractStart = options.contractStart || new Date();
    const schedule = {
      Q1: [],
      Q2: [],
      Q3: [],
      Q4: []
    };

    // Q1: Service A (all units) + Service D sample collection (all units)
    if (services.includes('A')) {
      schedule.Q1 = this.scheduleQuarterlyServiceA(units, 1, contractStart);
    }

    if (services.includes('D')) {
      // Add D sample collection to Q1 visits
      schedule.Q1 = this.addFluidSampleCollection(schedule.Q1, units);
    }

    // Q2: Service A + Service E (Load Bank - dry weather)
    if (services.includes('A')) {
      schedule.Q2 = this.scheduleQuarterlyServiceA(units, 2, contractStart);
    }

    if (services.includes('E')) {
      schedule.Q2 = this.scheduleLoadBankTesting(schedule.Q2, units);
    }

    // Q3: Service A + Service B (Oil & Filter - after D results)
    if (services.includes('A')) {
      schedule.Q3 = this.scheduleQuarterlyServiceA(units, 3, contractStart);
    }

    if (services.includes('B')) {
      schedule.Q3 = this.scheduleServiceB(schedule.Q3, units, services.includes('I'));
    }

    // Q4: Service A + Service C + Service I
    if (services.includes('A')) {
      schedule.Q4 = this.scheduleQuarterlyServiceA(units, 4, contractStart);
    }

    if (services.includes('C')) {
      schedule.Q4 = this.scheduleServiceC(schedule.Q4, units, services.includes('I'));
    }

    return {
      schedule,
      summary: this.generateScheduleSummary(schedule),
      metadata: {
        crewSize: this.config.crewSize,
        location: this.config.location,
        totalUnits: units.length,
        services: services,
        generatedAt: new Date()
      }
    };
  }

  /**
     * Schedule Service A (quarterly inspection) for all units
     */
  scheduleQuarterlyServiceA(units, quarter, contractStart) {
    const visits = [];
    const quarterStartMonth = ((quarter - 1) * 3);

    // Group units to optimize crew utilization
    let currentVisit = {
      quarter,
      day: 1,
      date: this.calculateDate(contractStart, quarterStartMonth, 1),
      units: [],
      services: [],
      totalHours: 0
    };

    for (const unit of units) {
      const serviceAHours = this.getLaborHours('A', unit.kw);

      // Check if adding this unit would exceed daily limit
      if (currentVisit.totalHours + serviceAHours > this.config.maxDailyHours) {
        // Save current visit and start new day
        visits.push(currentVisit);
        currentVisit = {
          quarter,
          day: visits.length + 1,
          date: this.calculateDate(contractStart, quarterStartMonth, visits.length + 1),
          units: [],
          services: [],
          totalHours: 0
        };
      }

      currentVisit.units.push({
        unitId: unit.id || unit.name,
        unitName: unit.name,
        kw: unit.kw
      });
      currentVisit.services.push({
        code: 'A',
        name: 'Comprehensive Inspection',
        hours: serviceAHours
      });
      currentVisit.totalHours += serviceAHours;
    }

    // Add final visit
    if (currentVisit.units.length > 0) {
      visits.push(currentVisit);
    }

    return visits;
  }

  /**
     * Add fluid sample collection to existing Q1 visits
     */
  addFluidSampleCollection(visits, units) {
    // Find or create a visit for sample collection
    if (visits.length === 0) return visits;

    // Add to last Q1 visit (minimal time impact)
    const lastVisit = visits[visits.length - 1];
    lastVisit.services.push({
      code: 'D',
      name: 'Fluid Sample Collection (All Units)',
      hours: 0.5, // Minimal time to collect samples
      units: units.map(u => u.id || u.name)
    });
    lastVisit.totalHours += 0.5;
    lastVisit.notes = 'Collect oil, coolant, and fuel samples from all units for laboratory analysis';

    return visits;
  }

  /**
     * Schedule Service E (Load Bank) in dry weather months
     */
  scheduleLoadBankTesting(existingVisits, units) {
    const visits = [...existingVisits];
    const weather = this.weatherPatterns[this.config.location];

    // Schedule each unit's load bank on separate day (heavy service)
    for (const unit of units) {
      const serviceEHours = this.getLaborHours('E', unit.kw);

      visits.push({
        quarter: 2,
        day: visits.length + 1,
        date: null, // Calculate based on weather
        units: [{
          unitId: unit.id || unit.name,
          unitName: unit.name,
          kw: unit.kw
        }],
        services: [{
          code: 'E',
          name: 'Load Bank Testing',
          hours: serviceEHours
        }],
        totalHours: serviceEHours,
        weatherConstraint: 'Dry weather required',
        notes: `Schedule during ${weather.bestLoadBankMonths.map(m => this.getMonthName(m)).join(', ')}`
      });
    }

    return visits;
  }

  /**
     * Schedule Service B (Oil & Filter) - heavy service
     */
  scheduleServiceB(existingVisits, units, includeServiceI) {
    const visits = [...existingVisits];

    for (const unit of units) {
      const serviceBHours = this.getLaborHours('B', unit.kw);
      const isHeavy = serviceBHours >= 12;

      const visit = {
        quarter: 3,
        day: visits.length + 1,
        date: null,
        units: [{
          unitId: unit.id || unit.name,
          unitName: unit.name,
          kw: unit.kw
        }],
        services: [{
          code: 'B',
          name: 'Oil & Filter Service',
          hours: serviceBHours
        }],
        totalHours: serviceBHours
      };

      // Couple Service I with B only if B is not heavy for this unit
      if (includeServiceI && !isHeavy && unit.kw <= 500) {
        const serviceIHours = this.getLaborHours('I', unit.kw);
        visit.services.push({
          code: 'I',
          name: 'Transfer Switch Service',
          hours: serviceIHours
        });
        visit.totalHours += serviceIHours;
        visit.notes = 'Lightweight unit - coupled B and I services';
      }

      visits.push(visit);
    }

    return visits;
  }

  /**
     * Schedule Service C (Coolant) - moderate to heavy service
     */
  scheduleServiceC(existingVisits, units, includeServiceI) {
    const visits = [...existingVisits];

    for (const unit of units) {
      const serviceCHours = this.getLaborHours('C', unit.kw);
      const serviceIHours = this.getLaborHours('I', unit.kw);

      const visit = {
        quarter: 4,
        day: visits.length + 1,
        date: null,
        units: [{
          unitId: unit.id || unit.name,
          unitName: unit.name,
          kw: unit.kw
        }],
        services: [{
          code: 'C',
          name: 'Coolant Service',
          hours: serviceCHours
        }],
        totalHours: serviceCHours
      };

      // Add Service I if not already scheduled with B
      if (includeServiceI) {
        const alreadyScheduled = existingVisits.some(v =>
          v.units.some(u => u.unitId === (unit.id || unit.name)) &&
                    v.services.some(s => s.code === 'I')
        );

        if (!alreadyScheduled) {
          visit.services.push({
            code: 'I',
            name: 'Transfer Switch Service',
            hours: serviceIHours
          });
          visit.totalHours += serviceIHours;
        }
      }

      visits.push(visit);
    }

    return visits;
  }

  /**
     * Calculate date for a visit
     */
  calculateDate(contractStart, monthOffset, dayOffset) {
    const date = new Date(contractStart);
    date.setMonth(date.getMonth() + monthOffset);
    date.setDate(date.getDate() + (dayOffset - 1));
    return date;
  }

  /**
     * Get month name from number
     */
  getMonthName(month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  /**
     * Generate schedule summary
     */
  generateScheduleSummary(schedule) {
    let totalDays = 0;
    let totalHours = 0;
    const serviceCount = {};

    for (const quarter in schedule) {
      const visits = schedule[quarter];
      totalDays += visits.length;

      for (const visit of visits) {
        totalHours += visit.totalHours;
        for (const service of visit.services) {
          serviceCount[service.code] = (serviceCount[service.code] || 0) + 1;
        }
      }
    }

    return {
      totalDays,
      totalHours,
      averageHoursPerDay: totalHours / totalDays,
      servicesPerformed: serviceCount,
      quarterlyDistribution: {
        Q1: schedule.Q1.length,
        Q2: schedule.Q2.length,
        Q3: schedule.Q3.length,
        Q4: schedule.Q4.length
      }
    };
  }

  /**
     * Format schedule for PDF display
     */
  formatForPDF(schedule) {
    const formatted = [];

    for (const quarter in schedule) {
      const visits = schedule[quarter];

      for (const visit of visits) {
        formatted.push({
          quarter,
          day: visit.day,
          date: visit.date ? visit.date.toLocaleDateString() : 'TBD',
          units: visit.units.map(u => u.unitName).join(', '),
          services: visit.services.map(s => `${s.code} (${s.hours}hr)`).join(', '),
          totalHours: visit.totalHours,
          notes: visit.notes || ''
        });
      }
    }

    return formatted;
  }
}

module.exports = ServiceScheduler;
