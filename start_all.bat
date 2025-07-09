@echo off
echo Starting P2P Data Lake System...

REM Start backend peers in separate windows  
echo Starting Peer 1 on port 8011...
start "Peer 1" cmd /c "cd backend && python main.py 8011"

timeout /t 2 /nobreak >nul

echo Starting Peer 2 on port 8012...
start "Peer 2" cmd /c "cd backend && set DATA_DIR=data_peer2 && python main.py 8012"

timeout /t 2 /nobreak >nul

echo Starting Peer 3 on port 8013...
start "Peer 3" cmd /c "cd backend && set DATA_DIR=data_peer3 && python main.py 8013"

timeout /t 5 /nobreak >nul

echo Starting frontend on port 3000...
start "Frontend" cmd /c "cd frontend && npm start"

echo.
echo System started! 
echo Open http://localhost:3000 in your browser
echo.
echo Press any key to exit this script (services will continue running)
pause >nul
