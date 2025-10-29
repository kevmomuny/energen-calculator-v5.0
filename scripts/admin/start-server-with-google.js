// Start server with Google API environment variables
process.env.GOOGLE_API_KEY = 'AIzaSyChw8FaZaHzfm0MMLi0o_PvHnHEXm1QTaI';
process.env.GOOGLE_SEARCH_ENGINE_ID = '8578917a3152c4259';

console.log('✓ Google Custom Search API configured');
console.log('  API Key:', process.env.GOOGLE_API_KEY.substring(0, 20) + '...');
console.log('  Search Engine ID:', process.env.GOOGLE_SEARCH_ENGINE_ID);
console.log('');
console.log('Starting Energen v5.0 Server...');
console.log('');

require('./src/api/server-secure.cjs');
