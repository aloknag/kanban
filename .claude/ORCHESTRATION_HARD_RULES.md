---
description: Non-negotiable rules for orchestrator and sub-agents during AgentBoard implementation waves
version: 1.0
date: 2026-05-01
---

# Orchestration Hard Rules

These rules are **absolute and non-negotiable**. Violations halt the wave immediately.

---

## For Sub-Agents (Implementers)

### Rule 1: Create Worktree FIRST (Blocking)

**The Rule:**  
Before writing any code, creating any files, or running any tests, you MUST create a git worktree in the designated location.

**Exact Steps (non-optional):**
```bash
cd C:/Users/nagal/Documents/ai_projects/kanban
git worktree add ../kanban-worktrees/task-{NN} -b task/{NN}-{slug}
cd ../kanban-worktrees/task-{NN}
```

**Verification:**
```bash
# After worktree add, verify you are in the correct directory:
pwd  # Should output: C:\Users\nagal\Documents\ai_projects\kanban-worktrees\task-{NN}

# Verify you are on the correct branch:
git branch --show-current  # Should output: task/{NN}-{slug}
```

**If worktree creation fails:**
- Do NOT proceed to implementation
- Do NOT attempt to work on main or any other branch
- Return immediately: `blocked — worktree creation failed: <error message>`
- Post this as a comment on the GitHub issue

**If you are not in the worktree directory or on the correct branch:**
- Stop all work immediately
- Return: `blocked — execution environment incorrect: <actual vs. expected>`

### Rule 2: Never Commit to Main

**The Rule:**  
You MUST NOT commit any work to the `main` branch. All commits go to `task/{NN}-{slug}` only.

**Verification Before Every Commit:**
```bash
git branch --show-current
```
**Expected output:** `task/{NN}-{slug}`  
**If output is `main`:** STOP. Do not commit. Return `blocked — attempted commit to main branch`

**Hard Block:** If you find yourself on the `main` branch, immediately:
1. `git checkout task/{NN}-{slug}` to return to your task branch
2. If that fails, return: `blocked — unable to switch to task branch`

### Rule 3: All Commits on Task Branch Only

**The Rule:**  
Every single commit must be made while on `task/{NN}-{slug}` branch.

**Commit Format:**
Use the message specified in the Task's `## Verify` block. Example:
```bash
git commit -m "feat(frontend): Markdown renderer with custom component map and §-numbering"
```

**Pre-Commit Checklist:**
- [ ] `git branch --show-current` returns `task/{NN}-{slug}`
- [ ] `git status` shows only expected changed files
- [ ] All tests pass locally (`npm run test` or equivalent)
- [ ] All AC are addressed

**If any check fails:** Do not commit. Return `blocked — <reason>`.

### Rule 4: Return Message Format (Exact)

**The Rule:**  
Your return message to the orchestrator MUST match this exact format:

**For successful completion:**
```
done — committed <sha> on task/{NN}-{slug}
```

**Example:**
```
done — committed 87150dd on task/28-dnd-column
```

**For blocked/failed tasks:**
```
blocked — <reason>
```

**Example:**
```
blocked — worktree creation failed: directory already exists
```

**Verification Before Returning:**
- [ ] Return message contains `done —` or `blocked —` (exactly one of these)
- [ ] If `done —`, format is `done — committed <sha> on task/<NN>-<slug>`
- [ ] The `<sha>` is a real commit hash from your branch
- [ ] The `task/<NN>-<slug>` matches the branch you worked on
- [ ] No mention of `main` or `main branch` anywhere

**If you cannot match this format:** Return `blocked — unable to generate compliant return message: <reason>`

### Rule 5: All Tests Pass Before Declaring Done

**The Rule:**  
You must run verification commands and confirm all pass before returning `done`.

**Verification Must Include:**
1. **Unit tests:** `npm run test` (or equivalent for your codebase)
2. **AC verification:** All acceptance criteria must pass tests or manual checks
3. **Build/compile:** `npm run build` (or equivalent) must succeed
4. **No TypeScript errors:** Type checking must pass

**Pre-Return Checklist:**
- [ ] `npm run test` shows 0 failures
- [ ] All AC from the issue are implemented and tested
- [ ] `npm run build` succeeds
- [ ] No console errors or warnings beyond pre-existing ones
- [ ] Code review by yourself: does it match the design spec?

**If any check fails:** Do not return `done`. Instead, fix the issue and repeat checks, or return `blocked — <reason>`.

### Rule 6: Mandatory Superpowers Invocation

**The Rule:**  
You MUST invoke three superpowers at the start of implementation and activate them for your work:

1. **`superpowers:using-git-worktrees`** — Enforces worktree discipline
2. **`superpowers:test-driven-development`** — Enforces TDD loop (failing test → fix → green)
3. **`superpowers:verification-before-completion`** — Enforces pre-return verification

**Invocation Sequence:**
```
STEP 1: Invoke superpowers:using-git-worktrees
        → Confirm worktree is set up correctly
        → Get guidance on worktree operations

STEP 2: Invoke superpowers:test-driven-development
        → Begin implementation with failing test first
        → Use this for all code changes

STEP 3: Invoke superpowers:verification-before-completion
        → Before returning done, verify all acceptance criteria
        → Get a checklist of what must pass
```

**Do not begin implementation until all three superpowers are activated and confirmed.**

---

## For Orchestrator

### Rule 1: Phase 3 Prep is Mandatory (Blocking)

**The Rule:**  
Before dispatching a single agent, you MUST complete all three Phase 3 prep steps for each task:

1. **Compute branch and worktree paths** — Do not skip
2. **Update task status: Backlog → In progress** — Required; documents that work has begun
3. **Log completion of all prep items** — Creates audit trail

**Phase 3 Pre-Dispatch Checklist (per task):**
```
For issue #{NN}:
  [ ] Branch name computed: task/{NN}-{slug}
  [ ] Worktree path computed: kanban-worktrees/task-{NN}
  [ ] Issue status updated via gh: Backlog → In progress
  [ ] All three items logged/verified
  
  If any check fails: STOP. Do not dispatch. Fix the issue first.
```

**Implementation:**
Use the `pre-dispatch-checklist.ps1` script (provided) to automate this. Run it for each task before dispatch.

### Rule 2: Validate Return Messages (Blocking Gate)

**The Rule:**  
When an agent returns, you MUST validate the return message format before accepting it. Invalid returns halt the wave immediately.

**Validation Pattern:**
```regex
done — committed [a-f0-9]{7} on task/\d+-
```

**Validation Logic:**
```
IF return message contains "on main" OR "on main branch":
  → HALT wave
  → Post issue comment: "implementation halted — agent committed to main (hard rule violation)"
  → Reset main via: git reset --hard <prior-commit>
  → Reset task status back to Backlog
  → Record incident

ELSE IF return message does not match regex pattern:
  → HALT wave
  → Post issue comment: "implementation halted — invalid return message format"
  → Return message was: <copy exact message>
  → Expected format: done — committed <sha> on task/<NN>-<slug>

ELSE IF return message starts with "blocked":
  → Post issue comment with the block reason
  → Leave task at "In progress" (stuck, awaiting triage)
  → Continue with next task in wave

ELSE (valid "done" message):
  → Accept completion
  → Proceed to Phase 4 review-fix loop
```

**Implementation:**
Add validation gate in orchestrator workflow after each agent completes but before proceeding to Phase 4.

### Rule 3: Never Skip Validation Gates

**The Rule:**  
Each phase has entry and exit gates. You must execute all gates or halt the wave.

**Gate Sequence:**
```
Phase 3 Entry Gate:  Pre-dispatch checklist ✓
Phase 3 → Phase 4 Gate:  Return message validation ✓
Phase 4 Entry Gate:  Code review dispatch ✓
Phase 4 → Phase 5 Gate:  LGTM verdict (3 max iterations) ✓
Phase 5 Entry Gate:  All LGTMs collected ✓
Phase 5 Exit Gate:  Merge conflict resolution (if any) ✓
Phase 6 Entry Gate:  Merge successful ✓
Phase 6 Exit Gate:  Print summary ✓
```

**If a gate fails:**
- Do not skip it or mark it done anyway
- Halt the wave
- Surface the error to the user
- Document in the post-mortem

### Rule 4: Hard Rule Violations = Immediate Halt

**The Rule:**  
If any hard rule is broken, stop the wave immediately. Do not attempt recovery or workarounds.

**Hard Rules (Sub-Agent Violations):**
- Agent commits to main instead of task branch
- Agent returns message in wrong format
- Agent declares done but tests don't pass
- Agent skips worktree creation
- Agent invokes superpowers but doesn't follow them

**Hard Rules (Orchestrator Violations):**
- Orchestrator skips Phase 3 prep
- Orchestrator skips return message validation
- Orchestrator skips any gate

**On Violation:**
1. Halt the wave (stop accepting new agents, stop phase transitions)
2. Document the violation
3. Post issue comment explaining the halt
4. Reset any state that needs reverting (e.g., main branch)
5. Create a post-mortem
6. Wait for user guidance before re-running

### Rule 5: All Merges are Squash Merges

**The Rule:**  
Every task is merged to main as a single squash commit. Never merge with merge commits or multiple commits.

**Merge Command:**
```bash
git merge --squash task/{NN}-{slug}
git commit -m "{Task title} (closes #{NN})"
```

**After Merge:**
1. Delete worktree: `git worktree remove ../kanban-worktrees/task-{NN}`
2. Delete branch: `git branch -D task/{NN}-{slug}`
3. Update task status: In review/Done → Done (via gh)
4. Close issue: `gh issue close {NN}`
5. Post comment with merge SHA

---

## Enforcement

### Superpowers
- **`superpowers:using-git-worktrees`** enforces Rule 1 (sub-agent) and Rule 3 (orchestrator)
- **`superpowers:test-driven-development`** enforces Rule 5 (sub-agent)
- **`superpowers:verification-before-completion`** enforces Rule 3 (sub-agent)

### Scripts
- **`pre-dispatch-checklist.ps1`** enforces Orchestrator Rule 1
- **`validate-return-message.ps1`** enforces Orchestrator Rule 2

### Manual Gate Checks
- Orchestrator uses return message validation (Rule 2)
- Orchestrator uses phase gate checklist (Rule 3)
- Both validate compliance explicitly in conversation

### Incident Reporting
- Any violation: post issue comment immediately
- Create post-mortem if wave halts
- Document lessons learned

---

## Quick Reference

| Rule | Type | Enforced By | Fail Mode |
|------|------|-------------|-----------|
| Create worktree first | Sub-agent | Superpower + manual check | Halt wave |
| Never commit to main | Sub-agent | Superpower + return validation | Halt wave |
| All commits on task branch | Sub-agent | Manual pre-commit check | Return blocked |
| Return message format | Sub-agent | Orchestrator validator | Halt wave |
| Tests pass before done | Sub-agent | Verification superpower | Return blocked |
| Invoke superpowers | Sub-agent | Manual at start | Explicit requirement |
| Phase 3 prep mandatory | Orchestrator | Pre-dispatch checklist | Halt wave |
| Validate return messages | Orchestrator | Gate script | Halt wave |
| Never skip validation gates | Orchestrator | Phase gate checklist | Halt wave |
| Violations halt wave | Both | Incident protocol | Halt + document |
| Squash merge only | Orchestrator | Manual verification | Manual gate |

---

**Last Updated:** 2026-05-01  
**Version:** 1.0 (Baseline post Wave 1 failure)
