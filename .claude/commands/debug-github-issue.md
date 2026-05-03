---
description: Debug a QA-reported GitHub issue for Kanban
---

## Iron Rules
- Follow every step in order. No skipping. No reordering.
- No fix is complete without evidence — screenshots + passing tests. "I think I fixed it" is not allowed.
- Do not move to the next step until the current one is complete and verified.

## Step 1 — Pick Issue
**If an issue number was passed as an argument**, use that issue.
**Otherwise**, list the oldest open `bug` issue:
```
gh issue list --repo aloknag/testfiles --label bug --state open --limit 20 --json number,title,createdAt | jq 'sort_by(.createdAt) | .[0]'
```
Read the full issue body: `gh issue view <N> --repo aloknag/testfiles`

**STOP. Do not proceed until you have a specific issue number and have read its full body.**

## Step 2 — Announce on GitHub
Post a comment and mark the issue as "Investigating":
```
gh issue comment <N> --repo aloknag/testfiles --body "Investigating: picked up on commit $(git rev-parse HEAD)"
```

**STOP. Do not proceed until the comment is posted.**

## Step 3 — Rebuild and Reproduce in Browser
Always rebuild before reproducing:
```
docker compose down && docker compose up --build -d
```
Use playwright-mcp to open `http://localhost:5173` and follow the steps from the issue.
- Check browser console for errors (`browser_console_messages`)
- Take a **before** screenshot → save to `evidences/before-<N>.png`

**If you cannot reproduce:**
1. Rebuild clean and retry once.
2. If still not reproducible, post:
   ```
   gh issue comment <N> --repo aloknag/testfiles --body "Cannot reproduce on commit $(git rev-parse HEAD). Attempted: <steps tried>. Leaving open for QA clarification."
   ```
3. **STOP.**

**STOP. Do not proceed until you have a before screenshot in `evidences/`.**

## Step 4 — Post Reproduction Hypothesis
```
gh issue comment <N> --repo aloknag/testfiles --body "Reproduced on commit $(git rev-parse HEAD). Hypothesis: <your hypothesis of root cause>."
```

## Step 5 — Root Cause
Use `Skill(superpowers:systematic-debugging)` — all four phases.
- Instrument the code to observe actual values at component boundaries.
- State the confirmed root cause explicitly before touching any production code.

## Step 6 — Fix with TDD
Use `Skill(superpowers:test-driven-development)`.
- Write failing test. Run it. Confirm it fails for the right reason.
- Write minimal fix. Confirm all tests pass.
- Take an **after** screenshot → save to `evidences/after-<N>.png`

Use `Skill(superpowers:verification-before-completion)` — run verification commands and confirm output before claiming done.

**STOP. Do not proceed until before + after screenshots exist and all tests pass.**

## Step 7 — Update GitHub Issue
Post a short RCA comment with evidence:
```
gh issue comment <N> --repo aloknag/testfiles --body "Fixed.\n\n**Root cause:** <1 sentence>\n**Fix:** <1 sentence>\n\nBefore: evidences/before-<N>.png | After: evidences/after-<N>.png\nAll tests passing on commit $(git rev-parse HEAD)"
```

## Step 8 — Write RCA in Docs
Append to `docs/RCA.md`:
- **Bug ID**: #N
- **Why** introduced
- **Who/where** in the code
- **Where** it should have been caught
- **What to avoid**

## Step 9 — Commit and Close
Stage only files changed for this bug.
```
git commit -m "fix: <description> (closes #N)"
gh issue close <N> --repo aloknag/testfiles --comment "Fixed in $(git rev-parse HEAD)."
```

## Skills
- `Skill(superpowers:systematic-debugging)` — Step 5
- `Skill(superpowers:test-driven-development)` — Step 6
- `Skill(superpowers:verification-before-completion)` — Step 6

## References
- E2E Testing: `docs/e2e-testing.md`
- Tracking: `aloknag/testfiles` issues, AgentKanban project board #1
- Screenshots: `evidences/` (not tracked by git)

## Checklist — verify ALL before declaring done
- [ ] Issue identified and full body read
- [ ] "Investigating" comment posted on GitHub issue
- [ ] Docker rebuilt and bug reproduced in browser
- [ ] Before screenshot saved to `evidences/`
- [ ] Reproduction hypothesis posted on GitHub issue
- [ ] Root cause confirmed (systematic-debugging all four phases)
- [ ] Failing test written and confirmed failing
- [ ] Fix implemented — all tests pass
- [ ] After screenshot saved to `evidences/`
- [ ] Verification commands run — evidence in hand, not assumed
- [ ] RCA comment posted on GitHub issue with before/after screenshots
- [ ] RCA appended to `docs/RCA.md`
- [ ] Commit made with `closes #N`
- [ ] GitHub issue closed with commit SHA
