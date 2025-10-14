@echo off
echo Starting POS Retail System...
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo .env file created with default settings
    echo.
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if database exists
if not exist "database.db" (
    echo Initializing database...
    npm run init-db
    echo.
)

echo Starting the application...
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:3001
echo.
echo Default login credentials:
echo Username: admin
echo Password: admin123
echo.
echo Press Ctrl+C to stop the application
echo.

npm run dev
