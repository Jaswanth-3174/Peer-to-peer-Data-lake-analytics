#!/bin/bash

echo "Starting P2P Data Lake System..."

# Start backend peers
echo "Starting Peer 1 on port 8001..."
cd backend
cp -r data/* . 2>/dev/null || true
python main.py 8001 &
PEER1_PID=$!

echo "Starting Peer 2 on port 8002..."
rm -rf data_temp && mkdir -p data_temp
cp peer2_data/* data_temp/
DATA_DIR=data_temp python main.py 8002 &
PEER2_PID=$!

echo "Starting Peer 3 on port 8003..."
rm -rf data_temp2 && mkdir -p data_temp2  
cp peer3_data/* data_temp2/
DATA_DIR=data_temp2 python main.py 8003 &
PEER3_PID=$!

cd ../frontend

echo "Starting frontend on port 3000..."
npm start &
FRONTEND_PID=$!

echo ""
echo "System started! PIDs:"
echo "Peer 1: $PEER1_PID"
echo "Peer 2: $PEER2_PID" 
echo "Peer 3: $PEER3_PID"
echo "Frontend: $FRONTEND_PID"
echo ""
echo "Open http://localhost:3000 in your browser"
echo "Press Ctrl+C to stop all processes"

# Wait for interrupt
trap 'kill $PEER1_PID $PEER2_PID $PEER3_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait
