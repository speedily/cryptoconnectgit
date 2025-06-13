# CryptoConnect

A Social Trading & Community Building Agent built on Base and XMTP.

## Features

- Social Trading Groups
- DeFi Integration
- Community Tools
- AI-Powered Insights

## Prerequisites

- Node.js v20 or higher
- Yarn v4 or higher
- Base wallet
- XMTP account

## Installation

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
   yarn gen:keys
   ```

5. Start the agent:
   ```bash
   yarn dev
   ```

## Development

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn test` - Run tests
- `yarn lint` - Run linter
- `yarn format` - Format code

## Project Structure

```
cryptoconnect/
├── src/
│   ├── agent/     # Core agent implementation
│   ├── defi/      # DeFi integration
│   ├── social/    # Social features
│   └── ai/        # AI integration
├── tests/         # Test files
├── config/        # Configuration files
└── docs/          # Documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 