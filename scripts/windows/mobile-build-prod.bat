@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title SGN - بناء تطبيق الموبايل ونشره

cd /d "%~dp0..\..\mobile"
set "MOBILE_DIR=%cd%"
set "ROOT=%cd%\.."

echo =======================================================
echo        بناء تطبيق الموبايل ونشره (SGN)
echo =======================================================
echo.

:: 1) ضبط بيئة الإنتاج
echo [1/3] ضبط بيئة الإنتاج (Production Environment)...
node "%ROOT%\node_modules\tsx\dist\cli.mjs" scripts\set-env.ts prod
if %errorlevel% neq 0 (
    echo [!] خطأ: تعذّر ضبط بيئة الإنتاج. تحقق من mobile\constants\config.ts
    pause
    exit /b 1
)
echo   [OK] تم ضبط روابط الـ API على: https://sgn-drab.vercel.app
echo.

:: 2) اختيار المنصة
echo [2/3] اختر منصة البناء:
echo   1. أندرويد (Android APK/Bundle)
echo   2. آيفون (iOS IPA)
echo   3. ويب الموبايل (Mobile Web)
echo.
set /p platform_choice="أدخل رقم الخيار (1-3): "

if "%platform_choice%"=="1" (
    echo جاري بناء حزمة أندرويد عبر EAS...
    call npx eas-cli build --platform android
) else if "%platform_choice%"=="2" (
    echo جاري بناء حزمة آيفون عبر EAS...
    call npx eas-cli build --platform ios
) else if "%platform_choice%"=="3" (
    echo جاري تصدير نسخة الويب...
    node node_modules\expo\bin\cli export --platform web
) else (
    echo [!] خيار غير صالح.
    pause
    exit /b 1
)
echo.

:: 3) حفظ إعدادات الإنتاج في Git
echo [3/3] حفظ إعدادات الإنتاج في المستودع...
cd /d "%ROOT%"
git add mobile/constants/config.ts
git commit -m "chore: تحديث إعدادات الموبايل لبيئة الإنتاج"
git push origin main
echo.

echo =======================================================
echo      تم تجهيز نسخة الإنتاج للموبايل بنجاح!
echo =======================================================
echo.
pause
