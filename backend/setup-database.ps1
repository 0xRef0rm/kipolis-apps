# KIPOLIS Database Setup Script for Windows
# Run this script to create database and enable PostGIS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KIPOLIS Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database credentials (from .env)
$DB_USER = "postgres"
$DB_NAME = "kipolis_core"

Write-Host "Creating database: $DB_NAME" -ForegroundColor Yellow

# Create database and enable PostGIS
$env:PGPASSWORD = "postgres"

# Check if database exists
$checkDb = psql -U $DB_USER -lqt | Select-String -Pattern $DB_NAME
if ($checkDb) {
    Write-Host "Database '$DB_NAME' already exists!" -ForegroundColor Green
} else {
    Write-Host "Creating database '$DB_NAME'..." -ForegroundColor Yellow
    psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database" -ForegroundColor Red
        exit 1
    }
}

# Enable PostGIS extension
Write-Host ""
Write-Host "Enabling PostGIS extension..." -ForegroundColor Yellow
psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostGIS extension enabled!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to enable PostGIS" -ForegroundColor Red
    exit 1
}

# Verify PostGIS
Write-Host ""
Write-Host "Verifying PostGIS installation..." -ForegroundColor Yellow
$version = psql -U $DB_USER -d $DB_NAME -t -c "SELECT PostGIS_Version();"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostGIS Version: $version" -ForegroundColor Green
} else {
    Write-Host "⚠ PostGIS verification failed (may not be installed)" -ForegroundColor Yellow
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Database setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Check: http://localhost:3000/health" -ForegroundColor White
Write-Host ""
