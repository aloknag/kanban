---
description: The end user testing for Kanban
---

## Iron Rules
- Follow every step in order. No skipping. No reordering.
- **DO NOT DEBUG THE ISSUE.** Your job is find and report only.
- Each loop iteration MUST jump to a completely different testing dimension — never a variation of the prior test.
- Evidence is mandatory when filing a bug. No evidence = no bug report.
- Maximum 5 divergent test cases per session. Stop and report after 5 whether or not a bug is found.

## Personas
This app has two personas. Test them individually AND in combination:

| Persona | How |
|---|---|
| **Human** | Browser via playwright-mcp at `http://localhost:5173` |
| **Agentic AI** | API calls via curl or Python script |
| **Cross-persona** | Agent sets up state via API → Human verifies in browser (or vice versa) |

Cross-persona scenarios are the most valuable — they surface integration bugs that single-persona tests miss.

**Example cross-persona test:** Agent creates an epic + 10 tasks via API → Human opens browser to check progress view renders correctly.

## Testing Dimensions (seed list)
Use these as a starting point. You MUST pick a different dimension each loop. You are free to invent dimensions not on this list.

1. **Happy path** — basic CRUD as a human
2. **Boundary values** — 500+ char task, empty fields, special characters, unicode
3. **Cross-persona** — agent creates state, human verifies (or vice versa)
4. **Data integrity** — does data persist correctly after refresh/restart?
5. **UI rendering** — markdown, code blocks, long text, images in task body
6. **State transitions** — task status flows (todo → in-progress → done and back)
7. **Concurrency** — rapid consecutive actions, multiple tabs
8. **Error states** — invalid inputs, network-like failures, missing fields
9. **Performance** — board with many tasks, large payloads
10. **API contract** — does API accept/reject inputs per its documented spec?

## Process

### Setup (once per session)
1. Read `docs/e2e_test_cases.md` — note which dimensions are already covered. Do not repeat them.
2. Rebuild and restart Docker on latest `main`:
   ```
   git checkout main && git pull
   docker compose down && docker compose up --build -d
   ```
   Verify containers are healthy before proceeding.

**STOP. Do not test against a stale build.**

### Loop (repeat up to 5 times, stop immediately on bug)

**Step A — Pick a dimension**
Choose a dimension that is completely unlike the previous test AND not already well-covered in `docs/e2e_test_cases.md`. State explicitly: *"This test covers [dimension] because [reason it's uncovered]."*

**Step B — Write the test case**
Format:
```
Dimension: <dimension name>
When: <actor and action>
And:  <additional conditions>
Then: <expected outcome>
```
Log this entry immediately to `docs/e2e_test_cases.md` with status `IN PROGRESS`.

**Step C — Execute**
Run the test using playwright-mcp (human persona), curl/Python (API persona), or both (cross-persona).
Monitor browser console for errors. Capture relevant logs.

**Step D — Record result**
Update the entry in `docs/e2e_test_cases.md`:

| Field | Values |
|---|---|
| `#` | auto-increment |
| `Dimension` | from seed list or invented |
| `Test Case` | when/and/then |
| `Result` | `PASS` / `FAIL` |
| `GHI` | GitHub issue number if filed, else `-` |

**If PASS** → commit the updated `docs/e2e_test_cases.md` and continue to next loop iteration.

**If FAIL** → STOP loop. Go to Bug Report.

### No Bug Found (after 5 passing tests)
Write to user:
> "No bugs found in this session. Dimensions tested: [list]. Coverage updated in docs/e2e_test_cases.md."

Commit `docs/e2e_test_cases.md`.

---

## Bug Report

### 1. Write a Playwright reproduction test
Write a self-contained Playwright test (JS or Python) that reproduces the bug.
Save to `tests/e2e/bug_<N>.spec.js` (or `.py`). It must fail on the current build.

### 2. Capture evidence
- **Browser bug (playwright-mcp):** screenshot is mandatory. Save to `evidences/bug-<N>.png`.
- **API bug:** save curl/Python script output as evidence.

### 3. File the GitHub issue
```
gh issue create \
  --repo aloknag/testfiles \
  --title "BUG: <title>" \
  --label bug \
  --body "$(cat <<'EOF'
**Test Case**
When: ...
And: ...
Then: ...

**Steps to Reproduce**
1. ...
2. ...

**Commit SHA**
<output of: git rev-parse HEAD>

**Evidence**
<screenshot path or script output>
EOF
)"
```
**`--label bug` is mandatory. Do not file without it.**

### 4. Add to project board
```
gh project item-add 1 --owner aloknag --url <issue-url>
```

### 5. Commit the reproduction test
```
git add docs/e2e_test_cases.md tests/e2e/bug_<N>.spec.js evidences/bug-<N>.png
git commit -m "bug:#<N> add reproduction test and evidence"
```

### 6. STOP
Write a 2-line summary to the user:
- What broke and in which dimension
- GitHub issue number and URL

---

## References
- E2E test log: `docs/e2e_test_cases.md`
- E2E guide: `docs/e2e-testing.md`
- Tracking: `aloknag/testfiles` GitHub issues
- Project board #1: `https://github.com/users/aloknag/projects/1`
- Evidence: `evidences/` (not tracked by git)
- Repro tests: `tests/e2e/`

## Checklist — verify ALL before stopping
- [ ] `docs/e2e_test_cases.md` read — known coverage understood
- [ ] Docker rebuilt on latest `main` and containers healthy
- [ ] Each test case used a distinct, non-repeating dimension
- [ ] `docs/e2e_test_cases.md` updated with result and dimension for every test run
- [ ] If bug found: evidence captured (screenshot or script output)
- [ ] If bug found: Playwright repro test written and saved
- [ ] If bug found: GitHub issue filed with `bug` label and `BUG:` title prefix
- [ ] If bug found: issue added to AgentKanban project board
- [ ] If bug found: repro test + evidence committed with `bug:#N` prefix
- [ ] 2-line summary written to user
