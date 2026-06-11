@echo off
echo ========================================
echo ERP Production Server Diagnostic
echo ========================================

echo [1/5] Checking Node.js...
node --version || (echo Node.js not found! && pause && exit /b 1)

echo [2/5] Checking npm...
npm --version || (echo npm not found! && pause && exit /b 1)

echo [3/5] Checking dependencies...
if not exist "node_modules" (
    echo Dependencies not installed. Running npm install...
    call npm install
)

echo [4/5] Checking .env file...
if not exist ".env" (
    echo WARNING: .env file missing!
    echo Creating basic .env file...
    echo DB_HOST=localhost> .env
    echo DB_PORT=5432>> .env
    echo DB_NAME=hisecure_erp>> .env
    echo DB_USER=postgres>> .env
    echo DB_PASSWORD=postgres>> .env
    echo SESSION_SECRET=dev_secret_change_this>> .env
    echo PORT=3000>> .env
    echo .env created. Please edit with your actual DB password.
)

echo [5/5] Checking PostgreSQL connection...
psql -U postgres -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to PostgreSQL.
    echo Make sure PostgreSQL is running and you have a password set.
    echo Try: net start postgresql (if service exists)
    pause
    exit /b 1
)

echo [6/7] Checking database 'hisecure_erp' exists...
psql -U postgres -l | findstr hisecure_erp >nul
if errorlevel 1 (
    echo Database 'hisecure_erp' not found. Creating...
    createdb -U postgres hisecure_erp || (
        echo Failed to create database. Check PostgreSQL permissions.
        pause
        exit /b 1
    )
)

echo [7/7] Checking if tables exist...
psql -U postgres -d hisecure_erp -c "SELECT 1 FROM settings LIMIT 1;" >nul 2>&1
if errorlevel 1 (
    echo Tables not initialized.
    echo Please run: psql -U postgres -d hisecure_erp -f setup-database.sql
    echo Or double-click 'setup-database.sql' in pgAdmin to execute.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting production server...
echo ========================================
call npm run start
