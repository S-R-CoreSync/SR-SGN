@echo off
chcp 65001 > nul
setlocal
title SGN - إعادة تشغيل خادم التطوير
cd /d "%~dp0"
set "ROOT=%cd%"

echo إيقاف أي عملية على المنفذ 3000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo تشغيل الخادم من جديد على المنفذ 3000...
start "SGN Dev Server" cmd /k "cd /d ""%ROOT%"" && set NEXTAUTH_URL=http://localhost:3000 && node ""node_modules\next\dist\bin\next"" dev -p 3000 --webpack"
echo.
echo تم! افتح: http://localhost:3000
pause
