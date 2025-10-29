/**
 * @module KwRangeMapper
 * @description Maps kW values to service ranges - CRITICAL for Excel parity
 * Source: complete-calculation-engine.cjs (Aug 21, 2024)
 */

export class KwRangeMapper {
  constructor() {
    this.version = '5.0.0';

    // Define range boundaries - EXACT from Excel
    this.ranges = [
      { min: 0, max: 14, label: '2-14' },
      { min: 15, max: 30, label: '15-30' },
      { min: 31, max: 150, label: '35-150' },
      { min: 151, max: 250, label: '155-250' },
      { min: 251, max: 400, label: '255-400' },
      { min: 401, max: 500, label: '405-500' },
      { min: 501, max: 670, label: '505-670' },
      { min: 671, max: 1050, label: '675-1050' },
      { min: 1051, max: 1500, label: '1055-1500' },
      { min: 1501, max: 2050, label: '1500-2050' }
    ];
  }

  /**
     * Get kW range for a given kW value
     * @param {number} kw - Generator kW rating
     * @returns {string} Range label (e.g., '35-150')
     */
  getRange(kw) {
    // Validate input
    if (typeof kw !== 'number' || kw < 0) {
      throw new Error(`Invalid kW value: ${kw}`);
    }

    // Find matching range
    for (const range of this.ranges) {
      if (kw >= range.min && kw <= range.max) {
        return range.label;
      }
    }

    // Default to largest range if over 2050
    if (kw > 2050) {
      return '1500-2050';
    }

    // Default to smallest range if somehow not matched
    return '2-14';
  }

  /**
     * Get range using legacy method for backward compatibility
     * Matches exact logic from complete-calculation-engine.cjs
     * @param {number} kw - Generator kW rating
     * @returns {string} Range label
     */
  getRangeLegacy(kw) {
    if (kw <= 14) return '2-14';
    if (kw <= 30) return '15-30';
    if (kw <= 150) return '35-150';
    if (kw <= 250) return '155-250';
    if (kw <= 400) return '255-400';
    if (kw <= 500) return '405-500';
    if (kw <= 670) return '505-670';
    if (kw <= 1050) return '675-1050';
    if (kw <= 1500) return '1055-1500';
    return '1500-2050';
  }

  /**
     * Get all defined ranges
     * @returns {Array} All range definitions
     */
  getAllRanges() {
    return this.ranges.map(r => ({
      ...r,
      midpoint: Math.round((r.min + r.max) / 2)
    }));
  }

  /**
     * Check if a kW value is valid (within supported range)
     * @param {number} kw - Generator kW rating
     * @returns {boolean} True if valid
     */
  isValidKw(kw) {
    return typeof kw === 'number' && kw >= 2 && kw <= 2050;
  }

  /**
     * Get range info for a given kW value
     * @param {number} kw - Generator kW rating
     * @returns {Object} Range information
     */
  getRangeInfo(kw) {
    const range = this.getRange(kw);
    const rangeObj = this.ranges.find(r => r.label === range);

    return {
      kw,
      range,
      min: rangeObj.min,
      max: rangeObj.max,
      isAtBoundary: kw === rangeObj.min || kw === rangeObj.max
    };
  }
}

export default KwRangeMapper;
