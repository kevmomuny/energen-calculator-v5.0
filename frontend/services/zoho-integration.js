// Stub file to satisfy dynamic import in init.js
// The actual Zoho integration is in modules/zoho-sync/zoho-service.js

export class ZohoIntegration {
  constructor() {
    console.log('ZohoIntegration stub loaded');
  }

  async sync() {
    console.log('Zoho sync called (stub - no action)');
    return { success: true, message: 'Stub implementation' };
  }
}

export default ZohoIntegration;
