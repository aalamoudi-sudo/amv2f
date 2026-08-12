#!/bin/bash
set -e

KAGA_PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
KAGA_PORT="8080"

python3 -m http.server "$KAGA_PORT" --directory "$KAGA_PACKAGE_DIR/app" >/tmp/kaga-v2-server.log 2>&1 &
KAGA_SERVER_PID=$!
trap 'kill "$KAGA_SERVER_PID" 2>/dev/null || true' EXIT INT TERM
sleep 1
open "http://127.0.0.1:$KAGA_PORT/"
wait "$KAGA_SERVER_PID"
