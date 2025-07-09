#!/bin/bash

# Start Peer 2 (port 8002)
echo "Starting Peer 2 on port 8002..."
cd "$(dirname "$0")"
rm -rf data
mkdir -p data
cp peer2_data/* data/
python main.py 8002
