@echo off
echo =====================================
echo P2P Data Lake - Complete Deployment
echo =====================================
echo.

echo Setting up data directories...
cd backend

REM Create peer data directories
if not exist data_peer2 (
    echo Creating data_peer2 directory...
    xcopy peer2_data data_peer2 /E /I /Y >nul
)

if not exist data_peer3 (
    echo Creating data_peer3 directory...
    xcopy peer3_data data_peer3 /E /I /Y >nul
)

echo.
echo =====================================
echo Starting All Services
echo =====================================
echo.

echo [1/4] Starting Peer 1 (Employee & Product Data)...
start "P2P Data Lake - Peer 1" cmd /c "cd /d "%CD%" && python main.py 8011"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Peer 2 (Orders & Customer Data)...
start "P2P Data Lake - Peer 2" cmd /c "cd /d "%CD%" && set DATA_DIR=data_peer2 && python main.py 8012"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Peer 3 (Transactions & Reviews Data)...
start "P2P Data Lake - Peer 3" cmd /c "cd /d "%CD%" && set DATA_DIR=data_peer3 && python main.py 8013"
timeout /t 3 /nobreak >nul

echo [4/4] Starting React Frontend...
cd ..\frontend
start "P2P Data Lake - Frontend" cmd /c "cd /d "%CD%" && npm start"

echo.
echo =====================================
echo Deployment Complete!
echo =====================================
echo.
echo System Components:
echo   ^> Peer 1: http://localhost:8011 (Employees, Products)
echo   ^> Peer 2: http://localhost:8012 (Orders, Customers)  
echo   ^> Peer 3: http://localhost:8013 (Transactions, Reviews)
echo   ^> Frontend: http://localhost:3000
echo.
echo The dashboard will open automatically in your browser.
echo You can now execute distributed SQL queries across all peers!
echo.
echo Press any key to open the dashboard...
pause >nul

start http://localhost:3000
