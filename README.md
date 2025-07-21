# DaliaTrac - Portfolio Manager

![DaliaTrac Logo](src-tauri/icons/icon.png)

**DaliaTrac** is a professional portfolio management and financial analysis application built with Tauri, React, TypeScript, and Rust. It provides real-time market data, comprehensive portfolio tracking, and advanced financial analytics.

## Features

### 🏦 Portfolio Management
- **Multi-Portfolio Support**: Create and manage multiple investment portfolios
- **Real-time Holdings Tracking**: Monitor positions with live market data
- **Cash Management**: Track cash balances and transactions
- **Performance Analytics**: P&L tracking with detailed statistics

### 📊 Financial Data & Analytics
- **Market Data Integration**: Real-time quotes and intraday data via DataBursátil API
- **Interactive Charts**: Professional-grade charts powered by Nivo
- **Financial Statements**: Access to quarterly results, cash flows, and balance sheets
- **Technical Analysis**: Comprehensive asset analysis tools

### 🎯 User Interface
- **Modern Design**: Dark theme with responsive layout
- **Intuitive Navigation**: Easy-to-use interface for all experience levels
- **Asset Search**: Quick ticker search and asset discovery
- **Detailed Asset Pages**: In-depth analysis for individual securities

## Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Nivo** - Professional charting library
- **CSS3** - Custom styling with dark theme

### Backend
- **Rust** - High-performance backend with Tauri
- **PostgreSQL** - Robust database for financial data
- **Tokio** - Async runtime for database operations
- **Serde** - JSON serialization/deserialization

### APIs
- **DataBursátil API** - Mexican stock market data
- **PostgreSQL Integration** - Financial data storage and retrieval

## Prerequisites

- **Node.js** (18+ recommended)
- **pnpm** - Package manager
- **Rust** (latest stable)
- **PostgreSQL** - Database server
- **ImageMagick** - For icon processing (optional)

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd daliatrac
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the project root:
   ```env
   API_KEY=your_databursatil_api_key
   DATABASE_URL=postgresql://username:password@localhost/daliatrac
   ```

4. **Database Setup**
   - Create PostgreSQL database
   - Run database migrations (if available)

## Development

### Run in Development Mode
```bash
# Start the development server
pnpm tauri:dev

# Or run frontend only
pnpm dev
```

### Build for Production
```bash
# Build the complete application
pnpm tauri:build

# Build frontend only
pnpm build
```

### TypeScript Checking
```bash
# Check TypeScript without emitting files
pnpm tsc --noEmit
```

## Project Structure

```
daliatrac/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── assets/            # Static assets
│   └── main.tsx           # Entry point
├── src-tauri/             # Tauri/Rust backend
│   ├── src/               # Rust source code
│   ├── icons/             # Application icons
│   └── tauri.conf.json    # Tauri configuration
├── public/                # Public assets
├── dist/                  # Built frontend
└── package.json           # Dependencies and scripts
```

## Key Components

### Portfolio Management
- `PortfolioEnhanced.tsx` - Main portfolio interface
- `AddAssetModal.tsx` - Asset addition interface
- Portfolio CRUD operations with PostgreSQL backend

### Financial Data
- `Assets.tsx` - Individual asset analysis
- `StockChart.tsx` - Interactive price charts
- `FinancialTable.tsx` - Financial statement displays

### Backend Services
- `user_management.rs` - User and portfolio operations
- `data_bursatil_client.rs` - Market data integration
- `portfolio_services.rs` - Portfolio business logic

## Configuration

### Tauri Configuration
The app is configured in `src-tauri/tauri.conf.json` with:
- Window dimensions: 1400x900 (minimum 1200x800)
- Professional branding and metadata
- Cross-platform icon support

### Build Targets
- **Linux**: AppImage, deb packages
- **Windows**: MSI installer, exe
- **macOS**: DMG, app bundle

## Database Schema

The application uses PostgreSQL with tables for:
- Users and authentication
- Portfolio management
- Transaction history
- Market data caching
- Financial statements

## API Integration

### DataBursátil API
- Real-time market quotes
- Historical price data
- Financial statements
- Market indices and forex

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

© 2025 Iván Casas. All rights reserved.

This is proprietary software developed for internal use.

## Support

For technical support or questions, contact the development team.

---

**DaliaTrac** - Professional portfolio management made simple.
