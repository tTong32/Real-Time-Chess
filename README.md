# Real-Time Chess

A real-time strategy chess game where players can move pieces simultaneously with cooldowns and energy management.

## Project Structure

```
Real-Time-Chess/
├── backend/          # Node.js + Express + Socket.IO backend
├── frontend/          # React + Vite frontend
├── IMPLEMENTATION_PLAN.md
├── IMPLEMENTATION_CHECKLIST.md
└── summary.md
```

## Phase 1 Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (if it exists) or create `.env` with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/realtimechess?schema=public"
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

6. Run tests:
```bash
npm test
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

## Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE realtimechess;
```

2. Update `DATABASE_URL` in `.env` with your database credentials

3. Run migrations:
```bash
cd backend
npm run prisma:migrate
```

## Testing

### Backend Tests

Run all tests:
```bash
cd backend
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Development

### Backend Development

Start development server:
```bash
cd backend
npm run dev
```

### Frontend Development

Start Vite dev server:
```bash
cd frontend
npm run dev
```

## Next Steps

See `IMPLEMENTATION_CHECKLIST.md` for the full implementation roadmap.

