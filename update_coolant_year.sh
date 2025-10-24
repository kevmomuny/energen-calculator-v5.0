#!/bin/bash
# Move coolant from Year 3 to Year 1 in the year-by-year breakdown

# Line 307: Add coolant to Year 1
sed -i '307a\  One-Time Coolant Service:  $17,719.00' FTB_TABLES_1-8_FINAL_WITH_ESCALATION.md

# Line 309: Update Year 1 subtotal
sed -i '309s/Year 1 Subtotal:          $102,949.92/Year 1 Subtotal:          $120,668.92/' FTB_TABLES_1-8_FINAL_WITH_ESCALATION.md

# Lines 320-321: Remove coolant from Year 3
sed -i '322,323d' FTB_TABLES_1-8_FINAL_WITH_ESCALATION.md

# Update Year 3 subtotal
sed -i 's/Year 3 Subtotal:          $124,994.82/Year 3 Subtotal:          $107,275.82/' FTB_TABLES_1-8_FINAL_WITH_ESCALATION.md

# Add cash flow note after the year-by-year section
sed -i '/^36-MONTH TOTAL:/a\n**Cash Flow Note**: Year 1 is the highest cost year ($120,668.92) due to the one-time coolant service being performed early in the contract. Years 2 and 3 have lower annual costs.' FTB_TABLES_1-8_FINAL_WITH_ESCALATION.md

echo "Coolant moved to Year 1"
