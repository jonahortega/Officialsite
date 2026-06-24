#!/bin/bash

echo "Starting The Greek Life App..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clear any cached files
echo "Clearing cache..."
rm -rf node_modules/.cache
rm -rf build

# Start the development server
echo "Starting development server..."
npm start 