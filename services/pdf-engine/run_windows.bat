@echo off
setlocal
cd /d "%~dp0"
echo PDF Size Reducer - Setup and launch
where py >nul 2>nul
if not errorlevel 1 goto :use_py
where python >nul 2>nul
if errorlevel 1 goto :python_missing
set "PDF_REDUCER_PYTHON=python"
goto :setup
:use_py
set "PDF_REDUCER_PYTHON=py"
:setup
%PDF_REDUCER_PYTHON% bootstrap.py
if errorlevel 1 goto :error
".venv\Scripts\python.exe" launch.py %*
if errorlevel 1 goto :error
exit /b 0
:python_missing
echo Python was not found. Install Python 3.10 or newer and enable Add Python to PATH.
pause
exit /b 1
:error
echo Setup or launch failed. Read the message above for details.
pause
exit /b 1
