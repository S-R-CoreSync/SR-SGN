@echo off
chcp 65001 > nul
setlocal
title SGN - نشر على Vercel
cd /d "%~dp0..\.."

echo ==============================================
echo   نشر SGN على Vercel والرفع إلى GitHub
echo ==============================================
echo.

if "%~1"=="" (
    set "MSG=chore: تحديثات المشروع"
) else (
    set "MSG=%~1"
)

echo [1/3] إضافة ورفع التعديلات...
git add -A
git commit -m "%MSG%"
git push origin main
if %errorlevel% neq 0 (
    echo [!] فشل الرفع. تحقق من حالة المستودع أولاً.
    pause
    exit /b 1
)

echo.
echo [2/3] النشر على Vercel...
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] أداة Vercel غير مثبتة. نفّذ: npm i -g vercel
    pause
    exit /b 1
)
call vercel --prod --yes

echo.
echo [3/3] تم! رابط الزبون: https://sgn-drab.vercel.app
pause
