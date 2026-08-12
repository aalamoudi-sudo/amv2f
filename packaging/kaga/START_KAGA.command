#!/bin/bash
set -e
cd "$(dirname "$0")"
python3 -m http.server 4174 --bind 127.0.0.1 --directory app &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT INT TERM
sleep 1
open "http://127.0.0.1:4174/"
wait "$server_pid"
