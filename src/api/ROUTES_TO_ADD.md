# Routes to Add to server-secure.cjs

## Import Statements (add after line 33)

```javascript
// Import Zoho CPQ webhook handlers
const cpqWebhook = require('./zoho-cpq-price-webhook.cjs')

// Import bid recreation endpoints
const bidRecreation = require('./bid-recreation-endpoints.cjs')
```

## Route Registrations (add before line 2882 - before 404 handler)

```javascript
// =============================================================================
// ZOHO CPQ WEBHOOK ENDPOINTS
// =============================================================================
// Called by Zoho CPQ Price Rules for dynamic pricing
app.post('/api/zoho-cpq-price', cpqWebhook.calculateServicePrice)
app.post('/api/zoho-cpq-price-batch', cpqWebhook.calculateBatchPricing)
app.get('/api/zoho-cpq-price/health', cpqWebhook.healthCheck)

// =============================================================================
// BID RECREATION ENDPOINTS
// =============================================================================
// Create and restore session hashes for bid recreation
app.post('/api/bid/create-session', bidRecreation.createBidSession)
app.get('/api/bid/recreate/:hash', bidRecreation.recreateBidFromHash)
app.post('/api/bid/recreate-and-calculate/:hash', bidRecreation.recreateAndCalculate)
app.get('/api/bid/sessions/stats', bidRecreation.getSessionStats)
app.post('/api/bid/sessions/cleanup', bidRecreation.cleanupExpiredSessions)
```

## Batch Pricing Response - Add Session Hash

In [zoho-cpq-price-webhook.cjs:305](zoho-cpq-price-webhook.cjs#L305), change:

```javascript
    const response = {
      success: true,
      lineItems: lineItems,
      quoteTotal: result.total,
      breakdown: {
        subtotal: result.subtotal,
        tax: result.salesTax,
        distanceCharge: result.distanceCharge
      },
      metadata: {
        calculatorVersion: '5.0',
        timestamp: new Date().toISOString(),
        servicesCount: lineItems.length,
        prevailingWageApplied: result.prevailingWageApplied || false
      }
    };
```

To:

```javascript
    const response = {
      success: true,
      lineItems: lineItems,
      quoteTotal: result.total,
      breakdown: {
        subtotal: result.subtotal,
        tax: result.salesTax,
        distanceCharge: result.distanceCharge
      },
      metadata: {
        calculatorVersion: '5.0',
        timestamp: new Date().toISOString(),
        servicesCount: lineItems.length,
        prevailingWageApplied: result.prevailingWageApplied || false
      },
      // Session hash for bid recreation
      sessionHash: sessionHash,
      recreationUrl: `/api/bid/recreate/${sessionHash}`,
      // Zoho field mapping for quote metadata
      zohoFields: {
        Session_Hash__c: sessionHash,
        Calculator_Version__c: '5.0',
        Created_At__c: new Date().toISOString()
      }
    };
```
