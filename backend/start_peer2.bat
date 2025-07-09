@echo off
echo Starting Peer 2 on port 8012...
cd /d "%~dp0"
set DATA_DIR=data_peer2
python main.py 8012
pause
