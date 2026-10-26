# Dhun Music App PowerShell Launcher
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\nodejs"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Starting Dhun - Ad-Free Indian Music App" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:5000"
& "C:\Program Files\nodejs\node.exe" server.js
