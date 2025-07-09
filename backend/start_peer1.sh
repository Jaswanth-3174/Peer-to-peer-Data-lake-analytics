#!/bin/bash

# Start Peer 1 (port 8001)
echo "Starting Peer 1 on port 8001..."
cd "$(dirname "$0")"
cp -r data/* . 2>/dev/null || true
python main.py 8001
