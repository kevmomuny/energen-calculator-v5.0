# Energen Calculator V5.0 - System Context

**Status:** Production Ready | **Tests:** 69/69 (100%) | **Updated:** 2025-09-30

---

## Architecture

**Stack:** Node.js Express + Vanilla JS (Webpack bundled)  
**Port:** 3002 (unified via .env)  
**State:** Stateless (no persistence)

### Core Files
- Backend: `src/api/server-secure.cjs` (1400 lines)
- Engine: `src/api/complete-calculation-engine.cjs` (925 lines)
- Frontend: `frontend/integrated-ui.html` (6650 lines)
- Settings: `frontend/config/default-settings.json`

---

## Services Implemented

**A-J (Core):** Complete with tests  
A: Comprehensive Inspection | B: Oil & Filter | C: Coolant | D: Oil/Fuel Analysis (lab-based, NO labor/mobilization) | E: Load Bank Testing | F: Diesel Tune-Up (cylinder + injector type) | G: Gas Tune-Up | H: Electrical Testing (5yr) | I: Transfer Switch | J: Thermal Imaging

**Additional:** K: Battery Replacement | FUEL_POLISH: Fuel Polishing

---

## Business Rules

```javascript
Labor: $191/hr (configurable)
Parts Markup: 20% (1.2x) - ALREADY APPLIED in settings JSON
Oil: $16/gal base + 50% markup (1.5x)
Coolant: $15/gal base + 50% markup (1.5x)
Freight: 5% additional (1.05x)
Mobilization Stacking: 35% discount (multi-service)
```

**kW Ranges (10 tiers):**  
2-14, 15-30, 35-150, 155-250, 255-400, 405-500, 505-670, 675-1050, 1055-1500, 1500-2050

**Critical:**
- Parts prices in settings are FINAL (no reapplication of partsMarkup)
- Oil quantities in GALLONS (not quarts)
- Service D: Zero labor/mobilization (lab analysis only)
- Services F,G,H: One-time services (frequency=0 skips, frequency=1 charges once)

---

## Recent Changes (Last 72hrs)

**Commit 467083d (Sep 30):**
- Fixed Service D: Removed labor (0.5→0) and mobilization (0.5→0)
- Added `getFuelPolishing()` method (lines 488-503)
- Added `getBatteryService()` method (lines 505-520)
- Updated company info in default-settings.json

**Commit 9222a78 (Sep 29):**
- Added `/api/preview-prices` endpoint (server-secure.cjs lines 1031-1092)
- Fixed race condition in service price updates
- Preview prices now include mobilization stacking

**Commit 440076d (Sep 29):**
- Removed double parts markup application (~25% price reduction)
- Business logic: Settings JSON parts are pre-calculated final prices

---

## API Endpoints

```
POST /api/calculate              - Full contract calculation
POST /api/preview-prices         - Service previews (no selection)
POST /api/calculate-unit-price   - Single unit pricing
POST /api/generate-pdf           - Contract PDF generation
POST /api/zoho/create-quote      - Zoho CRM integration
GET  /api/zoho/oauth             - OAuth callback
```

---

## Integrations

**Google (Single Key):** `GOOGLE_MAPS_API_KEY`  
- Distance Matrix, Geocoding, Places, Maps JS

**Zoho CRM:** `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`

**CDTFA Tax:** Real-time CA tax lookup  
- API: `services.maps.cdtfa.ca.gov`  
- Fallback: 10.25%

---

## Validation Rules

```javascript
kW: 10-5000
Distance: 0-1000 miles
Contract: 1-60 months
Services: Minimum 1 required
ZIP: \d{5}
State: [A-Z]{2}
```

---

## Test Coverage

```
test-all-services-complete.cjs    - Services A-J (45 tests)
test-fuel-polishing.cjs           - Fuel polishing (10 tests)
test-battery-service.cjs          - Battery K (14 tests)
test-frequency-logic.cjs          - Frequency multipliers
test-injector-type.cjs            - Service F variations
test-mobilization-doubling.cjs    - Stacking verification
```

**Status:** 69/69 passing (100%)

---

## File Structure

```
/src/api/              Backend logic
/frontend/             UI + client code
  /config/             Settings JSON
  /services/           API modules
/modules/@energen/     Modular components
/context/              Documentation (legacy)
/test*.cjs             Test suites
```

---

## Current State

- Production deployment ready
- All services tested and verified
- Documentation cleanup needed (27+ legacy report files)
- No blocking issues
