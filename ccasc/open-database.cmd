@echo off
setlocal
title CCASC - Database Studio

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js / npm was not found on this PC.
  echo  Install it from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo.
  echo  .env was not found next to this script.
  echo  Keep this file inside the ccasc folder and run it again.
  echo.
  pause
  exit /b 1
)

set "DBURL="
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if /i "%%A"=="DATABASE_URL" set "DBURL=%%~B"
)

if not defined DBURL (
  echo.
  echo  DATABASE_URL was not found in .env.
  echo.
  pause
  exit /b 1
)

echo "%DBURL%" | find "?" >nul
if errorlevel 1 (
  set "DATABASE_URL=%DBURL%?connection_limit=15&pool_timeout=60&connect_timeout=30"
) else (
  set "DATABASE_URL=%DBURL%&connection_limit=15&pool_timeout=60&connect_timeout=30"
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',5555); $c.Close(); exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo.
  echo  The database browser is already running - opening it.
  echo.
  start "" "http://localhost:5555"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

echo.
echo  Starting the database browser...
echo  A second window will open with the server log.
echo  Close that window to stop it.
echo.

start "CCASC Database Studio" cmd /k "npx prisma studio --port 5555"

powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 90;$i++){ try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',5555); $c.Close(); Start-Process 'http://localhost:5555'; exit 0 } catch { Start-Sleep -Milliseconds 1000 } }; exit 1"

if errorlevel 1 (
  echo.
  echo  The database browser did not start within 90 seconds.
  echo  Check the other window for the error message.
  echo.
  pause
  exit /b 1
)

echo.
echo  Opened http://localhost:5555 in your browser.
echo  Press any key to close this window (the database browser keeps running).
echo.
pause >nul
exit /b 0
