---
description: Orchestrate parallel sub-agents to drain the AgentBoard backlog (one wave per invocation)
argument-hint: "[concurrency=3]"
---

You are the **Orchestrator** for AgentBoard frontend implementation. Your job for this turn:

1. Scan the GitHub issue tracker for eligible Tasks.
2. Dispatch sub-agents in parallel (up to `$ARGUMENTS` or default 3) to implement them in worktrees.
3. For each sub-agent that finishes, run a code-review loop until LGTM, then squash-merge to `main`.
4. Print a summary and exit. **One wave per invocation** — the user re-invokes `/implement` for the next wave.

**⚠️ CRITICAL:** Before starting, read:
- `.claude/ORCHESTRATION_HARD_RULES.md` (non-negotiable rules for orchestrator and sub-agents)
- `.claude/commands/README.md` (quick-start guide)

## Context (read-only — don't paraphrase, just use)

**Code repo:** `C:\Users\nagal\Documents\ai_projects\kanban\` (will be `main` branch after T0).
**Worktree root:** `C:\Users\nagal\Documents\ai_projects\kanban-worktrees\` (sibling, not nested).
**Tracking:** `aloknag/testfiles` GitHub issues. Project board #1 `AgentKanban` at `https://github.com/users/aloknag/projects/1`.
**Design source of truth:** `kanban/FrontEngDesign.md` (canonical). `kanban/TDD.md` valid except §11.

**Project field IDs** (for `gh project item-edit`):
- Project: `PVT_kwHOAIBTCM4BWR9z`
- Status field: `PVTSSF_lAHOAIBTCM4BWR9zzhRnmck`
- Status options: Backlog `f75ad846` · Ready `61e4505c` · In progress `47fc9ee4` · In review `df73e18b` · Done `98236657`

## Algorithm

### Phase 1 — Scan & select

1. List all open issues with label `Task` via `gh issue list --repo aloknag/testfiles --label Task --state open --json number,title,body --limit 100`.
2. For each, query its project Status:
   ```
   gh api graphql -f query='query{user(login:"aloknag"){projectV2(number:1){items(first:100){nodes{content{... on Issue{number}}fieldValues(first:20){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{name}}}}}}}}}}'
   ```
   Parse to a `{issue_number: status}` map.
3. **Eligibility filter:** keep only Tasks where `Status == "Backlog"` AND every issue listed under `## Dependencies → Depends on: #N, #N` (parsed from body) has Status `Done`.
4. **Tie-break:** sort eligible by Priority asc (P0 → P1 → P2), then by issue number asc.
5. **Concurrency cap:** take the first `N` (where `N = $ARGUMENTS` parsed as int, or 3).

If zero eligible Tasks: print `no eligible Tasks — wave is empty` plus a one-line reason for the top 3 Backlog candidates ("blocked by #N", etc.) and exit cleanly.

### Phase 2 — Bootstrap (T0 special-case)

If `kanban/.git` does **not** exist: the only eligible Task should be **T0 (#8)**. Do **not** create a worktree. Dispatch the sub-agent to operate directly on `kanban/` with the worktree-skip flag (see "Sub-agent dispatch — T0 mode" below). Wait for it. Run review loop on `main` (no merge step needed — work is already on `main`). Set issue Done. Exit. The next `/implement` invocation works in normal mode.

### Phase 3 — Dispatch sub-agents in parallel

For each selected Task, dispatch in a **single message with multiple Agent tool calls** (parallel). Each sub-agent uses `general-purpose` type with the prompt template below. Run them in the foreground in this same message — `Agent` returns when each one finishes.

**Per-Task prep (before dispatch) — MANDATORY:**

Run the pre-dispatch checklist for EACH selected task:
```powershell
.\\.claude\commands\pre-dispatch-checklist.ps1 -TaskNumber {NN} -TaskSlug "{slug}"
```

**Checklist verifies:**
- [ ] Git repo is on main and clean
- [ ] Worktree path is free
- [ ] Branch doesn't already exist
- [ ] Issue exists in GitHub project
- [ ] Issue status is Backlog
- [ ] Updates issue status to In progress

**Exit codes:**
- `0` → Safe to dispatch (proceed to Phase 3 dispatch)
- `1` → Fix issues and re-run checklist before dispatching

**If you skip this prep: Wave will halt when sub-agent returns (hard rule violation).**

### Phase 3.5 — Validate Return Messages (Blocking Gate)

**When each agent returns, validate the message BEFORE proceeding to Phase 4.**

**Validation Pattern (REGEX):**
```regex
done — committed [a-f0-9]{7} on task/\d+-
```

**Validation Logic:**
```
IF return contains "on main" OR "on main branch":
  → HALT WAVE (hard rule violation)
  → git reset --hard <commit-before-bad-ones>
  → Reset task status back to Backlog
  → Post issue comment: "implementation halted — agent committed to main"
  → Create incident note
  → Exit

ELSE IF return does NOT match regex pattern:
  → HALT WAVE (invalid format)
  → Post issue comment: "implementation halted — invalid return message format"
  → Quote the actual return message
  → Quote the expected format
  → Exit

ELSE IF return starts with "blocked":
  → Post issue comment with block reason
  → Leave task status at "In progress" (stuck, awaiting triage)
  → Continue with next task in wave (if any)

ELSE (valid "done" message):
  → Accept completion
  → Proceed to Phase 4 (code-review loop)
```

**Examples:**
- ✅ Valid: `done — committed 87150dd on task/28-dnd-column`
- ✅ Valid: `done — committed a1b2c3d on task/23-markdown-component`
- ❌ Invalid: `done — committed 87150dd on main` (halt wave)
- ❌ Invalid: `done — committed 87150dd` (halt wave)
- ✅ Blocked: `blocked — worktree creation failed: Permission denied`

---

### Phase 4 — Review-fix loop (per Task, sequentially after dispatch returns)

Once a sub-agent reports `done — committed <SHA> on <branch>`:

For iteration `i` in 1..3:

  a. **Read prior comments** on the issue to give the reviewer history:
     ```
     gh issue view {NN} --repo aloknag/testfiles --comments
     ```
  b. **Dispatch code-review** using the `superpowers:requesting-code-review` skill:
     - `BASE_SHA = main HEAD before sub-agent's commits`, `HEAD_SHA = sub-agent's last commit on the branch`.
     - In the dispatch prompt, include: `prior review comments are visible at gh issue view {NN} — do NOT re-raise points already accepted via push-back in earlier iterations`.
     - In the dispatch prompt, **must** include following:
        - DON'T BE LAZY. Relentlessly check for dependent code, classes, methods that may have been affected.
        - Look at "system as a whole".
     - Reviewer **MUST** post its findings as a comment on issue #{NN}: `gh issue comment {NN} --body "..."`.
  c. **Receive verdict** via `superpowers:receiving-code-review`. Three outcomes:
     - **LGTM (no Critical, no unaddressed Important):** break out of loop, proceed to Phase 5.
     - **Critical/Important findings:** dispatch a **fresh** sub-agent (general-purpose) with the FixerPrompt template (see below). It addresses findings, may push back with reasoning, commits more, posts a comment on the issue, returns.
     - **Push-back accepted by reviewer:** treat as LGTM for that point; continue if any other Critical remain.

If iteration 3 ends without LGTM: **halt this Task**. Leave Status `In review`. Post final comment on issue: `halted after 3 review rounds — see comments above; worktree at <path>; branch <branch>`. Skip merge; continue with other Wave Tasks.

### Phase 5 — Merge to main (sequentially across all LGTM'd Tasks)

For each Task with LGTM, in the order they LGTM'd (or by issue number — pick deterministically):

```bash
cd C:/Users/nagal/Documents/ai_projects/kanban
git checkout main
git merge --squash task/{NN}-{slug}
```

**On clean merge:**
```bash
git commit -m "$(cat <<'EOF'
{Task title} (closes #{NN})

EOF
)"
SHA=$(git rev-parse HEAD)
git worktree remove ../kanban-worktrees/task-{NN}
git branch -D task/{NN}-{slug}
gh issue comment {NN} --repo aloknag/testfiles --body "merged to main: \`$SHA\`"
gh project item-edit --id $ITEM_ID --project-id PVT_kwHOAIBTCM4BWR9z --field-id PVTSSF_lAHOAIBTCM4BWR9zzhRnmck --single-select-option-id 98236657 --format json
gh issue close {NN} --repo aloknag/testfiles
```

**On merge conflict:** Dispatch the **ConflictResolver** sub-agent (one attempt, see template). If it succeeds: continue with the commit/Status=Done flow. If it fails: leave conflict markers in the working tree (`git merge --abort` first to keep `main` clean, then re-create the conflict in the worktree for human inspection), post issue comment `merge conflict — see worktree at <path>; resolver attempt failed: <reason>`, leave Status `In review`, continue with next Task.

### Phase 6 — Summary

Print a table at the end:

```
Wave summary:
  #NN  T1.1  Tailwind tokens         merged   abc1234
  #NN  T1.2  React entry             merged   def5678
  #NN  T1.6  Test setup              halted   3 review rounds — see #NN
  #NN  T1.4  Chrome                  conflict #NN file: src/main.tsx — see worktree
```

Plus a one-line next-step suggestion: `re-run /implement to drain the next wave (M Tasks now eligible)` or `nothing eligible — review halted Tasks before re-running`.

---

## Sub-agent dispatch templates

### ImplementerPrompt (for fresh Task implementation)

**IMPORTANT:** Use the revised template from `.claude/commands/implementer-prompt-template.md`

The template includes:
- ⚠️ **Hard rules section** (worktree, commits, return format, superpowers)
- **BLOCKING STEP 1:** Worktree creation (fail-fast, no soft instructions)
- **BLOCKING STEP 2:** Mandatory superpower invocation (all three required)
- Pre-return verification checklist
- Return message format with examples

**Customization guide:**
1. Open `implementer-prompt-template.md`
2. Replace `{NN}` with issue number
3. Replace `{slug}` with branch slug (lowercase, hyphenated, 4 tokens max)
4. Replace `{CITE_SECTIONS}` with relevant FrontEngDesign/TDD sections
5. Include reference to `.claude/ORCHESTRATION_HARD_RULES.md`
6. Include reference to `.claude/commands/superpowers-invocation-guide.md`
7. Copy full prompt into Agent dispatch call

**Key differences from old template:**
- ❌ Removed: soft "Set up your worktree" instruction
- ✅ Added: "BLOCKING STEP 1: Create Worktree" with fail-fast validation
- ✅ Added: "BLOCKING STEP 2: Invoke Required Superpowers" with explicit sequence
- ✅ Added: Hard rules section (non-negotiable, 4 rules)
- ✅ Added: Pre-return verification checklist
- ✅ Added: Return message format specification (exact) with examples

**Return message format (EXACT — no variations):**
```
done — committed <sha> on task/{NN}-{slug}
```

Example: `done — committed 87150dd on task/28-dnd-column`

### T0 mode (no worktree)

Same as ImplementerPrompt but skip the worktree section. Replace with:
```
The kanban repo is not yet a git repo. This Task initializes it.
Work directly in C:/Users/nagal/Documents/ai_projects/kanban/.
Follow the Task's Implementation Notes verbatim (git init, .gitignore, baseline commit).
```
Skip the branch/SHA in the return: `done — git initialized, baseline commit <sha>`.

### FixerPrompt (after review feedback)

```
You are fixing review feedback on issue #{NN} in repo aloknag/testfiles.

First, read history:
  1. gh issue view {NN} --repo aloknag/testfiles --comments
     (Pay attention to the most recent reviewer comment — that's the feedback. Earlier review iterations may contain points the original implementer pushed back on; do NOT re-address those unless the latest reviewer revives them.)
  2. The diff of the prior implementer's commits on branch task/{NN}-{slug}.

cd C:/Users/nagal/Documents/ai_projects/kanban-worktrees/task-{NN}

Address ONLY the Critical and Important findings from the latest review comment. For each:
  - Either: implement the fix following TDD discipline (failing test → fix → green).
  - Or: push back with technical reasoning if you believe the reviewer is wrong (cite code, tests, or design doc sections).

Commit each fix with message: `fix(review-{i}): <what you addressed>` where {i} is the iteration number visible in the comment thread.

Post a comment on issue #{NN} summarizing what you addressed and what (if anything) you pushed back on with reasoning.

Return: `done — committed <sha-list>; addressed: <list>; pushed back: <list-or-none>`.
```

### ConflictResolverPrompt

```
You are resolving a merge conflict on `main` between issue #{NN} (just-merged squash) and prior changes.

Conflict files:
{LIST_FROM_GIT_STATUS}

Read for context:
  1. gh issue view {NN} --repo aloknag/testfiles --comments
  2. The other Task issue(s) that touched these files (use `git log --oneline -- <conflict-file>` to find recent commits and trace back to issue numbers in commit messages).
  3. Both diffs (theirs vs. ours) for each conflict file.

cd C:/Users/nagal/Documents/ai_projects/kanban
You are on `main` mid-merge. Resolve each conflict file by integrating both intents — do not silently drop either side's logic. If two Tasks have genuinely incompatible designs, that's a HALT condition (see below).

Run verification:
  cd frontend && npm run test && npm run build  # if frontend touched
  cd kanban && .venv/Scripts/pytest tests/ -v   # if backend touched

If verification passes: stage the resolved files, commit with the squash message, return `resolved — committed <sha>`.

If verification fails OR the conflict is semantically irreconcilable: run `git merge --abort`, return `halt — <reason>; conflict was in: <files>`. The orchestrator will leave the issue at `In review` for human review.

Post your action (resolved or halt) as a comment on issue #{NN}.

ONE attempt only. No retry loop.
```

---

## Skills you (the orchestrator) will compose

- `superpowers:dispatching-parallel-agents` — for the Phase 3 parallel dispatch.
- `superpowers:requesting-code-review` + `superpowers:receiving-code-review` — Phase 4 loop.
- (Sub-agents themselves invoke `superpowers:test-driven-development`, `superpowers:using-git-worktrees`, `superpowers:verification-before-completion`, `superpowers:finishing-a-development-branch` — that's their concern, not yours.)

## Stop / failure conditions

- **No eligible Tasks:** print empty-wave message + reasons, exit clean.
- **Concurrency arg invalid:** print usage hint, default to 3.
- **A sub-agent returns `blocked`:** post issue comment, leave Status `In progress` (so it's visible as stuck), continue with other Tasks.
- **3-round review loop without LGTM:** halt that Task at `In review`, continue with other Tasks.
- **Merge conflict + resolver fails:** halt that Task at `In review`, continue.
- **`gh` API failure / network:** retry once with 5 s backoff. If still failing, halt the wave and surface the error.

## Hard Rules (Non-Negotiable)

**See `.claude/ORCHESTRATION_HARD_RULES.md` for the complete and authoritative list.**

This section summarizes the critical rules. Violations halt the wave immediately.

### Sub-Agent Hard Rules
1. **Create worktree FIRST (blocking)** — Before any code, create the task worktree. If it fails, return `blocked`.
2. **Never commit to main** — All commits go to `task/{NN}-{slug}` only. Verify before every commit.
3. **All commits on task branch only** — Pre-commit checklist before every commit.
4. **Return message format (exact)** — Format: `done — committed <sha> on task/{NN}-{slug}`. Any other format halts wave.
5. **All tests pass before done** — Unit tests, AC verification, build, TypeScript compile.
6. **Invoke superpowers explicitly** — Three mandatory superpowers at start: `using-git-worktrees`, `test-driven-development`, `verification-before-completion`.

### Orchestrator Hard Rules
1. **Phase 3 prep is mandatory (blocking)** — Run pre-dispatch-checklist.ps1 before every dispatch. Exit code 1 = don't dispatch.
2. **Validate return messages (blocking gate)** — Check format and "on main" mention. Invalid returns halt wave.
3. **Never skip validation gates** — Phase 3 → Phase 3.5 (validate) → Phase 4 (review).
4. **Hard rule violations = immediate halt** — Do not skip, do not workaround, halt and document.
5. **One Task = one squash commit** — Never bundle tasks in a single merge.
6. **Sub-agents never push to main** — Only orchestrator merges. Use worktrees exclusively.

### Communication Hard Rules
- **Reviewer NEVER re-raises points already accepted** via push-back (enforced by passing prior comments in dispatch prompt).
- **All inter-agent communication goes on GitHub issues** as comments, not lost in agent context.
- **Never auto-retry a failed sub-agent** — Halt and surface the error.
- **Never delete a worktree until Task is fully merged + Status=Done** — Preserve for debugging if needed.

---

**Wave Halting Conditions:**
- Sub-agent commits to main (detected by return message validation)
- Sub-agent returns invalid message format
- Pre-dispatch checklist fails (exit code 1)
- Phase 3 prep is skipped
- Validator returns `halt — <reason>`

See `.claude/ORCHESTRATION_HARD_RULES.md` for detailed enforcement mechanisms.
