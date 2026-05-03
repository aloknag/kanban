---
description: Systematic debugging of issues for Kanban
---

## Iron Rules
- Follow every step in order. No skipping. No reordering.
- Prior knowledge of the fix does NOT skip the process.
- Do not move to the next step until the current one is complete and verified.

## Step 1 — Reproduce in browser
Use playwright-mcp to open http://localhost:5173 and reproduce the issue yourself.
- Check browser console for errors (`browser_console_messages`)
- Take screenshot → save to `evidences/` folder
- If already reproduced this session, proceed to Step 2.

**STOP. Do not proceed until you have a screenshot in `evidences/`.**

## Step 2 — File GitHub Bug Report
```
gh issue create --repo aloknag/testfiles --title "BUG: ..." --body "..." --label bug
gh project item-add 1 --owner aloknag --url <issue-url>
```
Include in body: steps to reproduce, console errors, screenshot filename.

**STOP. Do not proceed until you have a GitHub issue URL.**

## Step 3 — Root Cause
Use `Skill(superpowers:systematic-debugging)` — all four phases.
- Instrument the code to observe actual values at component boundaries.
- State the hypothesis explicitly before touching any production code.

## Step 4 — Fix with TDD
Use `Skill(superpowers:test-driven-development)`.
- Write failing test. Run it. Confirm it fails for the right reason.
- Write minimal fix. Confirm all tests pass.
- Save before/after screenshots to `evidences/`.

## Step 5 — Update GitHub Issue
Add a comment with the fix summary and post-fix screenshot.
```
gh issue comment <N> --repo aloknag/testfiles --body "Fixed. Before: <screenshot>. After: <screenshot>."
```

## Step 6 — Commit and Close
Stage only files changed for this bug.
```
git commit -m "fix: <description> (closes #N)"
gh issue close <N> --repo aloknag/testfiles --comment "Fixed in <commit-sha>."
```

## Step 7 — Write RCA
Append to `docs/RCA.md` with the Bug ID:
- **Why** introduced
- **Who/where** in the code
- **Where** it should have been caught
- **What to avoid**

## Skills
- `Skill(superpowers:systematic-debugging)` — Step 3
- `Skill(superpowers:test-driven-development)` — Step 4

## References
- E2E Testing: `docs/e2e-testing.md`
- Tracking: `aloknag/testfiles` issues, AgentKanban project board #1
- Screenshots: `evidences/` (not tracked by git)

## Checklist — verify ALL before declaring done
- [ ] Issue reproduced in browser
- [ ] Screenshot saved to `evidences/`
- [ ] GitHub issue filed and added to AgentKanban board
- [ ] Failing test written and confirmed failing
- [ ] Fix implemented — all tests pass
- [ ] GitHub issue updated with fix screenshot
- [ ] Commit made with `closes #N`
- [ ] GitHub issue closed with commit SHA
- [ ] RCA appended to `docs/RCA.md` with Bug ID
