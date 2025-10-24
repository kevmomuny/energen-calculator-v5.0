#!/usr/bin/env node
const fs = require('fs');

console.log('Transforming customer data to match Zoho field names...\n');

// Load original data
const customers = JSON.parse(fs.readFileSync('C:/fullbay-zoho-data-transfer/fullbay-customers-complete.json', 'utf-8'));

// Field mapping: OUR_FIELD_NAME -> ZOHO_FIELD_NAME
const fieldMap = {
  'Account_Name': 'Account_Name',
  'External_ID': 'External_ID',
  'Customer_Active': 'Customer_Is_Active',
  'Customer_Group': 'Customer_Group',  // May need to be dropped if doesn't exist
  'Phone': 'Phone',
  'Secondary_Phone': 'Secondary_Phone',
  'Fax': 'Fax',
  'Physical_Address_Name': 'Physical_Address_Name',
  'Physical_Address_Line_1': 'Physical_Address_Line_1',
  'Physical_Address_Line_2': 'Physical_Address_Line_2',
  'Physical_Address_City': 'Physical_Address_City',
  'Physical_Address_State': 'Physical_Address_State',
  'Physical_Address_Zip': 'Physical_Address_Zip',
  'Physical_Address_Country': 'Physical_Address_Country',
  'Billing_Address_Name': 'Billing_Address_Name',
  'Billing_Street': 'Billing_Address_Line_1',  // MAPPED
  'Billing_Address_Line_2': 'Billing_Address_Line_2',
  'Billing_City': 'Billing_Address_City',  // MAPPED
  'Billing_State': 'Billing_Address_State',  // MAPPED
  'Billing_Code': 'Billing_Address_Zip',  // MAPPED
  'Billing_Country': 'Billing_Address_Country',  // MAPPED
  'Assigned_Shop': 'Assigned_Shop',
  'Associated_Shops': 'Associated_Shops',
  'Overall_Decision_Maker': 'Overall_Decision_Maker',
  'Day_to_Day_Contact': 'Day_to_Day_Contact',
  'Repair_Authorizer': 'Repair_Authorizer',
  'Billing_Contact': 'Billing_Contact',
  'Default_Bill_to_Customer': 'Default_Bill_to_Customer',
  'Default_Bill_to_Authorizer': 'Default_Bill_to_Authorizer',
  'Portal_is_on': 'Portal_is_on',
  'Portal_Code': 'Portal_Code',
  'Can_Print_Procedures': 'Can_Print_Procedures',
  'Restricted_From_Adding_Units': 'Restricted_From_Adding_Units',
  'Restricted_From_Adding_Contacts': 'Restricted_From_Adding_Contacts',
  'Show_Authorized_Estimates_Tab': 'Show_Authorized_Estimates_Tab',
  'Can_See_Invoices': 'Can_See_Invoices',
  'Can_Pay_Invoices': 'Can_Pay_Invoices',
  'PO_Required_for_SO': 'PO_Required_For_SO',  // MAPPED (case difference)
  'PO_Required_for_Invoice': 'PO_Required_for_Invoice',
  'PO_Required_Last_Complaint': 'PO_Required_Last_Complaint',
  'Show_Auth_Number': 'Show_Auth_Number',
  'Auth_Number_Required': 'Auth_Number_Required',
  'Pre_Auth_Dollar_Threshold': 'Pre_Auth_Dollar_Threshold',
  'Blanket_Auth': 'Blanket_Auth',
  'Access_Method': 'Access_Method',
  'Assist_with_Preventive_Maint': 'Assist_With_Preventive_Maint',  // MAPPED (case)
  'Skip_Diagnose': 'Skip_Diagnose',
  'Auto_Receive': 'Auto_Receive1',  // MAPPED (Zoho has multiple, using Auto_Receive1)
  'Display_Notes_on_SO': 'Display_Notes_on_SO',
  'Credit_Terms': 'Credit_Terms',
  'Tax_Exempt': 'Tax_Exempt',
  'Tax_Location_Rate': 'Tax_Location_Rate',
  'Discount_Value': 'Discount_Amount',  // MAPPED
  'Credit_Limit_Fullbay': 'Credit_Limit_Fullbay',
  'Default_Labor_Rate_Fullbay': 'Default_Labor_Rate_Fullbay',
  'Associated_Labor_Rates': 'Associated_Labor_Rates',
  'Mileage_Rate': 'Mileage_Rate',
  'Supply_Rate': 'Supply_Rate',
  'Sublet_Rate': 'Sublet_Rate',
  'Payment_Method': 'Payment_Method',
  'Auto_Fee_Setting': 'Auto_Fee_Setting',
  'Ext_Accounting_System': 'External_Accounting_System',  // MAPPED
  'External_Accounting_ID': 'External_Accounting_ID'
};

// Transform each customer
const transformed = customers.map(customer => {
  const newCustomer = {};
  for (const [oldField, newField] of Object.entries(fieldMap)) {
    if (customer.hasOwnProperty(oldField)) {
      newCustomer[newField] = customer[oldField];
    }
  }
  return newCustomer;
});

// Save transformed data
fs.writeFileSync('C:/fullbay-zoho-data-transfer/fullbay-customers-zoho-mapped.json', JSON.stringify(transformed, null, 2));

console.log('Transformation complete!');
console.log(`Original fields: ${Object.keys(customers[0]).length}`);
console.log(`Mapped fields: ${Object.keys(transformed[0]).length}`);
console.log(`Customers: ${transformed.length}`);
console.log('\nSaved to: fullbay-customers-zoho-mapped.json');
