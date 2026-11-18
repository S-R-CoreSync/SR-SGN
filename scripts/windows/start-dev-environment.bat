@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title SGN - بيئة التطوير المحلية

cd /d "%~dp0..\.."
set "ROOT=%cd%"

echo ========================================================
echo   تشغيل بيئة تطوير SGN المحلية
echo   Local Development Environment
echo ========================================================
echo.

:: ملاحظة مهمة:
:: مسار المشروع يحتوي على الرمز & لذلك لا نستخدم "npm run dev" مباشرة،
:: بل نشغّل Next.js عبر node مع مسار مُقتبس بشكل صحيح.
echo [1/2] تشغيل خادم الويب على المنفذ 3000...
start "SGN Web Dev Server" cmd /k "cd /d ""%ROOT%"" && node ""node_modules\next\dist\bin\next"" dev -p 3000 --webpack"

echo [2/2] تشغيل خادم Expo للموبايل...
start "SGN Mobile Expo Server" cmd /k "cd /d ""%ROOT%\mobile"" && npx expo start"

echo.
echo ========================================================
echo   تم تشغيل الخوادم في نوافذ منفصلة.
echo   الموقع المحلي: http://localhost:3000
echo ========================================================
echo.

timeout /t 6 > nul
:: تسخين المسارات في الخلفية حتى لا يبدو الموقع معلّقاً عند أول نقرة
start "SGN Warm-up" /min cmd /c "cd /d ""%ROOT%"" && node scripts\23-warmup-dev.cjs"
start http://localhost:3000

exit /b 0
