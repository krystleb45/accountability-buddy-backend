# replace-api-paths.ps1
# Usage: .\replace-api-paths.ps1

# 1) Find all test files
\ = Get-ChildItem -Path .\src\test\ -Recurse -Filter '*.test.ts'

foreach (\C:\Users\kryst\OneDrive\Desktop\accountability-buddys\accountability-buddy-backend\src\test\xpHistory.test.ts in \) {
    # 2) Read entire file as a single string
    \ = Get-Content \C:\Users\kryst\OneDrive\Desktop\accountability-buddys\accountability-buddy-backend\src\test\xpHistory.test.ts.FullName -Raw

    # 3) Collapse any run of 2+ trailing 's' after an /api/... segment â†’ single 's'
    \ = \ -replace '(/api/[A-Za-z0-9-]+?)s{2,}\b', ''

    # 4) Fix any simple yâ†’ies that ended up as ...ys (e.g. activitys â†’ activities)
    \ = \ -replace '(/api/([A-Za-z0-9-]+?))ys\b', 'ies'

    # 5) Write back if changed
    Set-Content -Path \C:\Users\kryst\OneDrive\Desktop\accountability-buddys\accountability-buddy-backend\src\test\xpHistory.test.ts.FullName -Value \

    Write-Host "Patched \"
}

Write-Host "âœ“ All test URLs normalized to proper plurals."
