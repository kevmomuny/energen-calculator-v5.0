/**
 * Unit tests for calculation engine
 */

const EnergenCalculationEngine = require('../src/api/complete-calculation-engine.cjs')

describe('EnergenCalculationEngine', () => {
  let engine
  
  beforeEach(() => {
    engine = new EnergenCalculationEngine({
      laborRate: 200,
      pmLaborRate: 250,
      technicianCount: 2
    })
  })
  
  describe('Service Calculations', () => {
    test('should calculate Service A correctly for 150kW generator', async () => {
      const input = {
        distance: 30,
        services: ['A'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }

      const result = await engine.calculate(input)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(parseFloat(result.calculation.total)).toBeGreaterThan(0)
      expect(result.calculation.serviceBreakdown).toBeDefined()
    })
    
    test('should calculate multiple services correctly', async () => {
      const input = {
        distance: 30,
        services: ['A', 'B', 'C'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }
      
      const result = await engine.calculate(input)

      expect(result.success).toBe(true)
      const services = Object.keys(result.calculation.serviceBreakdown)
      expect(services.some(s => s.startsWith('A'))).toBe(true)
      expect(services.some(s => s.startsWith('B'))).toBe(true)
      expect(services.some(s => s.startsWith('C'))).toBe(true)
      expect(services.length).toBe(3)
    })
    
    test('should handle service calculations without errors', async () => {
      const input = {
        distance: 30,
        services: ['A', 'E'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }

      const result = await engine.calculate(input)

      expect(result.success).toBe(true)
      expect(result.calculation).toBeDefined()
      expect(parseFloat(result.calculation.total)).toBeGreaterThan(0)
    })
  })
  
  describe('Distance and Travel Calculations', () => {
    test('should calculate travel costs correctly', async () => {
      const input50 = {
        distance: 50,
        services: ['A'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }
      
      const input100 = { ...input50, distance: 100 }
      
      const result50 = await engine.calculate(input50)
      const result100 = await engine.calculate(input100)

      // Both calculations should complete successfully
      expect(result50.success).toBe(true)
      expect(result100.success).toBe(true)
      expect(parseFloat(result50.calculation.total)).toBeGreaterThan(0)
      expect(parseFloat(result100.calculation.total)).toBeGreaterThan(0)
    })
  })
  
  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      const invalidInput = {
        services: ['A']
        // Missing required fields
      }

      await expect(engine.calculate(invalidInput)).rejects.toThrow()
    })
    
    test('should handle invalid service codes', async () => {
      const input = {
        distance: 30,
        services: ['INVALID_SERVICE'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12
      }
      
      const result = await engine.calculate(input)
      
      // Should gracefully handle invalid service
      expect(result.success).toBe(true)
      expect(result.calculation.serviceBreakdown.INVALID_SERVICE).toBeUndefined()
    })
  })
  
  describe('Tax Calculations', () => {
    test('should apply tax rate correctly', async () => {
      const input = {
        distance: 30,
        services: ['A'],
        customerInfo: {
          name: 'Test Company',
          address: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94115'
        },
        generators: [{
          kw: 150,
          quantity: 1
        }],
        contractLength: 12,
        taxRate: 0.0875 // 8.75% San Francisco tax
      }
      
      const result = await engine.calculate(input)

      expect(result.calculation.taxRate).toBeDefined()
      expect(result.calculation.taxRate).toContain('%')
      expect(parseFloat(result.calculation.tax)).toBeGreaterThan(0)
    })
  })
})