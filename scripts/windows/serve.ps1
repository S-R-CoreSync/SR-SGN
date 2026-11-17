param(
    [int]$Port = 3000
)

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location -LiteralPath $root
$env:NODE_ENV = "production"

Write-Host "http://localhost:$Port" -ForegroundColor Green
node "node_modules/next/dist/bin/next" start -p $Port
