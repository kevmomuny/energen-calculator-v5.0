/**
 * analyze-equipment.cjs - Equipment List Parser
 *
 * Parses Excel/CSV equipment lists and generates Zoho-compatible JSON
 *
 * Features:
 * - Excel (.xlsx) and CSV parsing
 * - Column auto-detection (flexible headers)
 * - Data inference (fuel type from make, DPF from year/kW)
 * - kW range classification (10 kW buckets)
 * - Zoho CRM field mapping
 *
 * Usage:
 *   const analyzeEquipment = require('./analyze-equipment.cjs');
 *   const data = await analyzeEquipment('equipment-list.xlsx');
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * Column name variations for auto-detection
 */
const COLUMN_MAPPINGS = {
  unitId: ['unit id', 'unit', 'id', 'unit #', 'generator id', 'gen id', 'asset id'],
  make: ['make', 'manufacturer', 'mfr', 'brand'],
  model: ['model', 'model #', 'model number'],
  kw: ['kw', 'kw rating', 'rating', 'capacity', 'size', 'power'],
  serialNumber: ['serial', 'serial #', 'serial number', 'sn', 's/n'],
  location: ['location', 'site', 'address', 'facility', 'installation'],
  voltage: ['voltage', 'volts', 'v'],
  engine: ['engine', 'engine model', 'engine #'],
  fuel: ['fuel', 'fuel type', 'gas type'],
  year: ['year', 'model year', 'mfg year', 'manufactured'],
  hours: ['hours', 'runtime', 'run hours', 'operating hours']
};

/**
 * Make-to-fuel-type mapping
 */
const FUEL_TYPE_MAPPING = {
  'cummins': 'Diesel',
  'caterpillar': 'Diesel',
  'cat': 'Diesel',
  'detroit': 'Diesel',
  'perkins': 'Diesel',
  'john deere': 'Diesel',
  'kohler': 'Natural Gas',
  'generac': 'Natural Gas',
  'onan': 'Natural Gas'
};

/**
 * DPF requirement logic (2011+ and >50kW typically)
 */
function inferDPF(year, kw, fuelType) {
  if (fuelType !== 'Diesel') return false;
  if (!year || !kw) return null;

  const numYear = parseInt(year);
  const numKw = parseFloat(kw);

  // EPA Tier 4 requirements started around 2011
  if (numYear >= 2011 && numKw >= 50) return true;
  if (numYear >= 2015) return true; // Most diesels after 2015

  return false;
}

/**
 * Classify kW into 10kW ranges
 */
function classifyKwRange(kw) {
  if (!kw) return 'Unknown';

  const numKw = parseFloat(kw);
  if (isNaN(numKw)) return 'Unknown';

  const bucket = Math.floor(numKw / 10) * 10;
  return `${bucket}-${bucket + 9}kW`;
}

/**
 * Find column index by name variations
 */
function findColumn(headers, variations) {
  const normalizedHeaders = headers.map(h =>
    String(h || '').toLowerCase().trim()
  );

  for (const variant of variations) {
    const idx = normalizedHeaders.indexOf(variant.toLowerCase());
    if (idx !== -1) return idx;
  }

  return -1;
}

/**
 * Parse Excel or CSV file
 */
async function analyzeEquipment(filePath) {
  console.log(`   Parsing: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  let rows = [];

  if (ext === '.xlsx' || ext === '.xls') {
    // Parse Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  } else if (ext === '.csv') {
    // Parse CSV
    const csvContent = fs.readFileSync(filePath, 'utf8');
    rows = csvContent.split('\n').map(line => {
      // Simple CSV parsing (doesn't handle quoted commas)
      return line.split(',').map(cell => cell.trim());
    });

  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  if (rows.length < 2) {
    throw new Error('File must have at least a header row and one data row');
  }

  // Extract headers
  const headers = rows[0];
  console.log(`   Found ${headers.length} columns`);

  // Map columns
  const columnMap = {
    unitId: findColumn(headers, COLUMN_MAPPINGS.unitId),
    make: findColumn(headers, COLUMN_MAPPINGS.make),
    model: findColumn(headers, COLUMN_MAPPINGS.model),
    kw: findColumn(headers, COLUMN_MAPPINGS.kw),
    serialNumber: findColumn(headers, COLUMN_MAPPINGS.serialNumber),
    location: findColumn(headers, COLUMN_MAPPINGS.location),
    voltage: findColumn(headers, COLUMN_MAPPINGS.voltage),
    engine: findColumn(headers, COLUMN_MAPPINGS.engine),
    fuel: findColumn(headers, COLUMN_MAPPINGS.fuel),
    year: findColumn(headers, COLUMN_MAPPINGS.year),
    hours: findColumn(headers, COLUMN_MAPPINGS.hours)
  };

  // Log detected columns
  const detected = Object.entries(columnMap)
    .filter(([_, idx]) => idx !== -1)
    .map(([field, idx]) => `${field}(col ${idx + 1})`);
  console.log(`   Detected: ${detected.join(', ')}`);

  // Parse data rows
  const generators = [];
  const dataRows = rows.slice(1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Skip empty rows
    if (!row || row.every(cell => !cell)) continue;

    const generator = {
      unitId: columnMap.unitId !== -1 ? row[columnMap.unitId] : `GEN-${i + 1}`,
      make: columnMap.make !== -1 ? row[columnMap.make] : null,
      model: columnMap.model !== -1 ? row[columnMap.model] : null,
      kw: columnMap.kw !== -1 ? parseFloat(row[columnMap.kw]) || null : null,
      serialNumber: columnMap.serialNumber !== -1 ? row[columnMap.serialNumber] : null,
      location: columnMap.location !== -1 ? row[columnMap.location] : null,
      voltage: columnMap.voltage !== -1 ? row[columnMap.voltage] : null,
      engine: columnMap.engine !== -1 ? row[columnMap.engine] : null,
      fuelType: null,
      year: columnMap.year !== -1 ? row[columnMap.year] : null,
      hours: columnMap.hours !== -1 ? parseFloat(row[columnMap.hours]) || null : null,
      hasDPF: null,
      kwRange: null
    };

    // Infer fuel type from make if not provided
    if (columnMap.fuel !== -1 && row[columnMap.fuel]) {
      generator.fuelType = row[columnMap.fuel];
    } else if (generator.make) {
      const makeLower = generator.make.toLowerCase();
      for (const [makeKey, fuelType] of Object.entries(FUEL_TYPE_MAPPING)) {
        if (makeLower.includes(makeKey)) {
          generator.fuelType = fuelType;
          break;
        }
      }
    }

    // Infer DPF
    generator.hasDPF = inferDPF(generator.year, generator.kw, generator.fuelType);

    // Classify kW range
    generator.kwRange = classifyKwRange(generator.kw);

    // Add Zoho-compatible fields
    generator.zohoFields = {
      Name: `${generator.make || 'Unknown'} ${generator.model || ''} - ${generator.unitId}`.trim(),
      Generator_Make: generator.make,
      Generator_Model: generator.model,
      kW_Rating: generator.kw,
      Serial_Number: generator.serialNumber,
      Installation_Address: generator.location,
      Engine_Make: generator.engine,
      Fuel_Type: generator.fuelType,
      Status: 'Active'
    };

    generators.push(generator);
  }

  console.log(`   ✅ Parsed ${generators.length} generators`);

  // Generate summary statistics
  const kwRanges = {};
  const fuelTypes = {};
  const makes = {};

  generators.forEach(gen => {
    // Count kW ranges
    if (!kwRanges[gen.kwRange]) kwRanges[gen.kwRange] = 0;
    kwRanges[gen.kwRange]++;

    // Count fuel types
    const fuel = gen.fuelType || 'Unknown';
    if (!fuelTypes[fuel]) fuelTypes[fuel] = 0;
    fuelTypes[fuel]++;

    // Count makes
    const make = gen.make || 'Unknown';
    if (!makes[make]) makes[make] = 0;
    makes[make]++;
  });

  return {
    metadata: {
      source: path.basename(filePath),
      parseDate: new Date().toISOString(),
      totalGenerators: generators.length,
      columnsDetected: detected.length
    },
    generators,
    summary: {
      byKwRange: kwRanges,
      byFuelType: fuelTypes,
      byMake: makes,
      totalKw: generators.reduce((sum, g) => sum + (g.kw || 0), 0),
      avgKw: generators.reduce((sum, g) => sum + (g.kw || 0), 0) / generators.length,
      withDPF: generators.filter(g => g.hasDPF === true).length
    }
  };
}

// CLI execution
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: node analyze-equipment.cjs <file.xlsx|file.csv>');
    process.exit(1);
  }

  analyzeEquipment(filePath)
    .then(result => {
      console.log('\n📊 Equipment Analysis Results:\n');
      console.log(JSON.stringify(result, null, 2));

      // Save output
      const outputPath = path.join(
        path.dirname(filePath),
        'equipment-analysis.json'
      );
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
      console.log(`\n✅ Saved to: ${outputPath}`);

      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = analyzeEquipment;
