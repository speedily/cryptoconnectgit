# CryptoConnect

## Introduction
CryptoConnect is a Social Trading & Community Building Agent built on Base and XMTP. It enables users to create and manage social trading groups, interact with DeFi protocols, and leverage AI-powered insights for better trading decisions. The platform combines the power of blockchain technology, social networking, and artificial intelligence to create a comprehensive trading and community platform.

## Core Requirements
1. **XMTP Integration**
   - Built on XMTP protocol for secure messaging
   - Real-time group communication
   - End-to-end encrypted messages
   - Direct messaging capabilities
   - Group chat functionality

2. **Base Integration**
   - Built using Base AgentKit framework
   - Utilizes Basenames for identity management
   - Native Base network integration
   - Optimized for Base ecosystem
   - Leverages Base's security features

## Demo
[Add demo video or screenshots here]

## Problem Statement
1. **Isolated Trading Experience**
   - Traders often operate in silos
   - Limited access to community insights
   - No structured way to share trading strategies

2. **Complex DeFi Integration**
   - Difficult to track multiple portfolios
   - Complex token management
   - Lack of automated trading tools

3. **Limited Market Intelligence**
   - Manual market analysis is time-consuming
   - Risk assessment is often subjective
   - Limited access to AI-powered insights

4. **Community Management**
   - No dedicated platform for crypto communities
   - Difficult to coordinate group trading
   - Limited tools for community engagement

## Solution
CryptoConnect addresses these challenges through:

1. **Social Trading Groups**
   - Create and manage trading communities
   - Share trading signals and strategies
   - Real-time group communication via XMTP

2. **DeFi Integration**
   - Automated portfolio tracking
   - Token management and trading
   - Integration with Base network

3. **AI-Powered Insights**
   - Automated market analysis
   - Risk assessment tools
   - Trading strategy recommendations

4. **Community Tools**
   - Group management features
   - Performance analytics
   - Community engagement tools

## Architecture Overview

### High-Level Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  XMTP Network   │◄────┤  CryptoConnect  │────►│  Base Network   │
│                 │     │     Agent       │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │  AI Services    │
                        │                 │
                        └─────────────────┘
```

### Component Architecture
```
CryptoConnect
├── Agent Layer (Base AgentKit)
│   ├── Message Processing (XMTP)
│   ├── Command Routing
│   ├── Service Coordination
│   └── Basename Integration
│
├── Social Layer
│   ├── Group Management (XMTP)
│   ├── User Interactions
│   └── Community Features
│
├── DeFi Layer
│   ├── Portfolio Management
│   ├── Trading Execution
│   └── Token Management
│
├── AI Layer
│   ├── Market Analysis
│   ├── Risk Assessment
│   └── Strategy Generation
│
└── Analytics Layer
    ├── Performance Tracking
    ├── User Analytics
    └── Trading Metrics
```

### Technology Stack
- **Blockchain**: Base Network
- **Messaging**: XMTP Protocol
- **Agent Framework**: Base AgentKit
- **Identity**: Basenames
- **AI/ML**: OpenAI GPT-4
- **Smart Contracts**: Solidity
- **Backend**: Node.js, TypeScript
- **Analytics**: Custom Analytics Engine

### Data Flow
1. User interactions via XMTP
2. Agent processes commands using Base AgentKit
3. Basename verification and identity management
4. Services execute actions
5. Results returned to users via XMTP
6. Analytics collected
7. AI insights generated

## Features

### Core Features
1. **Social Trading Groups**
   - Create and manage trading communities
   - Share trading strategies and insights
   - Real-time portfolio tracking
   - Performance analytics and leaderboards

2. **DeFi Integration**
   - Direct trading execution within chats
   - Portfolio management
   - Price alerts and notifications
   - Gasless USDC transactions on Base

3. **Community Tools**
   - Group chat management
   - Member roles and permissions
   - Trading competitions
   - Community analytics

4. **AI-Powered Insights**
   - Market analysis
   - Trading suggestions
   - Risk assessment
   - Performance predictions

## Architecture

### Components
1. **XMTP Layer**
   - Secure messaging infrastructure
   - End-to-end encryption
   - Group chat management
   - Message streaming

2. **Agent Core**
   - Message processing
   - Command handling
   - State management
   - Error handling

3. **DeFi Integration**
   - Base network integration
   - Smart contract interaction
   - Transaction management
   - Portfolio tracking

4. **AI Engine**
   - Market analysis
   - Trading strategy generation
   - Risk assessment
   - Performance analytics

## Data Flow
1. **User Interaction**
   ```
   User -> XMTP Message -> Agent Processing -> Response/Action
   ```

2. **Trading Flow**
   ```
   User Command -> Validation -> Market Check -> Execution -> Confirmation
   ```

3. **Group Management**
   ```
   Admin Action -> Permission Check -> Group Update -> Notification
   ```

4. **Analytics Flow**
   ```
   Data Collection -> Analysis -> Insight Generation -> Distribution
   ```

## Why It Will Win

1. **Innovation**
   - First comprehensive social trading platform on Base
   - Unique combination of social features and DeFi
   - Advanced AI integration

2. **Technical Excellence**
   - Robust security with XMTP
   - Efficient gasless transactions
   - Scalable architecture

3. **User Experience**
   - Intuitive interface
   - Seamless integration
   - Real-time updates

4. **Market Potential**
   - Growing demand for social trading
   - Strong community focus
   - Clear monetization path

## Installation

### Prerequisites
- Node.js v20 or higher
- Yarn v4 or higher
- Base wallet
- XMTP account

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cryptoconnect.git
   cd cryptoconnect
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. Generate keys:
   ```bash
   # Generate XMTP encryption key
   yarn gen:encryption-key
   # This will output a secure random key
   # Add the generated key to your .env file as:
   # XMTP_ENCRYPTION_KEY=your_generated_key_here
   
   # Generate other required keys
   yarn gen:keys
   ```

5. Start the agent:
   ```bash
   yarn dev
   ```

### Environment Variables
Required environment variables in `.env`:
```
WALLET_KEY=your_wallet_private_key
ENCRYPTION_KEY=your_encryption_key
XMTP_ENV=dev
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_api_private_key
NETWORK_ID=base-sepolia
OPENAI_API_KEY=your_openai_api_key
```

Important security notes:
1. Keep your encryption key secure and never share it
2. Don't commit the `.env` file to version control
3. Make sure to backup your encryption key safely
4. If you lose the key, you'll need to generate a new one and update your configuration

## Dependencies

### Core Dependencies
- `@xmtp/node-sdk`: XMTP messaging
- `@coinbase/agentkit`: Agent functionality
- `@langchain/core`: AI integration
- `viem`: Ethereum interaction

### Development Dependencies
- TypeScript
- ESLint
- Prettier
- Jest

## Project Structure
```
cryptoconnect/
├── src/
│   ├── agent/           # Core agent implementation
│   │   └── index.ts     # Main agent logic
│   ├── defi/            # DeFi integration
│   │   └── index.ts     # Trading and portfolio management
│   ├── social/          # Social features
│   │   └── index.ts     # Group management and messaging
│   └── ai/              # AI integration
│       └── index.ts     # Market analysis and insights
├── tests/               # Test files
│   ├── agent.test.ts
│   ├── defi.test.ts
│   ├── social.test.ts
│   └── ai.test.ts
├── scripts/             # Utility scripts
│   ├── gen-keys.ts      # Key generation
│   └── setup.ts         # Project setup
├── config/              # Configuration files
├── docs/                # Documentation
├── .env                 # Environment variables
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Use Cases

### 1. Trading Community
```
User: "Create a trading group for Base tokens"
Agent: "Creating 'Base Traders' group. Inviting members..."
[Group created]
User: "Share my portfolio performance"
Agent: [Displays portfolio analytics]
```

### 2. Market Analysis
```
User: "Analyze USDC/BASE pair"
Agent: "Current trend: Bullish
       Support: $X
       Resistance: $Y
       Recommendation: [Analysis]"
```

### 3. Group Management
```
Admin: "Add trading competition"
Agent: "Setting up 7-day competition
       Prize pool: 1000 USDC
       Rules: [Details]"
```

### 4. Portfolio Tracking
```
User: "Show group performance"
Agent: [Displays leaderboard]
       "Top performer: @user1 (+15%)
       Group average: +8%"
```

## Future Roadmap
1. **Phase 1**: Core functionality
   - Basic trading groups
   - Portfolio tracking
   - Simple analytics

2. **Phase 2**: Advanced features
   - AI-powered insights
   - Advanced trading tools
   - Community features

3. **Phase 3**: Ecosystem expansion
   - Cross-chain support
   - Advanced analytics
   - API integration

## Contributing
We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Next Steps

1. **Environment Setup**
   ```bash
   # Required environment variables in .env
   WALLET_KEY=your_wallet_private_key
   ENCRYPTION_KEY=your_encryption_key
   XMTP_ENV=dev
   CDP_API_KEY_NAME=your_cdp_api_key_name
   CDP_API_KEY_PRIVATE_KEY=your_cdp_api_private_key
   NETWORK_ID=base-sepolia
   OPENAI_API_KEY=your_openai_api_key
   ```

2. **Installation**
   ```bash
   # Clone and setup
   git clone https://github.com/yourusername/cryptoconnect.git
   cd cryptoconnect
   yarn install
   yarn gen:keys
   ```

3. **Development**
   ```bash
   # Start development
   yarn dev
   ```

4. **Testing**
   ```bash
   # Run tests
   yarn test
   ```

# XMTP Configuration
XMTP_WALLET_KEY=your_wallet_key_here
XMTP_ENCRYPTION_KEY=your_encryption_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Base Network Configuration
BASE_RPC_URL=https://mainnet.base.org
BASE_CHAIN_ID=8453

# DeFi Configuration
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
UNISWAP_V3_QUOTER=0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a

# Agent Configuration
AGENT_NAME=CryptoConnect
AGENT_VERSION=1.0.0
AGENT_DESCRIPTION="Social Trading & Community Building Agent on Base"

# Database Configuration
DATABASE_URL=sqlite://.data/cryptoconnect.db

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=.data/logs/cryptoconnect.log

# Feature Flags
ENABLE_AI_INSIGHTS=true
ENABLE_SOCIAL_FEATURES=true
ENABLE_DEFI_TRADING=true

# CryptoConnect Project Structure

## Core Components

### 1. Agent System (`src/agent-index.ts`)
- Main agent implementation
- Handles message processing and routing
- Integrates with XMTP for messaging
- Commands:
  ```bash
  yarn dev  # Starts the agent
  ```

### 2. Social Features (`src/social/`)
- Social trading groups
- Community management
- User interactions
- Key files:
  - `social-index.ts`
  - `socialManager.ts`
  - `socialService.ts`

### 3. DeFi Integration (`src/defi/`)
- Portfolio tracking
- Trading functionality
- Token management
- Key files:
  - `defi-index.ts`
  - `defiService.ts`
  - `portfolioTracker.ts`

### 4. AI Services (`src/ai/`)
- AI-powered insights
- Trading analysis
- Risk assessment
- Key files:
  - `ai-index.ts`
  - `aiService.ts`
  - `riskModel.ts`

### 5. Analytics (`src/analytics/`)
- Performance tracking
- User analytics
- Trading metrics
- Key files:
  - `analyticsService.ts`
  - `metricsCollector.ts`

## Configuration and Setup

### Environment Setup
1. Create `.env` file with required variables:
   ```
   XMTP_WALLET_KEY=your_wallet_key
   XMTP_ENCRYPTION_KEY=your_encryption_key
   XMTP_ENV=dev
   ```

2. Generate keys:
   ```bash
   yarn gen:keys  # Generates XMTP keys
   yarn gen:encryption-key  # Generates encryption key
   ```

### Development Commands
```bash
# Start development server
yarn dev

# Build for production
yarn build

# Run tests
yarn test
yarn test:watch
yarn test:coverage

# Code quality
yarn lint
yarn format
```

## Project Structure
```
cryptoconnect/
├── src/
│   ├── agent/          # Core agent implementation
│   ├── defi/           # DeFi integration
│   ├── social/         # Social features
│   ├── ai/             # AI services
│   ├── analytics/      # Analytics
│   ├── middleware/     # Middleware components
│   ├── utils/          # Utility functions
│   └── config/         # Configuration
├── scripts/            # Utility scripts
├── tests/              # Test files
├── docs/               # Documentation
└── config/             # Configuration files
```

## Running Different Components

### 1. Main Agent
```bash
yarn dev
```
This starts the main agent which handles:
- XMTP messaging
- Command processing
- Service coordination

### 2. DeFi Services
The DeFi services are integrated into the main agent but can be tested independently:
```bash
yarn test src/defi/**/*.test.ts
```

### 3. Social Features
Social features are part of the main agent but can be tested:
```bash
yarn test src/social/**/*.test.ts
```

### 4. AI Services
AI services require OpenAI API key in .env:
```
OPENAI_API_KEY=your_api_key
AI_MODEL=gpt-4
```

### 5. Analytics
Analytics services are integrated into the main agent and can be enabled with:
```
ENABLE_ANALYTICS=true
```

## Development Workflow

1. Setup:
   ```bash
   yarn install
   cp .env.example .env
   # Edit .env with your credentials
   yarn gen:keys
   ```

2. Development:
   ```bash
   yarn dev
   ```

3. Testing:
   ```bash
   yarn test
   ```

4. Building:
   ```bash
   yarn build
   ```

## Key Features

1. **Social Trading**
   - Group management
   - Trading signals
   - Community building

2. **DeFi Integration**
   - Portfolio tracking
   - Token management
   - Trading execution

3. **AI Features**
   - Market analysis
   - Risk assessment
   - Trading insights

4. **Analytics**
   - Performance tracking
   - User metrics
   - Trading statistics

## Environment Variables

### Required Variables
1. `XMTP_WALLET_KEY` - Your wallet's private key
2. `XMTP_ENCRYPTION_KEY` - A 32-character encryption key
3. `XMTP_ENV` - Environment setting (defaults to 'dev', can be 'local', 'dev', or 'production')

### Optional Variables
1. `CDP_API_KEY_NAME` - For CDP API integration
2. `CDP_API_KEY_PRIVATE_KEY` - For CDP API integration
3. `NETWORK_ID` - Network ID (defaults to 'base-sepolia')
4. `OPENAI_API_KEY` - For AI features
5. `AI_MODEL` - AI model to use (defaults to 'gpt-4')
6. `AI_TEMPERATURE` - AI temperature setting (defaults to 0.7)
7. `RATE_LIMIT_WINDOW_MS` - Rate limiting window (defaults to 60000)
8. `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (defaults to 100)
9. `ENABLE_TRADING` - Enable trading features (defaults to false)
10. `ENABLE_ANALYTICS` - Enable analytics features (defaults to false)

## Dependencies

### Core Dependencies
- `@xmtp/node-sdk` - XMTP messaging
- `viem` - Ethereum interactions
- `ethers` - Ethereum utilities
- `@langchain/openai` - AI integration
- `@coinbase/agentkit` - Agent framework

### Development Dependencies
- TypeScript
- Jest for testing
- ESLint for linting
- Prettier for formatting

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 