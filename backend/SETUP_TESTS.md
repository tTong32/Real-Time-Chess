# Setting Up Tests

## Step 1: Create .env File

Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```bash
cp .env.example .env
```

Or manually create `backend/.env` with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/realtimechess?schema=public"
NODE_ENV=test
```

**Update the connection string with your PostgreSQL credentials:**
- `postgres` = username (change if different)
- `postgres` = password (change to your password)
- `localhost:5432` = host and port (default PostgreSQL port)
- `realtimechess` = database name

## Step 2: Set Up PostgreSQL Database

### Option A: Local PostgreSQL

1. **Install PostgreSQL** (if not installed):
   - Windows: Download from https://www.postgresql.org/download/windows/
   - Or use: `choco install postgresql` (if you have Chocolatey)

2. **Create the database**:
   ```sql
   CREATE DATABASE realtimechess;
   ```

3. **Update .env** with your credentials

### Option B: Cloud PostgreSQL (Recommended for Testing)

Use a free cloud service:

1. **Supabase** (Free tier):
   - Go to https://supabase.com
   - Create account → New Project
   - Copy connection string from Settings → Database
   - Update `DATABASE_URL` in `.env`

2. **Neon** (Free tier):
   - Go to https://neon.tech
   - Create account → New Project
   - Copy connection string
   - Update `DATABASE_URL` in `.env`

3. **Railway** (Free tier):
   - Go to https://railway.app
   - New Project → Add PostgreSQL
   - Copy connection string
   - Update `DATABASE_URL` in `.env`

## Step 3: Run Migrations

```bash
cd backend
npm run prisma:migrate
```

This will:
- Create all tables in your database
- Set up relationships and indexes
- Create the database schema

## Step 4: Run Tests

```bash
npm test
```

All tests should pass if the database is set up correctly!

## Troubleshooting

### "Can't reach database server"
- Check if PostgreSQL is running
- Verify connection string in `.env`
- Check firewall settings

### "Database does not exist"
- Create the database: `CREATE DATABASE realtimechess;`

### "Authentication failed"
- Check username/password in `DATABASE_URL`
- Verify PostgreSQL user has permissions

### "Prisma Client not generated"
- Run: `npm run prisma:generate`

