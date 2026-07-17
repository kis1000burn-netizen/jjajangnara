$ErrorActionPreference = "Stop"

Write-Host "짜장나라 포스 프린터 브리지 설치" -ForegroundColor Cyan
Write-Host "Windows에 등록된 프린터 목록:" -ForegroundColor Yellow
Get-Printer | Select-Object -ExpandProperty Name | ForEach-Object { Write-Host " - $_" }

$siteUrl = Read-Host "Netlify 사이트 주소 (예: https://짜장나라.com)"
$apiToken = Read-Host "Netlify POS_API_TOKEN 값"
$counterPrinter = Read-Host "카운터 프린터 이름 (위 목록과 정확히 일치)"
$kitchenPrinter = Read-Host "주방 프린터 이름 (위 목록과 정확히 일치)"
$pollInput = Read-Host "주문 확인 간격(초, 기본 4)"
$pollSeconds = if ($pollInput -match "^\d+$") { [Math]::Max(2, [int]$pollInput) } else { 4 }

$config = [ordered]@{
  siteUrl = $siteUrl.TrimEnd("/")
  apiToken = $apiToken
  counterPrinter = $counterPrinter
  kitchenPrinter = $kitchenPrinter
  pollSeconds = $pollSeconds
}
$configPath = Join-Path $PSScriptRoot "config.json"
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8

$startupFolder = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupFolder "짜장나라-프린터브리지.cmd"
$bridgePath = Join-Path $PSScriptRoot "bridge.ps1"
$launcher = @"
@echo off
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$bridgePath"
"@
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding ASCII

$desktop = [Environment]::GetFolderPath("Desktop")
$posShortcut = Join-Path $desktop "짜장나라 주문진행판.url"
$posUrl = "$($siteUrl.TrimEnd('/'))/pos.html"
@"
[InternetShortcut]
URL=$posUrl
IconFile=%SystemRoot%\System32\SHELL32.dll
IconIndex=14
"@ | Set-Content -LiteralPath $posShortcut -Encoding ASCII

Write-Host ""
Write-Host "설치 완료" -ForegroundColor Green
Write-Host "1. Windows 시작프로그램에 프린터 브리지를 등록했습니다."
Write-Host "2. 바탕화면에 '짜장나라 주문진행판' 바로가기를 만들었습니다."
Write-Host "3. 지금 브리지를 시작합니다."
Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$bridgePath`""
Start-Process $posUrl
