@echo off
:loop
node src\Main.js
echo "something happened... restarting in 10 seconds, press Ctrl + C to cancel"
timeout /t 10 /nobreak >nul
goto loop
