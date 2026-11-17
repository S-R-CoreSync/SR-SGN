@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title SGN - إعادة تشغيل خادم الإنتاج المحلي (PM2)

cd /d "%~dp0..\.."
set "ROOT=%cd%"

echo ==============================================
echo   SGN - إعادة تشغيل PM2
echo ==============================================
echo.

echo [1/5] إيقاف أي عملية تستخدم المنفذ 3000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo   تم.

echo.
echo [2/5] تثبيت الاعتماديات...
call npm install
echo   تم.

echo.
echo [3/5] حذف إعدادات PM2 القديمة...
call pm2 delete all 2>nul
echo   تم.

echo.
echo [4/5] تشغيل PM2 من ecosystem.config.js...
call pm2 start "%ROOT%\ecosystem.config.js"
echo   تم.

echo.
echo [5/5] حفظ إعدادات PM2...
call pm2 save
echo   تم.

echo.
echo ==============================================
echo   تمت إعادة تشغيل PM2 بنجاح
echo   موقع الويب: http://localhost:3000
echo   مزامنة الأخبار: كل ساعة
echo ==============================================
echo.
echo [!] ملاحظة: شغّل أولاً "npm run build" إذا لم تكن نسخة الإنتاج مبنية.
pause
