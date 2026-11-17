@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title SGN - مزامنة Git ونشر Vercel

cd /d "%~dp0..\.."
set "ROOT=%cd%"
set "REMOTE_URL=https://github.com/S-R-CoreSync/SR-SGN.git"
set "CLIENT_URL=https://sgn-drab.vercel.app"

echo =======================================================
echo   مزامنة Git التلقائية والنشر على Vercel (SGN)
echo =======================================================
echo.

:: إنشاء اختصارات سطح المكتب (اختياري، يفشل بصمت)
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); foreach ($x in @(@('Git Auto Sync.lnk','%~f0'), @('Start SGN Server.lnk','%~dp0start-server.vbs'))) { $s = $ws.CreateShortcut((Join-Path $d $x[0])); $s.TargetPath = $x[1]; $s.WorkingDirectory = '%~dp0'; $s.Save() }" 2>nul

:: 1) التأكد من المستودع الصحيح
echo [1/4] التحقق من مستودع Git...
set "CURRENT_REMOTE="
for /f "delims=" %%u in ('git remote get-url origin 2^>nul') do set "CURRENT_REMOTE=%%u"
if /i not "!CURRENT_REMOTE!"=="!REMOTE_URL!" (
    echo   - تصحيح رابط المستودع إلى S-R-CoreSync/SR-SGN ...
    git remote set-url origin "%REMOTE_URL%"
) else (
    echo   - رابط المستودع صحيح.
)

:: 2) إضافة ورفع التعديلات
echo.
echo [2/4] فحص التعديلات المحلية...
git add -A
git diff-index --quiet HEAD --
if %errorlevel% neq 0 (
    echo   - توجد تعديلات، جاري إنشاء commit...
    git commit -m "chore: مزامنة تلقائية لتحديثات المشروع"
) else (
    echo   - لا توجد تعديلات جديدة.
)

echo.
echo [3/4] سحب أحدث التغييرات من الفرع main...
git pull origin main --rebase --autostash
if %errorlevel% neq 0 (
    echo [!] فشل السحب التلقائي. جاري إلغاء rebase والمحاولة بدمج تلقائي...
    git rebase --abort 2>nul
    git pull origin main --no-rebase -X ours
)

echo.
echo [4/4] رفع التعديلات إلى GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo [!] تحذير: فشل الرفع. تحقق من الاتصال أو الصلاحيات.
    echo     لن يتم تنفيذ force push تلقائياً حفاظاً على سلامة المستودع.
    goto :deploy
)

:deploy
echo.
echo [*] نشر النسخة الإنتاجية على Vercel...
where vercel >nul 2>&1
if %errorlevel% equ 0 (
    call vercel --prod --yes
) else (
    echo   - أداة Vercel غير مثبتة، سيتم الاعتماد على النشر التلقائي من GitHub.
)

echo.
echo =======================================================
echo   تمت المزامنة بنجاح
echo   رابط الزبون: %CLIENT_URL%
echo =======================================================
echo.
timeout /t 10
