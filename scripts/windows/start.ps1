Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "تشغيل الخادم على http://localhost:3000 ..." -ForegroundColor Green
Start-Process "http://localhost:3000"
node "node_modules/next/dist/bin/next" dev -p 3000 --webpack
Read-Host "اضغط Enter للخروج"
