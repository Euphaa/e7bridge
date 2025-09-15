@echo off
setlocal

if not exist "config.json" (
    echo config doesn't exist; creating...
    copy "example-config.json" "config.json" >nul
    echo file created. please input your information into config.json before starting again.
    exit /b 0
)

:loop
node --trace-exit src\Main.js
echo something happened... restarting in 10 seconds, press Ctrl + C to cancel
timeout /t 10 /nobreak >nul
goto loop
