@echo off
chcp 65001 > nul
title SGN - تشغيل الخادم المحلي
cd /d "%~dp0..\.."
echo تشغيل SGN على http://localhost:3000 ...
:: استخدام node مباشرة لأن مسار المشروع يحتوي على الرمز & الذي يكسر npm run dev
start "SGN Dev Server" cmd /k "cd /d ""%cd%"" && node ""node_modules\next\dist\bin\next"" dev -p 3000 --webpack"
timeout /t 8 > nul
start http://localhost:3000
