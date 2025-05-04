# replace-api-paths.ps1
param()

# 1) locate src/app.ts
$appPath = Join-Path (Get-Location) "src\app.ts"
if (-not (Test-Path $appPath)) {
  Write-Error "❌ Could not find src\app.ts at $appPath"
  exit 1
}

# 2) read all your mounted /api routes from app.ts
$mounts = Select-String -Path $appPath -Pattern 'app\.use\("/api/([^"\/]+)' |
  ForEach-Object { "/api/$($_.Matches[0].Groups[1].Value)" } |
  Sort-Object -Unique

if ($mounts.Count -eq 0) {
  Write-Error "❌ No app.use(\"/api/…\") lines found in src/app.ts"
  exit 1
}

# build a map of singular→full‑path
$routeMap = @{}
foreach ($m in $mounts) {
  $seg = Split-Path $m -Leaf
  $routeMap[$seg.ToLower()] = $m
}

Write-Host "🚀 Discovered API mounts:"
$routeMap.GetEnumerator() | ForEach-Object { Write-Host " • $($_.Name) → $($_.Value)" }

# 3) patch every test under src\test
Get-ChildItem -Path ".\src\test" -Filter '*.test.ts' -Recurse |
ForEach-Object {
  $file = $_.FullName
  $text = Get-Content $file -Raw
  $patched = $false

  foreach ($key in $routeMap.Keys) {
    # look for "/api/<key>" (case‑insensitive)
    $pattern = "/api/$key(\b)"
    $replacement = $routeMap[$key] + '$1'
    $newText = [regex]::Replace($text, $pattern, $replacement, 'IgnoreCase')
    if ($newText -ne $text) {
      $patched = $true
      $text = $newText
    }
  }

  if ($patched) {
    Set-Content -Path $file -Value $text
    Write-Host "✅ Patched $($_.Name)"
  }
}

Write-Host " Done! All your tests now point at the real routes in app.ts"
