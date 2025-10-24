# Energen Calculator v5.0

Advanced bid tool for generator service contracts with integrated Zoho CRM/Books/FSM workflow.

## Overview

Energen Calculator v5.0 is a comprehensive web-based application designed to streamline the bidding process for generator service contracts. It features:

- **Multi-unit Generator Management**: Handle complex service quotes with multiple generator units
- **Zoho Integration**: Seamless integration with Zoho CRM, Books, and FSM
- **PDF Generation**: Professional quote generation with company branding
- **Service Templates**: Pre-configured service packages for various maintenance schedules
- **Customer Enrichment**: Automatic customer data enrichment from multiple sources
- **RFP Processing**: Automated RFP (Request for Proposal) document processing

## Tech Stack

- **Frontend**: Vanilla JavaScript with modular architecture
- **Backend**: Node.js with Express
- **Database Integration**: Zoho CRM, Zoho Books, Zoho FSM
- **PDF Generation**: Custom PDF generation with logo embedding
- **MCP Integration**: Model Context Protocol for Claude Code integration

## Project Structure

```
energen-calculator-v5.0/
├── frontend/           # Frontend application
│   ├── components/     # Reusable UI components
│   ├── modules/        # Feature modules
│   ├── services/       # API services
│   └── styles/         # CSS styles
├── src/
│   ├── api/           # Backend API server
│   ├── engine/        # Calculation engine
│   └── services/      # Business logic services
├── modules/           # Shared modules
│   ├── @energen/      # Core Energen modules
│   ├── zoho-integration/  # Zoho API integration
│   ├── pdf-generator/     # PDF generation
│   └── customer-enrichment/  # Customer data enrichment
└── tests/            # Test suites

```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Zoho Developer Account (for API access)


### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kevmomuny/energen-calculator-v5.0.git
   cd energen-calculator-v5.0
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Zoho credentials
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

See `.env.example` for all available configuration options.

## Claude Code Integration

This project is optimized for use with Claude Code. Configuration files:
- `.claude/settings.local.json` - Claude Code settings (not in repo - contains secrets)
- `.vscode/mcp.json` - MCP server configuration

## License

Proprietary - Energen Systems

## Support

For issues or questions, please contact the development team.
