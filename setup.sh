#!/bin/bash

echo "=== P2P Data Lake Setup Script ==="

# Setup Backend
echo "Setting up backend..."
cd backend

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Backend setup complete!"

# Setup Frontend
echo "Setting up frontend..."
cd ../frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "Frontend setup complete!"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To start the system:"
echo "1. Start peers (in separate terminals):"
echo "   cd backend && python main.py 8001"
echo "   cd backend && python main.py 8002"  
echo "   cd backend && python main.py 8003"
echo ""
echo "2. Start frontend:"
echo "   cd frontend && npm start"
echo ""
echo "Then open http://localhost:3000 in your browser"
