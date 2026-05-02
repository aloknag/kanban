# Pre-Dispatch Checklist
# Orchestrator MUST run this for each selected task BEFORE dispatching sub-agents
# Usage: .\pre-dispatch-checklist.ps1 -TaskNumber 23 -TaskSlug "markdown-component"

param(
    [int]$TaskNumber = $(throw "TaskNumber is required"),
    [string]$TaskSlug = $(throw "TaskSlug is required (first 4 alphanumeric tokens, lowercase, hyphenated)")
)

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PRE-DISPATCH CHECKLIST for Task #$TaskNumber ($TaskSlug)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Constants
$REPO_DIR = "C:\Users\nagal\Documents\ai_projects\kanban"
$WORKTREE_ROOT = "C:\Users\nagal\Documents\ai_projects\kanban-worktrees"
$BRANCH_NAME = "task/$TaskNumber-$TaskSlug"
$WORKTREE_PATH = "$WORKTREE_ROOT\task-$TaskNumber"

# Color helpers
function Test-Item {
    param([bool]$Pass, [string]$Item)
    if ($Pass) {
        Write-Host "  ✓ $Item" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ $Item" -ForegroundColor Red
        return $false
    }
}

# Checklist items
$checks = @()

# 1. Verify git repo exists and is on main
Write-Host "1. REPO STATE" -ForegroundColor Yellow
Push-Location $REPO_DIR
$onMain = (git branch --show-current) -eq "main"
$checks += (Test-Item $onMain "On main branch")

$repoClean = (git status --porcelain).Count -eq 0
$checks += (Test-Item $repoClean "Working directory clean")
Pop-Location

# 2. Verify worktree path doesn't already exist
Write-Host ""
Write-Host "2. WORKTREE PATH" -ForegroundColor Yellow
$worktreeExists = Test-Path $WORKTREE_PATH
$checks += (Test-Item (-not $worktreeExists) "Worktree path is free: $WORKTREE_PATH")

if ($worktreeExists) {
    Write-Host "    WARNING: Worktree already exists at $WORKTREE_PATH" -ForegroundColor Yellow
    Write-Host "    This is OK if re-running from a previous partial dispatch." -ForegroundColor Yellow
}

# 3. Verify branch doesn't already exist
Write-Host ""
Write-Host "3. BRANCH NAME" -ForegroundColor Yellow
Push-Location $REPO_DIR
$branchExists = (git branch -a | Select-String "^\s*$BRANCH_NAME") -ne $null
$checks += (Test-Item (-not $branchExists) "Branch does not exist: $BRANCH_NAME")

if ($branchExists) {
    Write-Host "    WARNING: Branch already exists: $BRANCH_NAME" -ForegroundColor Yellow
    Write-Host "    This is OK if re-running from a previous partial dispatch." -ForegroundColor Yellow
}
Pop-Location

# 4. Query issue status in GitHub project
Write-Host ""
Write-Host "4. GITHUB PROJECT STATUS" -ForegroundColor Yellow
try {
    $projectItems = gh project item-list 1 --owner aloknag --format json | ConvertFrom-Json
    $issueItem = $projectItems.items | Where-Object { $_.content.number -eq $TaskNumber }

    if ($issueItem) {
        $currentStatus = ($issueItem.fieldValues.nodes | Where-Object { $_.field.name -eq "Status" }).name
        Write-Host "  ✓ Issue #$TaskNumber found in project" -ForegroundColor Green
        Write-Host "    Current status: $currentStatus"

        $isBacklog = $currentStatus -eq "Backlog"
        $checks += (Test-Item $isBacklog "Status is Backlog (not already In progress)")
    } else {
        Write-Host "  ✗ Issue #$TaskNumber NOT found in project board" -ForegroundColor Red
        $checks += $false
    }
} catch {
    Write-Host "  ✗ Failed to query GitHub project: $_" -ForegroundColor Red
    $checks += $false
}

# 5. Update issue status to In progress
Write-Host ""
Write-Host "5. UPDATE STATUS → IN PROGRESS" -ForegroundColor Yellow
if ($checks -contains $false) {
    Write-Host "  ⊘ Skipped (prior checks failed)" -ForegroundColor Yellow
} else {
    try {
        $itemId = $issueItem.id
        gh project item-edit --id $itemId --project-id PVT_kwHOAIBTCM4BWR9z `
            --field-id PVTSSF_lAHOAIBTCM4BWR9zzhRnmck `
            --single-select-option-id 47fc9ee4 --format json | Out-Null

        Write-Host "  ✓ Status updated to In progress" -ForegroundColor Green
        $checks += $true
    } catch {
        Write-Host "  ✗ Failed to update status: $_" -ForegroundColor Red
        $checks += $false
    }
}

# Final summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
$passCount = ($checks | Where-Object { $_ -eq $true }).Count
$totalCount = $checks.Count
Write-Host "SUMMARY: $passCount / $totalCount checks passed" -ForegroundColor Cyan

if ($checks -contains $false) {
    Write-Host ""
    Write-Host "❌ PRE-DISPATCH CHECKLIST FAILED" -ForegroundColor Red
    Write-Host "Fix the above issues and re-run before dispatching." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ PRE-DISPATCH CHECKLIST PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to dispatch:" -ForegroundColor Green
    Write-Host "  Branch: $BRANCH_NAME" -ForegroundColor Green
    Write-Host "  Worktree: $WORKTREE_PATH" -ForegroundColor Green
    Write-Host "  Issue: #$TaskNumber" -ForegroundColor Green
    Write-Host ""
    Write-Host "Dispatch agent now." -ForegroundColor Green
    exit 0
}
