#!/bin/sh
cd "$(dirname "$0")/app" || exit 1
python3 -m http.server 4176 --bind 127.0.0.1 >/tmp/kaga-final-server.log 2>&1 &
open "http://127.0.0.1:4176"
