### Phase 8: Zoho Data Transfer - Complete Workflow
**Purpose:** Verify all data transfers to Zoho CRM correctly

**Zoho Modules to Verify:**

#### 8.1: Account Creation
**API Call:** POST /api/zoho/create-account or via MCP

**Fields to Verify:**
| Field | Source | Zoho Field | Validation |
|-------|--------|------------|------------|
| Company Name | Customer form | Account_Name | Exact match |
| Phone | Customer form | Phone | Format preserved |
| Email | Contact form | Email | Valid email |
| Website | Customer form | Website | URL format |
| Billing Address | Customer form | Billing_Address | Full address object |
| Industry | Enrichment | Industry | If enriched |

**Test Sequence:**
1. Click "Create Bid" or "Send to Zoho"
2. Verify loading indicator
3. Wait for Zoho account creation (max 10s)
4. Verify success message
5. Capture Zoho Account ID from response
6. Verify account searchable in Zoho

**Evidence Required:**
- Screenshot of "Send to Zoho" button
- Console log showing Zoho API call
- Network request to Zoho
- Zoho response with Account ID
- Screenshot of success message
- Verification: Account exists in Zoho with correct data

#### 8.2: Contact Creation
**API Call:** POST /api/zoho/create-contact

**Fields to Verify:**
| Field | Source | Zoho Field | Validation |
|-------|--------|------------|------------|
| First Name | Contact form | First_Name | Parsed from full name |
| Last Name | Contact form | Last_Name | Parsed from full name |
| Email | Contact form | Email | Exact match |
| Phone | Contact form | Phone | Exact match |
| Title | Contact form | Title | Exact match |
| Account Link | From 8.1 | Account_Name | Links to created account |

**Test Sequence:**
1. Verify contact creation triggered after account
2. Verify contact linked to account
3. Capture Contact ID from response

**Evidence Required:**
- Zoho response with Contact ID
- Verification: Contact exists in Zoho
- Verification: Contact linked to Account

#### 8.3: Generator Asset Creation
**API Call:** POST /api/zoho/create-generator-asset

**Critical Fields to Verify (132 total available):**

**Core Fields:**
| Field | Source | Zoho Field | Validation |
|-------|--------|------------|------------|
| Generator kW | Generator form | Generator_kW_Rating | Number, 20-2500 |
| Manufacturer | Generator form | Generator_Manufacturer | Text |
| Model | Generator form | Generator_Model | Text |
| Serial Number | Generator form | Generator_Serial_Number | Text |
| Fuel Type | Generator form | Fuel_Type | Picklist value |
| Location | Generator form | Site_Location | Text |
| Customer Link | From 8.1 | Customer_Account | Lookup to Account |

**Extended Fields (if filled):**
- Engine_Manufacturer
- Engine_Model
- Engine_Serial_Number
- Engine_Cylinders
- Engine_Displacement_Liters
- Hours_Run
- Last_Service_Date
- ATS_Manufacturer
- Battery_Voltage
- Coolant_Type
- Oil_Type
- Installation_Address

**Test Sequence:**
1. Verify generator asset creation after account
2. Verify asset linked to customer account
3. Capture Generator Asset ID
4. Verify all filled fields transferred

**Evidence Required:**
- Zoho response with Asset ID
- Verification: Asset exists in Zoho
- Verification: Asset linked to Account
- Field-by-field comparison (form vs Zoho)

**Known Issues:**
- E2E-008: Generator asset MCP tool may not be implemented
- Customer_Account lookup field may have metadata issues

#### 8.4: Quote Creation with Line Items
**API Call:** POST /api/zoho/create-quote

**Quote Header Fields:**
| Field | Source | Zoho Field | Validation |
|-------|--------|------------|------------|
| Subject | Auto-generated | Subject | "Generator Maintenance Quote - [Customer]" |
| Account | From 8.1 | Account_Name | Lookup to Account |
| Grand Total | Calculator | Grand_Total | Match annual total |
| Quarterly Total | Calculator | Quarterly_Total | Match Q1 total |
| Valid Until | Auto-generated | Valid_Till | 30 days from now |
| Prevailing Wage Required | Settings | Prevailing_Wage_Required | Checkbox (true/false) |
| Prevailing Wage Rate | Settings | Prevailing_Wage_Rate | Currency ($236.50 if enabled) |
| Prevailing Wage Source | Settings | Prevailing_Wage_Source | "DIR API" or "Manual Override" |
| Business Overhead | Settings | Business_Overhead | Currency ($115.00 default) |

**Product Line Items (CRITICAL):**
For each selected service:
| Field | Source | Zoho Field | Validation |
|-------|--------|------------|------------|
| Product ID | Product lookup/creation | product.id | Valid product ID (long integer) |
| Quantity | Service frequency | quantity | 1, 2, or 4 |
| List Price | Calculator per-visit | list_price | Per-visit price |
| Total | Calculator annual | total | Per-visit × quantity |
| Description | Service description | description | Service details |

**Service to Product Mapping:**
- Service A → Product: "Service A - Quarterly Maintenance" (or frequency variation)
- Service B → Product: "Service B - Air & Fuel System Service"
- Service CUSTOM → Create custom product with description

**Test Sequence:**
1. Verify quote creation after account/asset
2. Verify quote header fields populated
3. Verify prevailing wage fields (if enabled):
   - `Prevailing_Wage_Required` = true
   - `Prevailing_Wage_Rate` = $236.50 (or calculated value)
   - `Prevailing_Wage_Source` = "DIR API" or "Manual Override"
   - `Business_Overhead` = $115.00
4. Verify ALL selected services appear as line items
5. Verify each line item has:
   - Valid product ID (not null, not 0)
   - Correct quantity (frequency: 4=quarterly, 2=semi-annual, 1=annual)
   - Correct list price (per-visit price reflecting prevailing wage if enabled)
   - Correct total (list_price × quantity)
6. Verify grand total matches calculator
7. Verify quote status (Draft, Pending, etc.)
8. Verify quote notes/description includes prevailing wage disclosure (if enabled):
   - "This quote uses California prevailing wage rates per DIR requirements."

**Critical Product Workflow:**
1. For each service, find or create product in Zoho
2. Map service code to product name
3. Get product ID from Zoho
4. Use product ID in line item (MUST be long integer, not string)

**Evidence Required:**
- Zoho response with Quote ID
- Quote line items array in response
- Verification: Quote exists in Zoho
- Verification: All services appear as line items
- Verification: Line item pricing correct (with prevailing wage if enabled)
- Verification: Grand total matches
- Verification: Prevailing wage fields populated (if enabled)
- Screenshot of Zoho quote page showing prevailing wage data
- Verification: Quote notes include prevailing wage disclosure
- Verification: Attached PDF reflects prevailing wage rates

**Known Issues:**
- E2E-007: Quote creation requires product IDs, not names (FIXED per E2E_BUGS_TRACKING.json)
- Bug #4: Pricing data may not transfer (all $0.00) - check serviceBreakdown mapping
- Product creation workflow must run before quote creation

**Fail If (CRITICAL - Complete Zoho Transfer):**
- Account not created in Zoho
- Contact not created or not linked
- Generator asset not created or not linked
- Quote not created
- ANY line item missing
- ANY line item shows $0.00 price
- Grand total doesn't match calculator
- Console errors during Zoho calls
- API returns error response
- Quote not searchable in Zoho
- Prevailing wage fields missing when enabled
- Prevailing wage rate incorrect in Zoho
- Line item prices don't reflect prevailing wage when enabled
- Quote notes missing prevailing wage disclosure
- Attached PDF doesn't match prevailing wage settings

---
