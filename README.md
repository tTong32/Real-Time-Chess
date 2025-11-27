# Real-Time Chess

A real-time strategy chess game where players can move pieces simultaneously with cooldowns and energy management.

## Features

- **Real-time gameplay** - No turns, both players can move simultaneously
- **Cooldown system** - Pieces have cooldowns after moving
- **Energy system** - Moves cost energy that regenerates over time
- **Custom pieces** - Unique pieces with special abilities
- **Multiplayer** - Room-based system, matchmaking, and friend challenges
- **Custom boards** - Create and save custom starting positions
- **User system** - Authentication, ELO ratings, and statistics

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest, Playwright, k6
- **Deployment**: Docker, GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Real-Time-Chess.git
   cd Real-Time-Chess
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

4. **Using Docker (Alternative)**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

## Testing

```bash
# Run all tests
npm test

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Integration tests
npm run test:integration

# Security tests
npm run test:security

# Load tests (requires k6)
npm run test:load
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

### Quick Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Project Structure

```
Real-Time-Chess/
├── backend/          # Backend API and game engine
│   ├── src/
│   │   ├── game/     # Game logic
│   │   ├── routes/   # API routes
│   │   ├── managers/ # Game management
│   │   └── utils/    # Utilities
│   └── prisma/       # Database schema
├── frontend/         # React frontend
│   └── src/
│       ├── components/
│       ├── contexts/
│       └── pages/
├── e2e/              # End-to-end tests
├── load-tests/       # Load testing scripts
└── docker-compose.yml
```

## Environment Variables

### Backend

See `backend/.env.example` for required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` - Email service credentials
- `SENTRY_DSN` - Sentry error tracking (optional)

### Frontend

See `frontend/.env.example`:
- `VITE_API_URL` - Backend API URL

## Documentation

- [API Documentation](./docs/API.md) - Complete REST API and Socket.IO reference
- [Component Documentation](./docs/COMPONENTS.md) - Frontend React components reference
- [User Guide](./docs/USER_GUIDE.md) - How to play Real-Time Chess
- [Developer Guide](./docs/DEVELOPER_GUIDE.md) - Development setup and workflow
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)
- [Testing Guide](./TESTING.md)
- [Deployment Guide](./DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) file for details
