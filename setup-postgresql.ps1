# Hi Secure Solutions - PostgreSQL Setup Script (PowerShell)
# Run this in PowerShell as Administrator if needed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Hi Secure Solutions - PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if database exists
Write-Host "Checking if database 'hisecure_erp' exists..." -ForegroundColor Yellow
$dbCheck = psql -U postgres -lqt 2>$null | Select-String "hisecure_erp"
if (-not $dbCheck) {
    Write-Host "Database not found. Creating database..." -ForegroundColor Yellow
    createdb hisecure_erp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create database. Make sure PostgreSQL is running and you have permissions." -ForegroundColor Red
        pause
        exit 1
    }
    Write-Host "Database created successfully." -ForegroundColor Green
} else {
    Write-Host "Database already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "Running database schema..." -ForegroundColor Yellow
psql -U postgres -d hisecure_erp -f setup-database.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to run schema. Check if schema file exists and is valid." -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Schema executed successfully." -ForegroundColor Green

Write-Host ""
Write-Host "Verifying settings table..." -ForegroundColor Yellow
$result = psql -U postgres -d hisecure_erp -c "SELECT COUNT(*) FROM settings;" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: settings table not found. Schema may have failed." -ForegroundColor Red
    pause
    exit 1
} else {
    Write-Host "Settings table verified." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update erp-app\.env with your DB credentials if needed"
Write-Host "2. Run: node server.js"
Write-Host "3. Open: http://localhost:3000"
Write-Host "4. Login: admin / admin123"
Write-Host ""
pause
