param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "config.json")
)

$ErrorActionPreference = "Stop"
$statePath = Join-Path $PSScriptRoot "print-state.json"
$logPath = Join-Path $PSScriptRoot "bridge.log"

function Write-BridgeLog([string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "설정 파일이 없습니다: $ConfigPath (install.ps1을 먼저 실행하세요.)"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$apiUrl = "$($config.siteUrl.TrimEnd('/'))/.netlify/functions/pos-orders"
$headers = @{ Authorization = "Bearer $($config.apiToken)" }
$pollSeconds = [Math]::Max(2, [int]$config.pollSeconds)
$printed = @{}

if (Test-Path -LiteralPath $statePath) {
  try {
    $savedState = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $savedState.PSObject.Properties | ForEach-Object { $printed[$_.Name] = [string]$_.Value }
  } catch {
    Write-BridgeLog "기존 출력 상태 파일을 읽지 못했습니다: $($_.Exception.Message)"
  }
}

function Save-State {
  $printed | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Format-Won($Value) {
  return "{0:N0}원" -f [decimal]$Value
}

function New-ReceiptText($Order, [ValidateSet("counter", "kitchen")] [string]$ReceiptType) {
  $divider = "--------------------------------"
  $title = if ($ReceiptType -eq "kitchen") { "[주방 주문서]" } else { "[배달 주문서]" }
  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("          짜장나라 세종본점")
  $lines.Add("             $title")
  $lines.Add($divider)
  $lines.Add("주문번호: $($Order.orderId)")
  $lines.Add("주문시각: $([DateTime]$Order.createdAt)")
  $lines.Add($divider)

  foreach ($item in $Order.items) {
    $lines.Add("$($item.name)  $(Format-Won $item.price)")
    if ($item.detail) { $lines.Add("  > $($item.detail)") }
  }

  $lines.Add($divider)
  $lines.Add("합계: $(Format-Won $Order.total)")
  $lines.Add("수저/젓가락: $($Order.utensils)")
  $lines.Add("요청: $($Order.request)")
  if ($ReceiptType -eq "counter") {
    $lines.Add($divider)
    $lines.Add("연락처: $($Order.phone)")
    $lines.Add("주소: $($Order.address)")
  }
  $lines.Add($divider)
  $lines.Add("")
  $lines.Add("")
  return $lines -join [Environment]::NewLine
}

function Send-ToPrinter([string]$Text, [string]$PrinterName) {
  if ([string]::IsNullOrWhiteSpace($PrinterName)) {
    throw "프린터 이름이 설정되지 않았습니다."
  }
  $tempFile = Join-Path $env:TEMP "jjajangnara-receipt-$([Guid]::NewGuid().ToString('N')).txt"
  try {
    Set-Content -LiteralPath $tempFile -Value $Text -Encoding UTF8
    Get-Content -LiteralPath $tempFile -Raw -Encoding UTF8 | Out-Printer -Name $PrinterName
  } finally {
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  }
}

function Update-PrintedAt([string]$OrderId, [string]$PrintedAt) {
  $body = @{ orderId = $OrderId; printedAt = $PrintedAt } | ConvertTo-Json
  Invoke-RestMethod -Uri $apiUrl -Method Patch -Headers $headers -ContentType "application/json" -Body $body | Out-Null
}

function Send-Heartbeat {
  $body = @{
    action = "heartbeat"
    stationName = $env:COMPUTERNAME
  } | ConvertTo-Json
  Invoke-RestMethod -Uri $apiUrl -Method Patch -Headers $headers -ContentType "application/json" -Body $body | Out-Null
}

Write-BridgeLog "프린터 브리지를 시작합니다. API=$apiUrl"

while ($true) {
  try {
    Send-Heartbeat
    $result = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers $headers
    foreach ($order in $result.orders) {
      if ($order.status -in @("completed", "canceled")) { continue }
      $requestVersion = if ($order.printRequestedAt) { [string]$order.printRequestedAt } else { [string]$order.createdAt }
      if ($printed.ContainsKey([string]$order.orderId) -and $printed[[string]$order.orderId] -eq $requestVersion) {
        if (-not $order.printedAt) {
          Update-PrintedAt ([string]$order.orderId) (Get-Date).ToUniversalTime().ToString("o")
        }
        continue
      }

      Send-ToPrinter (New-ReceiptText $order "counter") ([string]$config.counterPrinter)
      Send-ToPrinter (New-ReceiptText $order "kitchen") ([string]$config.kitchenPrinter)
      $printed[[string]$order.orderId] = $requestVersion
      Save-State
      $printedAt = (Get-Date).ToUniversalTime().ToString("o")
      Update-PrintedAt ([string]$order.orderId) $printedAt
      Write-BridgeLog "출력 완료: $($order.orderId)"
    }
  } catch {
    Write-BridgeLog "처리 오류: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $pollSeconds
}
