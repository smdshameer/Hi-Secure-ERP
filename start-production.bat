@echo off
title Hi Secure Solutions - Production Server Setup
color 0A
echo ========================================
echo   HI SECURE SOLUTIONS - START SERVER
echo ========================================
echo.

REM Check if node is available
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if PostgreSQL is available
where psql >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL (psql) is not found in PATH.
    echo.
    echo Please install PostgreSQL first:
    echo 1. Download from https://www.postgresql.org/download/windows/
    echo 2. Run installer
    echo 3. Restart your terminal after installation
    echo.
    pause
    exit /b 1
)

REM Check if PostgreSQL is running
echo Checking PostgreSQL connection...
psql -U postgres -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to PostgreSQL.
    echo Make sure PostgreSQL service is running.
    echo.
    echo To start PostgreSQL:
    echo - Open Services (services.msc)
    echo - Find "postgresql-x64-*" and Start it
    echo.
    pause
    exit /b 1
)

echo PostgreSQL is running.
echo.

REM Check if database exists
echo Checking database 'hisecure_erp'...
psql -U postgres -lqt 2>nul | findstr hisecure_erp >nul
if errorlevel 1 (
    echo Database not found. Creating database...
    createdb hisecure_erp
    if errorlevel 1 (
        echo ERROR: Failed to create database.
        pause
        exit /b 1
    )
    echo Database created.
) else (
    echo Database exists.
)

REM Run schema if settings table doesn't exist
echo Checking if settings table exists...
psql -U postgres -d hisecure_erp -c "SELECT 1 FROM settings LIMIT 1;" >nul 2>&1
if errorlevel 1 (
    echo Settings table not found. Running database schema...
    psql -U postgres -d hisecure_erp -f setup-database.sql
    if errorlevel 1 (
        echo ERROR: Failed to run schema.
        pause
        exit /b 1
    )
    echo Schema applied successfully.
) else (
    echo Settings table exists. (Schema already applied)
)

echo.
echo ========================================
echo   Starting Production Server...
echo ========================================
echo.

REM Check if server/.env file exists
if not exist "server\.env" (
    echo WARNING: server/.env file not found!
    echo Creating default server/.env file...
    echo DATABASE_URL="postgresql://postgres:changeme@localhost:5432/hisecure_erp?schema=public"> server\.env
    echo PORT=3004>> server\.env
    echo NODE_ENV=production>> server\.env
    echo CLIENT_URL=http://localhost:5174>> server\.env
    echo JWT_SECRET=hisecure-jwt-secret-change-in-production>> server\.env
    echo.
    echo IMPORTANT: Edit server/.env and set your database credentials if needed!
    echo.
    pause
)

REM Install dependencies if not present
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)
if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    call npm install
    cd ..
)
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install
    cd ..
)

REM Build application
echo Building frontend and backend...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)

REM Generate Prisma client and push schema
echo Syncing database schema with Prisma...
cd server
call npx prisma generate
call npx prisma db push
cd ..

REM Start server
echo Starting server on http://localhost:3004
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

call npm run start

pause
