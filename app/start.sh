#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Backend
if ! [ -d backend/node_modules ]; then
  echo "Installing backend dependencies..."
  (cd backend && npm install)
fi
echo "Starting backend on http://localhost:3000"
(cd backend && node server.js) &
BACKEND_PID=$!

# Frontend
if ! [ -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi
echo "Starting frontend on http://localhost:5174"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "GridSpeak (Option 3) is running."
echo "  Frontend: http://localhost:5174"
echo "  Backend:  http://localhost:3000"
echo "Press Ctrl+C to stop."
wait
