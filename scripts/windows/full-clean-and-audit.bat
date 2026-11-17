@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title SGN - فحص شامل وتنظيف المشروع

echo ======================================================
echo    منصة SGN - فحص شامل وتنظيف المشروع
echo ======================================================
echo.

:: 1) تنظيف الملفات المؤقتة
echo [*] تنظيف السجلات والملفات المؤقتة...
del /q /f "%~dp0..\..\*-log.txt" 2>nul
del /q /f "%~dp0..\..\*-result.txt" 2>nul
del /q /f "%~dp0..\..\temp_*" 2>nul
del /q /f "%~dp0..\..\vercel-*.txt" 2>nul
del /q /f "%~dp0..\..\server.log" 2>nul
echo [OK] تم التنظيف.
echo.

:: 2) فحص TypeScript للويب
echo [*] فحص TypeScript لتطبيق الويب (src/)...
cd /d "%~dp0..\.."
call node node_modules\typescript\bin\tsc --noEmit
if %errorlevel% neq 0 (
    echo [ERROR] فشل فحص TypeScript للويب!
    pause
    exit /b %errorlevel%
)
echo [OK] TypeScript للويب سليم 100%%.
echo.

:: 3) فحص TypeScript للموبايل
echo [*] فحص TypeScript لتطبيق الموبايل (mobile/)...
cd /d "%~dp0..\..\mobile"
call node node_modules\typescript\bin\tsc --noEmit
if %errorlevel% neq 0 (
    echo [ERROR] فشل فحص TypeScript للموبايل!
    pause
    exit /b %errorlevel%
)
echo [OK] TypeScript للموبايل سليم 100%%.
echo.

:: 4) فحص قاعدة البيانات
echo [*] التحقق من سلامة قاعدة البيانات المحلية والسحابية...
cd /d "%~dp0..\.."
call node node_modules\tsx\dist\cli.mjs scripts\06-check-database.ts
echo.

echo ======================================================
echo   [SUCCESS] اكتمل الفحص الشامل للمشروع بنجاح!
echo ======================================================
echo.
pause
