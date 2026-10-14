@echo off
setlocal
cd /d "%~dp0"
call "website\pdf-reducer\run_windows.bat" --toolbox
