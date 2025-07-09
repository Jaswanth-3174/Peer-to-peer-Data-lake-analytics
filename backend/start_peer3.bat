@echo off
echo Starting Peer 3 on port 8013...
cd /d "%~dp0"
set DATA_DIR=data_peer3
python main.py 8013
pause
