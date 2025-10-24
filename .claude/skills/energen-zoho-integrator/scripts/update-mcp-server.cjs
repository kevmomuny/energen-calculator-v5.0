#!/usr/bin/env node
/**
 * Update MCP Server with New Module Tools
 * Adds tool definitions and handlers to ZohoMCPServer.js
 */

const fs = require('fs');
const path = require('path');

function getModuleNames(moduleName) {
  const snake = moduleName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const kebab = snake.replace(/_/g, '-');
  const camel = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
  const pascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

  return { snake, kebab, camel, pascal };
}

function camelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function generateToolDefinitions(moduleSpec) {
  const { moduleName, displayName, fields, operations } = moduleSpec;
  const names = getModuleNames(moduleName);

  const tools = [];

  // Create operation
  if (operations.includes('create')) {
    const properties = {};
    const required = [];

    fields.forEach(field => {
      const paramName = field.data_type === 'lookup'
        ? camelCase(field.api_name + '_id')
        : camelCase(field.api_name);

      properties[paramName] = {
        type: getJSTypeForSchema(field.data_type),
        description: field.field_label + (field.data_type === 'lookup' ? ' (lookup ID)' : '')
      };

      if (field.mandatory) {
        required.push(paramName);
      }
    });

    tools.push({
      name: `create_${names.snake}`,
      description: `Create a new ${displayName} record in Zoho CRM`,
      inputSchema: {
        type: 'object',
        properties,
        required
      }
    });
  }

  // Read, Update, Delete, Search operations
  ['read', 'update', 'delete', 'search'].forEach(op => {
    if (operations.includes(op)) {
      tools.push(generateOperationTool(op, names, displayName));
    }
  });

  return tools;
}

function generateOperationTool(operation, names, displayName) {
  const toolDefs = {
    read: {
      name: `get_${names.snake}`,
      description: `Get ${displayName} details by ID`,
      inputSchema: {
        type: 'object',
        properties: {
          recordId: { type: 'string', description: `${displayName} ID` }
        },
        required: ['recordId']
      }
    },
    update: {
      name: `update_${names.snake}`,
      description: `Update an existing ${displayName} record`,
      inputSchema: {
        type: 'object',
        properties: {
          recordId: { type: 'string', description: `${displayName} ID` },
          updates: { type: 'object', description: 'Fields to update' }
        },
        required: ['recordId', 'updates']
      }
    },
    delete: {
      name: `delete_${names.snake}`,
      description: `Delete a ${displayName} record`,
      inputSchema: {
        type: 'object',
        properties: {
          recordId: { type: 'string', description: `${displayName} ID` }
        },
        required: ['recordId']
      }
    },
    search: {
      name: `search_${names.snake}`,
      description: `Search ${displayName} records`,
      inputSchema: {
        type: 'object',
        properties: {
          searchTerm: { type: 'string', description: 'Search term' },
          criteria: { type: 'object', description: 'Advanced search criteria' },
          limit: { type: 'number', default: 10 },
          page: { type: 'number', default: 1 }
        },
        required: ['searchTerm']
      }
    }
  };

  return toolDefs[operation];
}

function generateHandlers(moduleSpec) {
  const { moduleName, fields, operations } = moduleSpec;
  const names = getModuleNames(moduleName);

  const handlers = {};

  operations.forEach(op => {
    const handlerName = `handle${names.pascal}${op.charAt(0).toUpperCase() + op.slice(1)}`;
    handlers[`${op}_${names.snake}`] = handlerName;
  });

  return handlers;
}

function generateHandlerFunctions(moduleSpec) {
  const { moduleName, displayName, fields, operations } = moduleSpec;
  const names = getModuleNames(moduleName);

  let functions = '';

  // Create handler
  if (operations.includes('create')) {
    const fieldMappings = fields.map(field => {
      const apiName = field.api_name;
      const paramName = field.data_type === 'lookup'
        ? camelCase(field.api_name + '_id')
        : camelCase(field.api_name);

      if (field.data_type === 'lookup') {
        return `            ${apiName}: args.${paramName}`;
      }
      return `            ${apiName}: args.${paramName}`;
    }).join(',\n');

    functions += `
    /**
     * ${displayName}: Create
     */
    async handle${names.pascal}Create(args) {
        const recordData = {
${fieldMappings}
        };

        const response = await this.makeZohoApiCallWithRetry(() =>
            axios.post(
                \`\${this.config.apiUrl}/crm/v2/${moduleName}\`,
                { data: [recordData] },
                {
                    headers: {
                        'Authorization': \`Zoho-oauthtoken \${this.accessToken}\`,
                        'Content-Type': 'application/json'
                    }
                }
            )
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

`;
  }

  // Other operations
  const otherOps = operations.filter(op => op !== 'create');
  otherOps.forEach(op => {
    functions += generateOperationHandler(op, names, moduleName);
  });

  return functions;
}

function generateOperationHandler(operation, names, moduleName) {
  const handlers = {
    read: `
    async handle${names.pascal}Get(args) {
        const { recordId } = args;

        const response = await axios.get(
            \`\${this.config.apiUrl}/crm/v2/${moduleName}/\${recordId}\`,
            {
                headers: {
                    'Authorization': \`Zoho-oauthtoken \${this.accessToken}\`
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }
`,
    update: `
    async handle${names.pascal}Update(args) {
        const { recordId, updates } = args;

        const response = await axios.put(
            \`\${this.config.apiUrl}/crm/v2/${moduleName}/\${recordId}\`,
            { data: [updates] },
            {
                headers: {
                    'Authorization': \`Zoho-oauthtoken \${this.accessToken}\`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }
`,
    delete: `
    async handle${names.pascal}Delete(args) {
        const { recordId } = args;

        await axios.delete(
            \`\${this.config.apiUrl}/crm/v2/${moduleName}/\${recordId}\`,
            {
                headers: {
                    'Authorization': \`Zoho-oauthtoken \${this.accessToken}\`
                }
            }
        );

        return {
            success: true,
            message: 'Record deleted successfully'
        };
    }
`,
    search: `
    async handle${names.pascal}Search(args) {
        const { searchTerm, criteria, limit = 10, page = 1 } = args;

        const params = {
            per_page: limit,
            page: page
        };

        if (criteria) {
            params.criteria = this.buildSearchCriteria(criteria);
        } else {
            params.word = searchTerm;
        }

        const response = await axios.get(
            \`\${this.config.apiUrl}/crm/v2/${moduleName}/search\`,
            {
                params,
                headers: {
                    'Authorization': \`Zoho-oauthtoken \${this.accessToken}\`
                }
            }
        );

        return {
            success: true,
            data: {
                records: response.data.data || [],
                info: response.data.info || {}
            }
        };
    }
`
  };

  return handlers[operation] || '';
}

function getJSTypeForSchema(dataType) {
  const typeMap = {
    text: 'string',
    textarea: 'string',
    number: 'number',
    currency: 'number',
    date: 'string',
    datetime: 'string',
    email: 'string',
    phone: 'string',
    url: 'string',
    picklist: 'string',
    multiselectpicklist: 'array',
    boolean: 'boolean',
    lookup: 'string'
  };

  return typeMap[dataType] || 'string';
}

async function updateMCPServer(moduleSpec, mcpServerPath) {
  console.log('\nUpdating MCP Server...');

  let content = fs.readFileSync(mcpServerPath, 'utf-8');

  // Generate new tool definitions
  const tools = generateToolDefinitions(moduleSpec);
  const handlers = generateHandlers(moduleSpec);
  const handlerFunctions = generateHandlerFunctions(moduleSpec);

  // Find insertion points
  const toolsInsertMarker = '// Custom Module Tools - Work Orders';
  const handlersInsertMarker = '// Custom module handlers - Work Orders';
  const functionsInsertMarker = '/**\n     * Work Orders: Search\n     */';

  // Insert tool definitions
  const toolsJson = JSON.stringify(tools, null, 16).split('\n').slice(1, -1).join('\n');
  content = content.replace(
    toolsInsertMarker,
    `${toolsJson},\n\n                ${toolsInsertMarker}`
  );

  // Insert handler mappings
  const handlersStr = Object.entries(handlers)
    .map(([key, value]) => `            ${key}: this.${value}`)
    .join(',\n');
  content = content.replace(
    handlersInsertMarker,
    `${handlersStr},\n\n            ${handlersInsertMarker}`
  );

  // Insert handler functions
  content = content.replace(
    functionsInsertMarker,
    `${handlerFunctions}\n    ${functionsInsertMarker}`
  );

  // Write updated content
  fs.writeFileSync(mcpServerPath, content);

  console.log('✅ MCP Server updated successfully!');
  console.log(`   Added ${tools.length} tool definitions`);
  console.log(`   Added ${Object.keys(handlers).length} handlers`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: update-mcp-server.js <spec-file.json>');
    process.exit(1);
  }

  const specFile = args[0];

  console.log('═'.repeat(70));
  console.log('UPDATE MCP SERVER');
  console.log('═'.repeat(70));

  console.log(`\nReading spec: ${specFile}`);
  const moduleSpec = JSON.parse(fs.readFileSync(specFile, 'utf-8'));

  const mcpServerPath = path.join(__dirname, '../../../modules/zoho-integration/ZohoMCPServer.js');

  console.log(`MCP Server: ${mcpServerPath}`);

  await updateMCPServer(moduleSpec, mcpServerPath);

  console.log('\nNext steps:');
  console.log('  1. Review the updated MCP server code');
  console.log('  2. Restart the MCP server');
  console.log('  3. Test the new tools via MCP client');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateMCPServer, generateToolDefinitions, generateHandlers };
