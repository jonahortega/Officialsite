#!/bin/bash

# Greek Life Connect Website Startup Script

echo "🚀 Starting Greek Life Connect Website..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before continuing."
    echo "   Key settings to update:"
    echo "   - MONGODB_URI: Your MongoDB connection string"
    echo "   - API_KEY: Your secret API key"
    echo "   - CORS_ORIGIN: Your app's URL (if different from default)"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build CSS
echo "🎨 Building CSS..."
npm run build

# Start the server
echo "🌐 Starting server..."
echo "📍 Website will be available at: http://localhost:3001"
echo "📍 Admin dashboard at: http://localhost:3001/dashboard"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev 