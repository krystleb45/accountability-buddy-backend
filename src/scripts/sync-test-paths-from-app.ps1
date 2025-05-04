<#
.SYNOPSIS
  Synchronize all "/api/…" URLs in your test files to exactly match
  the mounts you declared in src/app.ts.
#>

param()

# ─── 1) Locate your repo root ───────────────────────────────
# PSScriptRoot = …\src\scripts
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot  = Join-Path $scriptDir "..\.."

# Ensure we actually have src/app.ts
$appPath = Join-Path $repoRoot "src\app.ts"
if (-not (Test-Path $appPath)) {
    Write-Error "❌ Could not find '$appPath'. Are you running this from your project root?"
    exit 1
}

# ─── 2) Extract all your app.use("/api/…") mounts ───────────
$lines  = Get-Content $appPath
$mounts = $lines `
  | Where-Object { $_ -match 'app\.use\("/api/' } `
  | ForEach-Object {
      if ($_ -match 'app\.use\("(?<route>/api/[^"]+)"') {
        $matches.route
      }
    } `
  | Sort-Object -Unique

if ($mounts.Count -eq 0) {
    Write-Error "❌ No app.use(\"/api/…\") lines found in $appPath"
    exit 1
}

# Build a map:  last segment (lowercase) → full route
$routeMap = @{}
foreach ($m in $mounts) {
    $seg = Split-Path $m -Leaf
    $routeMap[$seg.ToLower()] = $m
}

Write-Host "Discovered mounts:"
$routeMap.GetEnumerator() | ForEach-Object {
    Write-Host " - $($_.Key) → $($_.Value)"
}

# ─── 3) Walk and patch every test file ──────────────────────
$testRoot = Join-Path $repoRoot "src\test"
Get-ChildItem -Path $testRoot -Filter '*.test.ts' -Recurse |
ForEach-Object {
    $file    = $_.FullName
    $content = Get-Content $file -Raw
    $patched = $false

    foreach ($key in $routeMap.Keys) {
        # match '/api/key' or "/api/key"
        $pattern     = "(['""])/api/$key(['""])"
        $replacement = "`$1$routeMap[$key]`$2"
        $newContent  = [regex]::Replace($content, $pattern, $replacement, 'IgnoreCase')

        if ($newContent -ne $content) {
            $patched = $true
            $content = $newContent
        }
    }

    if ($patched) {
        Set-Content -Path $file -Value $content
        Write-Host "Patched $($_.Name)"
    }
}

Write-Host "All test URLs have been synced to your app.ts mounts."
