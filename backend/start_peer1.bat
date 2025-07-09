@echo off
echo Starting Peer 1 on port 8011...
cd /d "%~dp0"
if not exist data mkdir data
copy "data\*" . 2>nul
set DATA_DIR=data
python main.py 8011
pause
