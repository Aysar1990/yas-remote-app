@echo off
title YAS Remote Pro - PC Server
cd /d "%~dp0"
echo Starting YAS Remote Server...
python yas-server-relay.py
pause
