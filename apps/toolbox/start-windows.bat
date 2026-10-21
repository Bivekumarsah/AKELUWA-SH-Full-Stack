@echo off
setlocal
cd /d "%~dp0"
call "..\..\services\pdf-engine\run_windows.bat" --toolbox
