#!/usr/bin/env bash
# Start GridSpeak: backend node + frontend dev server.
# Backend: http://127.0.0.1:7070  |  Frontend: http://localhost:5173

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Ensure frontend deps
if [[ ! -d frontend/node_modules ]]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

# Build backend once so startup is fast and health check can succeed
echo "Building backend..."
(cd backend && cargo build -p gridspeak-node -q)

# Start backend in background (node keeps running when stdin is closed)
echo "Starting backend node (API at http://127.0.0.1:7070)..."
(cd backend && ./target/debug/gridspeak-node run) </dev/null >>/tmp/gridspeak-node.log 2>&1 &
BACKEND_PID=$!

cleanup() {
  kill $BACKEND_PID 2>/dev/null || true
  exit
}
trap cleanup INT TERM

# Wait for API to be up
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:7070/health 2>/dev/null | grep -q 200; then
    echo "Backend ready."
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend exited. Check /tmp/gridspeak-node.log"
    exit 1
  fi
  sleep 0.5
done

# Start frontend (foreground; Ctrl+C stops both)
echo "Starting frontend (http://localhost:5173)..."
(cd frontend && npm run dev)
cleanup
