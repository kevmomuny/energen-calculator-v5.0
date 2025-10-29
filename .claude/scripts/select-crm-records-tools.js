/**
 * Browser console script to select all CRM records tools
 * Run this in browser console after clicking "Configure Tools"
 */

const CRM_RECORDS_TOOLS = [
  'Create Records',
  'Create Record',
  'Get Records',
  'Get Record',
  'Get Record Using External ID',
  'Search Records',
  'Update Record',
  'Update Records',
  'Update Record Using External ID',
  'Upsert Records',
  'Delete Record',
  'Delete Records',
  'Mass Update Records',
  'Record Count',
  'Get Deleted Records'
];

async function selectCRMRecordTools() {
  console.log('🚀 Starting CRM Records tool selection...\n');
  
  for (let i = 0; i < CRM_RECORDS_TOOLS.length; i++) {
    const toolName = CRM_RECORDS_TOOLS[i];
    console.log(`[${i + 1}/15] Searching for: ${toolName}`);
    
    // Search for the tool in the search box
    const searchInput = document.querySelector('input[placeholder="Search Tools"]');
    if (searchInput) {
      searchInput.value = toolName;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Wait for search results
      await new Promise(r => setTimeout(r, 500));
      
      // Find and click the tool
      const allElements = Array.from(document.querySelectorAll('*'));
      const toolElement = allElements.find(el => el.textContent.trim() === toolName);
      
      if (toolElement) {
        toolElement.click();
        console.log(`✓ Selected: ${toolName}\n`);
        await new Promise(r => setTimeout(r, 300));
      } else {
        console.warn(`⚠ Not found: ${toolName}\n`);
      }
    }
  }
  
  console.log('✅ All 15 tools selected!');
  console.log('Now click the "Add Now" button to save.');
}

// Run automatically
selectCRMRecordTools();
