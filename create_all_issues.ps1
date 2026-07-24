# create_all_issues.ps1
# Bulk-creates GitHub issues from github_issues_import.csv using gh CLI.
#
# USAGE:
#   1. Put this script and github_issues_import.csv in the same folder
#      (e.g. your smart-college-mern project folder).
#   2. Open PowerShell in that folder.
#   3. Run:  .\create_all_issues.ps1
#
# NOTE: Rank #1 (SuperAdmin - Admin Email format & duplicate validation)
# was already created manually as issue #362, so this script SKIPS rank 1
# by default to avoid a duplicate. Change $skipRanks below if needed.

$repo = "Lemmecode-com/smart-college-mern"
$csvPath = ".\github_issues_import.csv"
$skipRanks = @(1)   # ranks already created manually — add more numbers here if needed
$delaySeconds = 2   # small pause between issues to avoid hitting GitHub rate limits

if (-not (Test-Path $csvPath)) {
    Write-Host "ERROR: $csvPath not found in current folder. Place the CSV here and re-run." -ForegroundColor Red
    exit 1
}

$issues = Import-Csv -Path $csvPath

$total = $issues.Count
$created = 0
$skipped = 0
$failed = 0

foreach ($issue in $issues) {

    $rank = [int]$issue.rank

    if ($skipRanks -contains $rank) {
        Write-Host "[$rank/$total] SKIPPED (already created): $($issue.title)" -ForegroundColor Yellow
        $skipped++
        continue
    }

    # Write body to a temp file (gh needs --body-file for multi-line content)
    $tempBodyFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempBodyFile -Value $issue.body -Encoding UTF8

    Write-Host "[$rank/$total] Creating: $($issue.title)" -ForegroundColor Cyan

    try {
        $result = gh issue create `
            --repo $repo `
            --title $issue.title `
            --body-file $tempBodyFile `
            --label $issue.labels 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   -> $result" -ForegroundColor Green
            $created++
        } else {
            Write-Host "   -> FAILED: $result" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "   -> ERROR: $_" -ForegroundColor Red
        $failed++
    } finally {
        Remove-Item $tempBodyFile -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds $delaySeconds
}

Write-Host ""
Write-Host "=================================="
Write-Host "Done. Created: $created | Skipped: $skipped | Failed: $failed | Total: $total"
Write-Host "=================================="
