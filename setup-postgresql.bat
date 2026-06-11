@echo off
echo ========================================
echo Hi Secure Solutions - PostgreSQL Setup
echo ========================================
echo.

REM Check if database exists
echo Checking if database 'hisecure_erp' exists...
psql -U postgres -lqt | findstr hisecure_erp >nul
if errorlevel 1 (
    echo Database not found. Creating database...
    createdb hisecure_erp
    if errorlevel 1 (
        echo ERROR: Failed to create database. Make sure PostgreSQL is running and you have permissions.
        pause
        exit /b 1
    )
    echo Database created successfully.
) else (
    echo Database already exists.
)

echo.
echo Running database schema...
psql -U postgres -d hisecure_erp -f setup-database.sql
if errorlevel 1 (
    echo ERROR: Failed to run schema. Check if schema file exists and is valid.
    pause
    exit /b 1
)
echo Schema executed successfully.

echo.
echo Verifying settings table...
psql -U postgres -d hisecure_erp -c "SELECT COUNT(*) FROM settings;" >nul 2>&1
if errorlevel 1 (
    echo ERROR: settings table not found. Schema may have failed.
    pause
    exit /b 1
) else (
    echo Settings table verified.
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Update erp-app\.env with your DB credentials if needed
echo 2. Run: node server.js
echo 3. Open: http://localhost:3000
echo 4. Login: admin / admin123
echo.
pause
