# src/scripts/fix-test-paths.ps1
param()

# ── Determine project root by going two levels up from THIS script file ──
# (PSScriptRoot is the folder containing the running script)
$scriptDir   = $PSScriptRoot                   # …\accountability-buddy-backend\src\scripts
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..\..')).ProviderPath
# now $projectRoot = …\accountability-buddy-backend

# 1) load and parse src/app.ts
$appPath = Join-Path $projectRoot "src/app.ts"
if (-not (Test-Path $appPath)) {
  Write-Error "Cannot find src/app.ts at expected path: $appPath"
  exit 1
}
$lines = Get-Content $appPath

# 2) grab all the /api mounts
$mounts =
  $lines |
  Where-Object { $_ -match 'app\.use\("/api/' } |
  ForEach-Object {
    if ($_ -match 'app\.use\("(?<route>/api/[^"]+)"') {
      $matches.route
    }
  } |
  Sort-Object -Unique

if ($mounts.Count -eq 0) {
  Write-Error "No app.use(\"/api/…\") lines found in src/app.ts"
  exit 1
}

# build a map from the last segment to the full mount
$routeMap = @{}
foreach ($m in $mounts) {
  $seg = Split-Path $m -Leaf
  $routeMap[$seg.ToLower()] = $m
}

Write-Host "Discovered mounts:"
$routeMap.GetEnumerator() | ForEach-Object { Write-Host " - $($_.Key) -> $($_.Value)" }

# 3) walk all test files and patch their URLs
Get-ChildItem -Path (Join-Path $projectRoot "src/test") -Recurse -Filter '*.test.ts' |
ForEach-Object {
  $file   = $_.FullName
  $text   = Get-Content $file -Raw
  $patched = $false

  foreach ($key in $routeMap.Keys) {
    # match single- or double-quoted "/api/<key>"
    $pattern     = '(["' + "'" + '])\/api\/' + [regex]::Escape($key) + '(["' + "'" + '])'
    $replacement = "`$1$routeMap[$key]`$2"
    $newText     = [regex]::Replace($text, $pattern, $replacement, 'IgnoreCase')
    if ($newText -ne $text) {
      $patched = $true
      $text    = $newText
    }
  }

  if ($patched) {
    Set-Content -Path $file -Value $text
    Write-Host "Patched $($_.Name)"
  }
}

Write-Host "All test files have been synced to your app.ts mounts."
