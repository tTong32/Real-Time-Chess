# Test database connection script
# This will help verify your DATABASE_URL is correct

Write-Host "Testing Database Connection..." -ForegroundColor Cyan
Write-Host ""

# Load .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Run .\create-env.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Read DATABASE_URL from .env
$envContent = Get-Content $envFile
$databaseUrl = ($envContent | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL="?(.*?)"?$', '$1'

if (-not $databaseUrl) {
    Write-Host "ERROR: DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "Found DATABASE_URL" -ForegroundColor Green
Write-Host ""

# Try to connect using Prisma
Write-Host "Attempting to connect..." -ForegroundColor Yellow

$testScript = @"
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Connection successful!');
    return prisma.\$disconnect();
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  });
"@

$testScript | Out-File -FilePath "$env:TEMP\test-db-connection.ts" -Encoding utf8

try {
    cd $PSScriptRoot
    npx tsx "$env:TEMP\test-db-connection.ts"
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Database connection successful!" -ForegroundColor Green
        Write-Host "You can now run: npm run prisma:migrate" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Connection failed. Check your DATABASE_URL in .env" -ForegroundColor Red
        Write-Host "Common issues:" -ForegroundColor Yellow
        Write-Host "  - Database server not running" -ForegroundColor Yellow
        Write-Host "  - Wrong username/password" -ForegroundColor Yellow
        Write-Host "  - Database doesn't exist" -ForegroundColor Yellow
        Write-Host "  - Firewall blocking connection" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running test: $_" -ForegroundColor Red
} finally {
    Remove-Item "$env:TEMP\test-db-connection.ts" -ErrorAction SilentlyContinue
}

