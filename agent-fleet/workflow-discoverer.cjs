#!/usr/bin/env node
/**
 * Workflow Discoverer
 * Scans codebase to discover and codify all user workflows
 * Generates workflow JSON definitions for agents to execute
 */

const fs = require('fs').promises;
const path = require('path');
const { validateWorkflow } = require('./lib/schemas.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, 'agent-coordination/workflows');

/**
 * Discover UI workflows from HTML and frontend modules
 */
async function discoverUIWorkflows() {
  console.log('Discovering UI workflows...');

  const workflows = [];

  // Read integrated-ui.html
  const htmlPath = path.join(PROJECT_ROOT, 'frontend/integrated-ui.html');
  const htmlContent = await fs.readFile(htmlPath, 'utf-8');

  // Extract interactive elements (buttons, forms, etc.)
  const buttonMatches = htmlContent.matchAll(/id="([^"]+)".*?(?:button|onclick)/gi);
  const formMatches = htmlContent.matchAll(/id="([^"]+)".*?(?:input|select)/gi);

  // Simple quote creation workflow
  workflows.push({
    workflow_id: 'simple-quote-creation',
    description: 'Create a basic generator quote',
    category: 'ui',
    critical_path: true,
    assigned_agent: 'ui-core-workflow',
    steps: [
      {
        type: 'ui',
        action: 'select-generator',
        element: '#generatorSelect',
        validation: 'options populated from Zoho'
      },
      {
        type: 'ui',
        action: 'select-services',
        element: '.service-checkbox',
        validation: 'at least one service selected'
      },
      {
        type: 'api',
        action: 'calculate-total',
        endpoint: '/api/calculate',
        validation: 'response contains totalCost'
      },
      {
        type: 'ui',
        action: 'generate-pdf',
        element: '#generatePDF',
        validation: 'PDF downloads successfully'
      }
    ],
    expected_duration_ms: 5000,
    dependencies: []
  });

  // Multi-unit quote workflow
  workflows.push({
    workflow_id: 'multi-unit-quote-creation',
    description: 'Create quote for multiple generator units',
    category: 'ui',
    critical_path: true,
    assigned_agent: 'ui-multi-unit',
    steps: [
      {
        type: 'ui',
        action: 'open-multi-unit-modal',
        element: '#openMultiUnitModal',
        validation: 'modal appears'
      },
      {
        type: 'ui',
        action: 'add-first-unit',
        element: '#addUnit',
        validation: 'unit row added'
      },
      {
        type: 'ui',
        action: 'select-generator-for-unit',
        element: '.unit-generator-select',
        validation: 'generator selected'
      },
      {
        type: 'ui',
        action: 'add-second-unit',
        element: '#addUnit',
        validation: 'second unit row added'
      },
      {
        type: 'ui',
        action: 'assign-services',
        element: '.unit-service-checkbox',
        validation: 'services assigned to units'
      },
      {
        type: 'ui',
        action: 'calculate-totals',
        element: '#calculateMultiUnit',
        validation: 'totals aggregated'
      },
      {
        type: 'ui',
        action: 'generate-multi-unit-pdf',
        element: '#generateMultiUnitPDF',
        validation: 'multi-unit PDF generated'
      }
    ],
    expected_duration_ms: 10000,
    dependencies: []
  });

  // Service selection workflows (one per service)
  const services = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  for (const service of services) {
    workflows.push({
      workflow_id: `service-${service.toLowerCase()}-selection`,
      description: `Test Service ${service} selection and calculation`,
      category: 'ui',
      critical_path: service === 'A', // Service A is most common
      assigned_agent: 'ui-service-selection',
      steps: [
        {
          type: 'ui',
          action: `select-service-${service}`,
          element: `#service${service}`,
          validation: `Service ${service} checkbox checked`
        },
        {
          type: 'api',
          action: 'calculate',
          endpoint: '/api/calculate',
          validation: `response includes Service ${service} in breakdown`
        }
      ],
      expected_duration_ms: 2000,
      dependencies: []
    });
  }

  console.log(`✅ Discovered ${workflows.length} UI workflows`);
  return workflows;
}

/**
 * Discover API workflows from server endpoints
 */
async function discoverAPIWorkflows() {
  console.log('Discovering API workflows...');

  const workflows = [];

  // Read server-secure.cjs
  const serverPath = path.join(PROJECT_ROOT, 'src/api/server-secure.cjs');
  const serverContent = await fs.readFile(serverPath, 'utf-8');

  // Extract API endpoints
  const routeMatches = serverContent.matchAll(/app\.(get|post|put|delete)\(['"]([^'"]+)['"]/gi);

  const endpoints = [];
  for (const match of routeMatches) {
    endpoints.push({ method: match[1].toUpperCase(), path: match[2] });
  }

  // Create workflow for each endpoint
  for (const endpoint of endpoints) {
    const workflowId = `api-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/\//g, '-').replace(/^-/, '')}`;
    workflows.push({
      workflow_id: workflowId,
      description: `Test ${endpoint.method} ${endpoint.path}`,
      category: 'api',
      critical_path: endpoint.path.includes('/calculate'),
      assigned_agent: 'api-core-endpoints',
      steps: [
        {
          type: 'api',
          action: `${endpoint.method.toLowerCase()}-request`,
          endpoint: endpoint.path,
          method: endpoint.method,
          validation: 'response status 200 or expected status'
        }
      ],
      expected_duration_ms: 1000,
      dependencies: []
    });
  }

  console.log(`✅ Discovered ${workflows.length} API workflows`);
  return workflows;
}

/**
 * Discover integration workflows
 */
async function discoverIntegrationWorkflows() {
  console.log('Discovering integration workflows...');

  const workflows = [
    {
      workflow_id: 'zoho-account-sync',
      description: 'Sync customer account to Zoho CRM',
      category: 'integration',
      critical_path: true,
      assigned_agent: 'zoho-crm-agent',
      steps: [
        {
          type: 'integration',
          action: 'search-account',
          service: 'zoho-crm',
          validation: 'account found or created'
        },
        {
          type: 'integration',
          action: 'verify-account-fields',
          service: 'zoho-crm',
          validation: 'all required fields populated'
        }
      ],
      expected_duration_ms: 3000,
      dependencies: []
    },
    {
      workflow_id: 'zoho-quote-creation',
      description: 'Create quote in Zoho CRM',
      category: 'integration',
      critical_path: true,
      assigned_agent: 'zoho-crm-agent',
      steps: [
        {
          type: 'integration',
          action: 'create-quote',
          service: 'zoho-crm',
          validation: 'quote ID returned'
        },
        {
          type: 'integration',
          action: 'verify-line-items',
          service: 'zoho-crm',
          validation: 'line items match services selected'
        }
      ],
      expected_duration_ms: 4000,
      dependencies: ['zoho-account-sync']
    },
    {
      workflow_id: 'zoho-books-estimate',
      description: 'Create estimate in Zoho Books',
      category: 'integration',
      critical_path: true,
      assigned_agent: 'zoho-books-agent',
      steps: [
        {
          type: 'integration',
          action: 'create-estimate',
          service: 'zoho-books',
          validation: 'estimate ID returned'
        },
        {
          type: 'integration',
          action: 'verify-totals',
          service: 'zoho-books',
          validation: 'totals match CRM quote'
        }
      ],
      expected_duration_ms: 4000,
      dependencies: ['zoho-quote-creation']
    }
  ];

  console.log(`✅ Discovered ${workflows.length} integration workflows`);
  return workflows;
}

/**
 * Save workflows to coordination directory
 */
async function saveWorkflows(workflows) {
  console.log('\nSaving workflow definitions...');

  // Group workflows by assigned agent
  const workflowsByAgent = {};
  for (const workflow of workflows) {
    const agent = workflow.assigned_agent;
    if (!workflowsByAgent[agent]) {
      workflowsByAgent[agent] = [];
    }
    workflowsByAgent[agent].push(workflow);
  }

  // Save to agent-specific directories
  for (const [agent, agentWorkflows] of Object.entries(workflowsByAgent)) {
    const agentDir = path.join(WORKFLOWS_DIR, agent);
    await fs.mkdir(agentDir, { recursive: true });

    for (const workflow of agentWorkflows) {
      // Validate workflow before saving
      validateWorkflow(workflow);

      const filePath = path.join(agentDir, `${workflow.workflow_id}.json`);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
    }

    console.log(`✅ Saved ${agentWorkflows.length} workflows for ${agent}`);
  }
}

/**
 * Main discovery process
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  WORKFLOW DISCOVERER - AUTONOMOUS TEST FLEET              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const uiWorkflows = await discoverUIWorkflows();
    const apiWorkflows = await discoverAPIWorkflows();
    const integrationWorkflows = await discoverIntegrationWorkflows();

    const allWorkflows = [...uiWorkflows, ...apiWorkflows, ...integrationWorkflows];

    await saveWorkflows(allWorkflows);

    console.log(`\n✅ Discovery complete! Total workflows: ${allWorkflows.length}`);
    console.log('\nWorkflow breakdown:');
    console.log(`  UI workflows: ${uiWorkflows.length}`);
    console.log(`  API workflows: ${apiWorkflows.length}`);
    console.log(`  Integration workflows: ${integrationWorkflows.length}`);
    console.log('\nWorkflows saved to: agent-coordination/workflows/\n');
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
