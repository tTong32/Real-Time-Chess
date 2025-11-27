# Developer Guide

Complete guide for developers working on Real-Time Chess.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Code Organization](#code-organization)
5. [Key Concepts](#key-concepts)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Contributing](#contributing)

---

## Architecture Overview

Real-Time Chess is a full-stack web application with the following architecture:

```
┌─────────────┐
│   Frontend  │  React + Vite + Tailwind CSS
│  (React)    │
└──────┬──────┘
       │ HTTP/REST
       │ Socket.IO
┌──────▼──────┐
│   Backend   │  Node.js + Express + Socket.IO
│  (Express)  │
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │  PostgreSQL + Prisma ORM
│ (PostgreSQL)│
└─────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Socket.IO client for real-time communication
- Vitest + React Testing Library for testing

**Backend:**
- Node.js 20+ with TypeScript
- Express.js for REST API
- Socket.IO for WebSocket communication
- Prisma ORM for database access
- Winston for logging
- Sentry for error tracking
- Vitest for testing

**Database:**
- PostgreSQL 16+
- Prisma for schema management

**DevOps:**
- Docker for containerization
- GitHub Actions for CI/CD
- Nginx for frontend serving

---

## Project Structure

```
Real-Time-Chess/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── game/            # Game engine logic
│   │   ├── managers/        # Game/room/matchmaking managers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Prisma models (tests)
│   │   ├── routes/          # REST API routes
│   │   ├── socket.ts        # Socket.IO setup
│   │   ├── server.ts        # Express server
│   │   ├── tests/           # Integration/security tests
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   ├── test/            # Test utilities
│   │   └── main.tsx         # Entry point
│   └── package.json
│
├── e2e/                     # End-to-end tests (Playwright)
├── load-tests/              # Load tests (k6)
├── docs/                     # Documentation
└── docker-compose.yml        # Docker orchestration
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker (optional, for containerized development)
- Git

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/Real-Time-Chess.git
   cd Real-Time-Chess
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure environment variables
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Configure environment variables
   npm run dev
   ```

4. **Database Setup:**
   - Create a PostgreSQL database
   - Update `DATABASE_URL` in `backend/.env`
   - Run migrations: `npx prisma migrate dev`

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/realtimechess
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.example.com
EMAIL_USER=user@example.com
EMAIL_PASS=password
SENTRY_DSN=  # Optional
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000
```

### Docker Development

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Stop services
docker-compose -f docker-compose.dev.yml down
```

---

## Code Organization

### Backend Structure

#### `src/game/`
Core game engine logic:
- `Board.ts` - Board state management
- `GameEngine.ts` - Main game engine
- `MoveValidator.ts` - Move validation
- `CooldownManager.ts` - Cooldown tracking
- `EnergyManager.ts` - Energy management
- `constraints.ts` - Board validation rules
- `types.ts` - Game type definitions

#### `src/managers/`
High-level game management:
- `GameManager.ts` - Game lifecycle management
- `RoomManager.ts` - Room-based games
- `MatchmakingManager.ts` - Matchmaking queue

#### `src/routes/`
REST API endpoints:
- `auth.ts` - Authentication routes
- `users.ts` - User management
- `boards.ts` - Custom board management
- `friends.ts` - Friends system

#### `src/utils/`
Utility functions:
- `errorHandler.ts` - Error handling middleware
- `logger.ts` - Winston logging
- `sentry.ts` - Sentry integration
- `jwt.ts` - JWT token management
- `email.ts` - Email sending

### Frontend Structure

#### `src/components/`
Reusable React components:
- Game components (Board, EnergyBar, etc.)
- UI components (LoadingSpinner, ThemeToggle)
- Social components (FriendList, FriendSearch)

#### `src/contexts/`
React context providers:
- `AuthContext.tsx` - Authentication state
- `GameContext.tsx` - Game state
- `SocketContext.tsx` - Socket.IO connection

#### `src/pages/`
Page components:
- `Login.tsx`, `Signup.tsx` - Authentication
- `UserProfile.tsx` - User profile
- `BoardEditorPage.tsx` - Board editor

---

## Key Concepts

### Game State

Game state is managed in memory on the backend and synchronized via Socket.IO:

```typescript
interface GameState {
  id: string;
  board: (Piece | null)[][];
  whiteState: PlayerState;
  blackState: PlayerState;
  status: 'waiting' | 'active' | 'finished';
  winner?: 'white' | 'black' | null;
  lastMoveAt?: number;
}
```

### Real-Time Synchronization

- Game state is broadcast to all players after each move
- Socket.IO rooms (`game:${gameId}`) are used for efficient broadcasting
- State is persisted to database periodically

### Cooldown System

Cooldowns are tracked per piece position:
- Stored as `Record<string, number>` (position -> remaining seconds)
- Updated every second
- Validated before moves

### Energy System

Energy regenerates continuously:
- Initial rate: 0.5/second
- Increases every 15 seconds
- Maximum rate: 10/second
- Capped at 25 maximum

### Matchmaking

ELO-based matchmaking:
- Players are matched by similar ELO
- Queue processes matches in background
- Immediate matches if queue has suitable opponent

---

## Development Workflow

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes:**
   - Write code
   - Write tests
   - Update documentation

3. **Run tests:**
   ```bash
   # Backend
   cd backend && npm test

   # Frontend
   cd frontend && npm test

   # E2E
   npm run test:e2e
   ```

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feature/my-feature
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (if configured)
- **Linting**: ESLint (if configured)
- **Naming**: camelCase for variables, PascalCase for components

### Git Commit Messages

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

Example:
```
feat: add custom piece abilities
fix: resolve energy regeneration bug
docs: update API documentation
```

---

## Testing

### Unit Tests

**Backend:**
```bash
cd backend
npm test
```

**Frontend:**
```bash
cd frontend
npm test
```

### Integration Tests

```bash
cd backend
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

Requires Playwright:
```bash
npx playwright install
```

### Load Tests

```bash
npm run test:load
```

Requires k6:
```bash
# Install k6
# Then run tests
k6 run load-tests/k6-basic.js
```

### Security Tests

```bash
cd backend
npm run test:security
```

---

## Contributing

### Before Contributing

1. Read the codebase
2. Check existing issues/PRs
3. Discuss major changes in issues first

### Pull Request Process

1. **Fork the repository**
2. **Create your feature branch**
3. **Make your changes**
4. **Write/update tests**
5. **Update documentation**
6. **Ensure all tests pass**
7. **Submit PR with description**

### PR Requirements

- All tests must pass
- Code must be typed (TypeScript)
- Documentation updated if needed
- No console.logs in production code
- Follow existing code style

### Review Process

- At least one approval required
- CI/CD must pass
- Code review feedback addressed

---

## Database Schema

### Key Models

**User:**
- id, email, passwordHash
- elo, emailVerified
- verificationToken

**Game:**
- id, whiteId, blackId
- status, winnerId
- isRated, roomCode

**Move:**
- id, gameId, playerId
- fromRow, fromCol, toRow, toCol
- timestamp

**CustomBoard:**
- id, userId, name
- boardData (JSON)

**Friendship:**
- id, senderId, receiverId
- status (PENDING/ACCEPTED)

See `backend/prisma/schema.prisma` for full schema.

---

## API Development

### Adding a New Endpoint

1. **Create route handler:**
   ```typescript
   // backend/src/routes/myroute.ts
   router.post('/myendpoint', authenticateToken, async (req, res, next) => {
     // Handler logic
   });
   ```

2. **Register route:**
   ```typescript
   // backend/src/server.ts
   app.use('/api/myroute', myRoute);
   ```

3. **Write tests:**
   ```typescript
   // backend/src/routes/myroute.test.ts
   describe('POST /api/myroute/myendpoint', () => {
     // Tests
   });
   ```

4. **Update API docs:**
   - Update `docs/API.md`

### Adding Socket.IO Events

1. **Add event handler:**
   ```typescript
   // backend/src/socket.ts
   socket.on('myEvent', async (data) => {
     // Handler logic
     socket.emit('myResponse', result);
   });
   ```

2. **Update frontend:**
   ```typescript
   // frontend/src/contexts/SocketContext.tsx
   socket.emit('myEvent', data);
   socket.on('myResponse', (result) => {
     // Handle response
   });
   ```

3. **Update API docs:**
   - Update `docs/API.md`

---

## Debugging

### Backend Debugging

**Enable debug logging:**
```typescript
// Set NODE_ENV=development
// Logs will be more verbose
```

**Use logger:**
```typescript
import { logger } from './utils/logger';

logger.info('Debug message', { context });
logger.error('Error message', error);
```

**Sentry:**
- Errors automatically sent to Sentry (if configured)
- Check Sentry dashboard for error tracking

### Frontend Debugging

**React DevTools:**
- Install React DevTools browser extension
- Inspect component state and props

**Socket.IO Debugging:**
```typescript
// Enable Socket.IO debug logs
localStorage.debug = 'socket.io-client:*';
```

**Browser Console:**
- Check for errors
- Inspect network requests
- View WebSocket messages

---

## Performance Optimization

### Backend

- **Database queries**: Use Prisma select to limit fields
- **Game state**: Keep in memory, persist periodically
- **Socket.IO**: Use rooms for efficient broadcasting
- **Caching**: Consider Redis for matchmaking queue (future)

### Frontend

- **React optimization**: Use React.memo, useMemo, useCallback
- **State management**: Minimize re-renders
- **Bundle size**: Code splitting, lazy loading
- **Images**: Optimize assets

---

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Common Issues

### Database Connection

**Issue:** Cannot connect to database
**Solution:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check firewall/network settings

### Socket.IO Connection

**Issue:** Socket.IO not connecting
**Solution:**
- Check CORS settings
- Verify JWT token
- Check network/firewall

### Prisma Migrations

**Issue:** Migration errors
**Solution:**
```bash
# Reset database (development only)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev
```

---

## Resources

- [API Documentation](./API.md)
- [Component Documentation](./COMPONENTS.md)
- [User Guide](./USER_GUIDE.md)
- [Testing Guide](../TESTING.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

## Questions?

- Check existing documentation
- Review code comments
- Open an issue on GitHub
- Contact maintainers

Happy coding! 🚀

