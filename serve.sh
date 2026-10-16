#!/usr/bin/env bash
# Launch Numble Jumble on a local static server.
# Usage: ./serve.sh   then open http://localhost:8000
cd "$(dirname "$0")" || exit 1
PORT="${1:-8000}"
echo "Numble Jumble running at http://localhost:$PORT"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
