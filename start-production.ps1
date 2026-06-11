# Hi Secure Solutions - Production Server Setup (PowerShell)
# Run this script in PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HI SECURE SOLUTIONS - START SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Install Node.js from https://nodejs.org/"
    pause
    exit 1
}
Write-Host "Node.js found." -ForegroundColor Green

# Check if PostgreSQL is installed
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$psqlCheck = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCheck) {
    Write-Host "ERROR: PostgreSQL (psql) is not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL first:"
    Write-Host "1. Download from https://www.postgresql.org/download/windows/"
    Write-Host "2. Run installer"
    Write-Host "3. Restart your terminal after installation"
    Write-Host ""
    pause
    exit 1
}

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $test = psql -U postgres -c "SELECT 1;" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not running"
    }
} catch {
    Write-Host "ERROR: Cannot connect to PostgreSQL." -ForegroundColor Red
    Write-Host "Make sure PostgreSQL service is running."
    Write-Host ""
    Write-Host "To start PostgreSQL:"
    Write-Host "- Open Services (services.msc)"
    Write-Host "- Find 'postgresql-x64-*' and Start it"
    Write-Host ""
    pause
    exit 1
}
Write-Host "PostgreSQL is running." -ForegroundColor Green
Write-Host ""

# Check if database exists
Write-Host "Checking database 'hisecure_erp'..." -ForegroundColor Yellow
$dbExists = psql -U postgres -lqt 2>$null | Select-String "hisecure_erp"
if (-not $dbExists) {
    Write-Host "Database not found. Creating database..." -ForegroundColor Yellow
    createdb hisecure_erp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create database." -ForegroundColor Red
        pause
        exit 1
    }
    Write-Host "Database created successfully." -ForegroundColor Green
} else {
    Write-Host "Database exists." -ForegroundColor Green
}

# Check if settings table exists
Write-Host "Checking if settings table exists..." -ForegroundColor Yellow
$settingsCheck = psql -U postgres -d hisecure_erp -c "SELECT 1 FROM settings LIMIT 1;" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Settings table not found. Running database schema..." -ForegroundColor Yellow
    psql -U postgres -d hisecure_erp -f setup-database.sql
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to run schema." -ForegroundColor Red
        pause
        exit 1
    }
    Write-Host "Schema applied successfully." -ForegroundColor Green
} else {
    Write-Host "Settings table exists. (Schema already applied)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Starting Production Server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if server/.env file exists
if (-not (Test-Path "server\.env")) {
    Write-Host "WARNING: server/.env file not found!" -ForegroundColor Yellow
    Write-Host "Creating default server/.env file..."
    @"
DATABASE_URL="postgresql://postgres:changeme@localhost:5432/hisecure_erp?schema=public"
PORT=3004
NODE_ENV=production
CLIENT_URL=http://localhost:5174
JWT_SECRET=hisecure-jwt-secret-change-in-production
"@ | Out-File -FilePath "server\.env" -Encoding UTF8
    Write-Host ""
    Write-Host "IMPORTANT: Edit server/.env and set your database credentials if needed!" -ForegroundColor Yellow
    Write-Host ""
    pause
}

# Install dependencies if not present
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    npm install
}
if (-not (Test-Path "client\node_modules")) {
    Write-Host "Installing client dependencies..." -ForegroundColor Yellow
    cd client
    npm install
    cd ..
}
if (-not (Test-Path "server\node_modules")) {
    Write-Host "Installing server dependencies..." -ForegroundColor Yellow
    cd server
    npm install
    cd ..
}

# Build application
Write-Host "Building frontend and backend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    pause
    exit 1
}

# Generate Prisma client and push schema
Write-Host "Syncing database schema with Prisma..." -ForegroundColor Yellow
cd server
npx prisma generate
npx prisma db push
cd ..

# Start server
Write-Host "Starting server on http://localhost:3004" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server"
Write-Host "========================================"
Write-Host ""

npm run start

pause
