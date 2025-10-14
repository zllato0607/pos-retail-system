#!/bin/bash

echo "Starting POS Retail System..."
echo

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ".env file created with default settings"
    echo
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo
fi

# Check if database exists
if [ ! -f "database.db" ]; then
    echo "Initializing database..."
    npm run init-db
    echo
fi

echo "Starting the application..."
echo "Frontend will be available at: http://localhost:3000"
echo "Backend API will be available at: http://localhost:3001"
echo
echo "Default login credentials:"
echo "Username: admin"
echo "Password: admin123"
echo
echo "Press Ctrl+C to stop the application"
echo

npm run dev
