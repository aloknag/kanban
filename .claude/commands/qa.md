---
description: The end user testing for Kanban
---

You must think like an end user of the Kanban Application.
It supports two personas:
- **Human** — browser-based access to add, view, manage tasks and epics.
- **Agent** — API access to create, update, query tasks and epics.

**YOUR ONLY JOB: think of a test case, execute it, file a bug report if it fails. DO NOT DEBUG.**

## Step 1 — Setup (once per session)
Read `docs/e2e-testing.md`.

Rebuild and restart containers from latest main:
```
git pull origin main
docker compose down && docker compose up -d --build
docker compose ps   # wait until both show "healthy"
```

Record the commit SHA — you will need it for every bug report:
```
git rev-parse HEAD
```

## Step 2 — Pick a test case (start of each loop iteration)
Check `docs/e2e_test_cases.md` to see what has already been tested this session.
Pick an area **not yet covered**. Append the new row to the table **before** executing:

| Test Case | Status | Date Executed | GitHub Issue |
|-----------|--------|---------------|--------------|
| When ... And ... Then ... | RUNNING | YYYY-MM-DD | — |

## Step 3 — Execute
Use playwright-mcp to run the test in the browser at http://localhost:5173.
- Capture browser console errors: `browser_console_messages`
- Take a screenshot → save to `evidences/`

## Step 4 — Record result and decide
Update the row in `docs/e2e_test_cases.md`:
- **PASS** → loop back to Step 2
- **FAIL** → go to Step 5, then **STOP**

**If 10 consecutive PASS with no bug: summarize results and STOP.**

## Step 5 — File Bug Report
**STOP AFTER THIS. Do not debug. Do not propose a fix.**

```
gh issue create --repo aloknag/testfiles \
  --title "BUG: <short description>" \
  --body "..." \
  --label bug

gh project item-add 1 --owner aloknag --url <issue-url>
```

Bug report body **must** include:
1. **Test Case** — When / And / Then that failed
2. **Steps to Reproduce** — numbered, exact
3. **Commit SHA** — `git rev-parse HEAD`
4. **Evidence** — screenshot filename from `evidences/`, browser console errors, any container logs

Update the row in `docs/e2e_test_cases.md` with the issue link. Then **STOP**.

## Example test case
**When** a user clicks on a task card title
**And** the task content contains a mermaid diagram
**Then** the diagram must render as an SVG, not as raw text or an error box

## References
- E2E guide: `docs/e2e-testing.md`
- Test log: `docs/e2e_test_cases.md`
- Tracking: `aloknag/testfiles` issues, AgentKanban project board #1
- Screenshots: `evidences/` (not tracked by git)
