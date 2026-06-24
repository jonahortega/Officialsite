#!/bin/bash

echo "🚀 Starting The Greek Life App..."
echo "📍 Location: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🌐 Starting server on port 3001..."
echo ""
echo "✅ Website will be available at:"
echo "   Main site: http://localhost:3001"
echo "   Dashboard: http://localhost:3001/dashboard"
echo "   API Health: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start 