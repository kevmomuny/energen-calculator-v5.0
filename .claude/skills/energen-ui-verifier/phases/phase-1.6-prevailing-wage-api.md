### Phase 1.6: Prevailing Wage API Integration
**Purpose:** Verify prevailing wage API integration with DIR (Department of Industrial Relations)

**CRITICAL:** This tests the backend integration with California DIR prevailing wage rates for compliance with Davis-Bacon Act requirements on public works projects.

**API Endpoint:** `/api/prevailing-wage/{zip}`

**Service File:** [src/api/prevailing-wage-service.cjs](src/api/prevailing-wage-service.cjs)

**Test Data - California ZIP Codes:**

| ZIP | County | Zone | Expected Rate (Electrician Journeyman) |
|-----|--------|------|---------------------------------------|
| 94520 | Alameda | Zone 1 (Bay Area) | $121.50 |
| 94102 | San Francisco | Zone 1 (Bay Area) | $121.50 |
| 90210 | Los Angeles | Zone 2 (LA/SD) | ~$110.00 |
| 95350 | Modesto | Zone 3 (Central Valley) | ~$95.00 |
| 96001 | Redding | Zone 4 (Rural) | ~$85.00 |

**API Response Structure:**
```javascript
GET /api/prevailing-wage/94520
Response: {
  success: true,
  prevailingWage: {
    electricianJourneyman: 121.50,
    electricianForeman: 135.00,
    electricianGeneralForeman: 145.00,
    operatingEngineerGroup8: 92.73,  // Stationary Engineers (generator ops)
    fringe: {
      healthWelfare: 19.41,
      pension: 22.97,
      vacation: 3.50,
      training: 2.30,
      other: 1.42
    },
    totalHourly: 236.50  // Base + fringe + business overhead
  },
  source: "DIR 2025 rates",
  county: "Alameda",
  zone: 1,
  lastUpdated: "2025-01-25"
}
```

**Test Sequence:**

1. **Valid California ZIP Code Test:**
   - Call API with ZIP: 94520 (Concord, CA)
   - Verify HTTP 200 response
   - Verify response time < 2 seconds
   - Verify `success: true`
   - Verify all rate fields present
   - Verify electricianJourneyman = $121.50
   - Verify fringe benefits breakdown present
   - Verify county = "Alameda"
   - Verify zone = 1

2. **Multiple Zone Test:**
   - Test Zone 1 (Bay Area): ZIP 94520
     - Expected: Higher rates (~$121.50)
   - Test Zone 2 (LA/SD): ZIP 90210
     - Expected: Medium-high rates (~$110.00)
   - Test Zone 3 (Central Valley): ZIP 95350
     - Expected: Base rates (~$95.00)
   - Test Zone 4 (Rural): ZIP 96001
     - Expected: Lower rates (~$85.00)
   - Verify zone-based rate adjustments:
     - Zone 1: +15% over base
     - Zone 2: +10% over base
     - Zone 4: -10% under base

3. **Rate Caching Test:**
   - Call API with ZIP 94520 (first call)
   - Note response time (should hit API)
   - Call API again with same ZIP within 24 hours
   - Verify response time < 100ms (cached)
   - Verify cache contains correct data
   - Verify `this.cache.has(zip)` returns true

4. **Fringe Benefits Validation:**
   - Verify fringe object contains all required fields:
     - healthWelfare: $19.41
     - pension: $22.97
     - vacation: $3.50
     - training: $2.30
     - other: $1.42
   - Calculate total fringe: $19.41 + $22.97 + $3.50 + $2.30 + $1.42 = $49.60
   - Verify fringe benefits separate from base wage

5. **Classification Test:**
   - Verify multiple worker classifications available:
     - electricianJourneyman (primary)
     - electricianForeman
     - electricianGeneralForeman
     - operatingEngineerGroup8 (stationary engineers)
   - Verify apprentice rates (if available):
     - apprentice1: 50% of journeyman
     - apprentice2: 60% of journeyman
     - apprentice3: 70% of journeyman
     - apprentice4: 80% of journeyman

6. **Error Handling Test:**
   - Test invalid ZIP: 00000
     - Expected: Fallback to default rates or error message
   - Test non-California ZIP: 10001 (New York)
     - Expected: Fallback to California base rates with warning
   - Test malformed request: /api/prevailing-wage/
     - Expected: HTTP 400 Bad Request

7. **Rate Source Verification:**
   - Verify `source` field = "DIR 2025 rates"
   - Verify `lastUpdated` field present
   - Verify rates match official DIR determinations
   - Verify county mapping correct for ZIP code

8. **Business Overhead Integration:**
   - Verify API provides base prevailing wage
   - Verify business overhead ($115.00) added separately
   - Verify total calculation:
     - Base prevailing wage: $121.50
     - Business overhead: $115.00
     - Total labor rate: $236.50

**Evidence Required:**
- Network capture of API request/response for each zone
- Console logs showing rate lookup for each ZIP
- Screenshot showing cached vs fresh API calls (timing)
- Comparison table: ZIP → County → Zone → Rate
- Verification of fringe benefits breakdown
- Test results for all 5 zones
- Cache TTL verification (24-hour expiry)

**Performance Requirements:**
- First API call: < 2 seconds
- Cached response: < 100ms
- API timeout handling: < 5 seconds
- Cache expiry: 24 hours (86400000ms)

**Known Issues:**
- Non-California ZIP codes fall back to default California rates
- Cache stored in memory (lost on server restart)
- API may require DIR.ca.gov integration (currently using hardcoded 2025 rates)

**Fail If:**
- API returns 404 or 500 errors for valid CA ZIP codes
- Response time > 5 seconds
- Incorrect rates for known counties
- Zone adjustments not applied correctly
- Caching doesn't work (repeated API calls for same ZIP < 24hr apart)
- Fringe benefits missing or incorrect
- County mapping wrong for ZIP code
- Non-California ZIP codes cause crashes
- Business overhead not separated from base wage
- Rate source not documented

---
