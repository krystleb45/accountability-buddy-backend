# fix-test-routes.ps1
param()

# 1) assume current dir is project root
$projectRoot = (Get-Location).Path

# 2) locate app.ts
$app = Join-Path $projectRoot "src\app.ts"
if (-not (Test-Path $app)) {
  Write-Error "Could not find src/app.ts at $app"
  exit 1
}

# 3) pull all app.use("/api/...") mounts
$mounts = Select-String -Path $app -Pattern 'app\.use\("/api/[^"]+"' |
  ForEach-Object {
    if ($_ -match 'app\.use\("(?<route>/api/[^"]+)"') { $Matches.route }
  } | Sort-Object -Unique

if (-not $mounts) {
  Write-Error "No '/api/…' mounts found in src/app.ts"
  exit 1
}

# 4) build a map: last‑segment → full mount
$routeMap = @{}
foreach ($m in $mounts) {
  $leaf = [IO.Path]::GetFileName($m).ToLower()
  $routeMap[$leaf] = $m
}

Write-Host "Discovered mounts:"
$routeMap.GetEnumerator() | ForEach-Object {
  Write-Host " - $([string]::PadRight($_.Key,15)) → $($_.Value)"
}

# 5) patch each test under src/test
$testsDir = Join-Path $projectRoot "src\test"
Get-ChildItem -Path $testsDir -Recurse -Filter '*.test.ts' |
ForEach-Object {
  $path    = $_.FullName
  $content = Get-Content $path -Raw
  $patched = $false

  foreach ($key in $routeMap.Keys) {
    # match '/api/<key>' in single/double quotes
    $pattern     = '(["' + "'" + '])\/api\/' + [regex]::Escape($key) + '(\b)(["' + "'" + '])'
    $replacement = "`$1$($routeMap[$key])`$2`$3"
    $newContent  = [regex]::Replace($content, $pattern, $replacement, 'IgnoreCase')
    if ($newContent -ne $content) {
      $content = $newContent
      $patched = $true
    }
  }

  if ($patched) {
    Set-Content -Path $path -Value $content
    Write-Host "Patched $($_.Name)"
  }
}

Write-Host "✅ All test files updated to match your app.ts mounts."
