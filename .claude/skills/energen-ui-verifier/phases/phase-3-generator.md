### Phase 3: Generator Specifications Entry
**Purpose:** Verify complete generator data entry (all 132 fields available in Zoho)

**Core Generator Fields (MUST HAVE):**

| Field | Selector | Type | Validation |
|-------|----------|------|------------|
| Generator kW | `input[type='number'][min='0'][max='2050']` | Number | 20-2500 kW |
| Manufacturer | `select` (first in generator section) | Select | Cummins, CAT, Kohler, etc. |
| Model | `input[placeholder*='model']` | Text | Any text |
| Serial Number | `input[placeholder*='serial']` | Text | Any text |
| Fuel Type | `select:has(option:text-is('Diesel'))` | Select | Diesel, Natural Gas, Propane, Bi-Fuel |
| Location | `input[placeholder*='Building']` | Text | Installation address |

**Extended Generator Fields (verify existence):**
- Engine Manufacturer
- Engine Model
- Engine Serial Number
- Engine Cylinders
- Engine Displacement (Liters)
- Hours Run
- Last Service Date
- ATS Manufacturer
- ATS Model
- Battery Voltage
- Coolant Type
- Oil Type
- Transfer Switch Type
- Installation Date
- Warranty Expiration
- Service Agreement Status

**Test Sequence:**
1. Verify generator card renders (not stuck on "Loading...")
2. Fill kW: "175"
3. Select manufacturer: "Cummins"
4. Fill model: "C175D6"
5. Fill serial: "SN-TEST-175-001"
6. Select fuel type: "Diesel"
7. Fill location: "Main Building - Basement"
8. Fill extended fields (if available)
9. Verify all data saves to state

**kW Range Validation:**
- Test small: 75 kW (should accept)
- Test medium: 500 kW (should accept)
- Test large: 2000 kW (should accept)
- Test invalid: 5000 kW (should reject or warn)
- Test invalid: -10 kW (should reject)

**Evidence Required:**
- Screenshot of empty generator form
- Screenshot after each field
- Screenshot of filled form
- Console log showing field events
- state.units[0] verification
- Network log for any auto-save calls

**Known Issues:**
- E2E-003: Multi-unit data entry may overwrite Unit #1 (test single unit only until fixed)
- Unit card may show "Custom Bid" instead of specs

**Fail If:**
- Any required field missing
- kW validation doesn't work
- Manufacturer dropdown empty
- Fuel type dropdown empty
- Data doesn't save to state.units

---
