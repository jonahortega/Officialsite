#!/bin/bash

echo "🚀 Starting Greek Life App Redesign..."
echo "📍 Location: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clear any cached files
echo "🧹 Clearing cache..."
rm -rf node_modules/.cache
rm -rf build

# Start the backend server in background
echo "🌐 Starting backend server on port 3003..."
npm run server &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the React development server on port 3002
echo "⚛️  Starting React app on port 3002..."
PORT=3002 npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Greek Life App Redesign is now running!"
echo "   Frontend: http://localhost:3002"
echo "   Backend:  http://localhost:3003"
echo "   Dashboard: http://localhost:3003/dashboard"
echo "   API Health: http://localhost:3003/api/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user to stop
wait $FRONTEND_PID $BACKEND_PID

# Cleanup on exit
echo "🛑 Stopping servers..."
kill $FRONTEND_PID 2>/dev/null
kill $BACKEND_PID 2>/dev/null 