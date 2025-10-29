/**
 * Browser console script to select all CRM structure tools
 * Paste this into the browser console on the Zoho MCP tool selection page
 */

const CRM_STRUCTURE_TOOLS = [
  'Get Modules',
  'Get Module',
  'Get Module By API Name',
  'Get Fields',
  'Get Field',
  'Create Field',
  'Update Field',
  'Delete Field',
  'Get Layout',
  'Update Custom Layout',
  'Create Custom Modules',
  'Update Module'
];

async function selectAllTools() {
  console.log('Starting tool selection...');
  
  for (const toolName of CRM_STRUCTURE_TOOLS) {
    console.log(`Selecting: ${toolName}`);
    
    // Find all text elements
    const elements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent.trim() === toolName);
    
    if (elements.length > 0) {
      // Click the element (usually it's clickable or its parent is)
      elements[0].click();
      console.log(`✓ Selected: ${toolName}`);
      await new Promise(r => setTimeout(r, 300)); // Wait 300ms between clicks
    } else {
      console.warn(`⚠ Not found: ${toolName}`);
    }
  }
  
  console.log('\n✅ Tool selection complete!');
  console.log('Click "Add Now" to save the tools.');
}

// Run the selection
selectAllTools();
