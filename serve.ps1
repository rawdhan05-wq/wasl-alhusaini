param(
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-LocalListener([int]$p) {
  foreach ($prefix in @("http://+:$p/", "http://localhost:$p/")) {
    try {
      $l = New-Object System.Net.HttpListener
      $l.Prefixes.Add($prefix)
      $l.Start()
      return @{ Listener = $l; Prefix = $prefix }
    }
    catch { }
  }
  return $null
}

$result = Start-LocalListener $Port
if (-not $result) {
  Write-Host "Could not start the local server on port $Port."
  Write-Host "Try another port or run as administrator."
  Read-Host "Press Enter to close"
  exit 1
}

$listener = $result.Listener
$lanAccess = $result.Prefix -like 'http://+:*'
$lan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host ""
Write-Host "  Wasl Al-Husaini - local server is running"
Write-Host "  On this computer:  http://localhost:$Port/"
if ($lanAccess -and $lan) {
  Write-Host "  On your phone:     http://${lan}:$Port/   (same Wi-Fi network)"
}
else {
  Write-Host "  Phone access: close this window, right-click start-server.bat,"
  Write-Host "  choose 'Run as administrator', then open http://$lan`:$Port/ on your phone."
}
Write-Host ""
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

$mime = @{
  '.html'        = 'text/html; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.js'          = 'text/javascript; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.jpg'         = 'image/jpeg'
  '.jpeg'        = 'image/jpeg'
  '.webp'        = 'image/webp'
  '.ttf'         = 'font/ttf'
  '.woff2'       = 'font/woff2'
  '.ico'         = 'image/x-icon'
  '.txt'         = 'text/plain; charset=utf-8'
  '.md'          = 'text/markdown; charset=utf-8'
}

$rootFull = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $Root $path))
    if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
      $ctx.Response.StatusCode = 403
    }
    elseif (Test-Path -LiteralPath $full -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
      $bytes = [IO.File]::ReadAllBytes($full)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  }
  catch {
    Write-Host ("Error: " + $_.Exception.Message)
  }
}
