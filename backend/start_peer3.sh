#!/bin/bash

# Start Peer 3 (port 8003)
echo "Starting Peer 3 on port 8003..."
cd "$(dirname "$0")"
rm -rf data
mkdir -p data
cp peer3_data/* data/
python main.py 8003
