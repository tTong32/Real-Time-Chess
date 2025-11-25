# PowerShell script to create .env file for testing
# Run this script: .\create-env.ps1

$envContent = @"
# Database Configuration
# Update DATABASE_URL with your PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/realtimechess?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=test
CORS_ORIGIN=http://localhost:5173

# JWT Configuration (for testing, use a simple secret)
JWT_SECRET=test-secret-key-for-development-only-change-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (not needed for tests)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
"@

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host ".env file already exists. Skipping creation." -ForegroundColor Yellow
    Write-Host "If you want to recreate it, delete the existing file first." -ForegroundColor Yellow
} else {
    $envContent | Out-File -FilePath $envPath -Encoding utf8
    Write-Host ".env file created successfully!" -ForegroundColor Green
    Write-Host "`nIMPORTANT: Update DATABASE_URL with your PostgreSQL credentials:" -ForegroundColor Yellow
    Write-Host "  - Username (default: postgres)" -ForegroundColor Yellow
    Write-Host "  - Password (your PostgreSQL password)" -ForegroundColor Yellow
    Write-Host "  - Host (default: localhost)" -ForegroundColor Yellow
    Write-Host "  - Port (default: 5432)" -ForegroundColor Yellow
    Write-Host "  - Database name (default: realtimechess)" -ForegroundColor Yellow
    Write-Host "`nOr use a cloud PostgreSQL service (see SETUP_TESTS.md)" -ForegroundColor Cyan
}

