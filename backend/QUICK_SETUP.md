# Quick Test Setup Guide

## Current Status
✅ Prisma client generated
✅ .env file created
❌ Database connection needed

## Choose Your Database Option

### Option 1: Cloud PostgreSQL (Easiest - Recommended) ⭐

**Best for:** Quick setup, no local installation needed

#### Using Supabase (Free):
1. Go to https://supabase.com
2. Sign up (free account)
3. Click "New Project"
4. Fill in:
   - Name: `realtime-chess`
   - Database Password: (save this!)
   - Region: Choose closest
5. Wait for project to be created (~2 minutes)
6. Go to **Settings** → **Database**
7. Copy the **Connection string** (URI format)
8. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
   ```
   Replace `[YOUR-PASSWORD]` with the password you set

#### Using Neon (Free):
1. Go to https://neon.tech
2. Sign up (free account)
3. Create new project
4. Copy connection string
5. Update `backend/.env` with the connection string

### Option 2: Local PostgreSQL

**Best for:** Development, offline work

1. **Install PostgreSQL:**
   - Download: https://www.postgresql.org/download/windows/
   - Or use: `winget install PostgreSQL.PostgreSQL` (Windows 11)
   - Or use: `choco install postgresql` (if you have Chocolatey)

2. **During installation:**
   - Remember the password you set for `postgres` user
   - Default port: 5432

3. **Create database:**
   - Open pgAdmin or psql
   - Run: `CREATE DATABASE realtimechess;`

4. **Update `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/realtimechess?schema=public"
   ```

## Next Steps (After Database is Set Up)

1. **Run migrations:**
   ```bash
   cd backend
   npm run prisma:migrate
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

## Need Help?

- Check `SETUP_TESTS.md` for detailed instructions
- Verify your connection string format
- Make sure database is accessible (firewall, network)

