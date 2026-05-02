---
date: 2026-05-01
incident: Wave 1 execution failure — agents committed to main instead of branches
severity: Critical (hard rule violation)
status: Post-mortem complete; recovery executed
---

# AgentBoard Wave 1 Post-Mortem Report

## Executive Summary

**Wave 1 partially failed due to two sub-agents violating a critical hard rule:** Agents for issues #23 (Markdown) and #25 (Journal) committed work directly to `main` branch instead of task branches in worktrees. This bypassed the mandatory code-review loop (Phase 4) and left the orchestrator unable to enforce audit trail, approval gates, and merge discipline.

**Impact:**
- ❌ Two tasks (#23, #25) committed directly to main without review
- ❌ Review-fix loop (Phase 4) impossible to execute
- ✅ One task (#28) correctly dispatched to branch; remains viable for review
- ✅ Recovery executed: main reset, tasks returned to Backlog

**Root causes:** Orchestrator skipped Phase 3 prep; dispatch prompts lacked enforcement; return messages not validated.

---

## Timeline

| Time | Action | Status |
|------|--------|--------|
| T0 | Orchestrator scans issues, selects #23, #25, #28 | ✓ Correct |
| T1 | Phase 3: Dispatch three agents in parallel | ✓ Correct |
| T2 | Agents begin work | ✗ Flawed |
| T2+395s | Agent #23 returns: "done — committed c00c6b8 on **main**" | ✗ Violation |
| T2+415s | Agent #25 returns: "done — committed 678ff3e on **main**" | ✗ Violation |
| T2+746s | Agent #28 returns: "done — committed 87150dd on **task/28-dnd-column**" | ✓ Correct |
| T3 | Orchestrator detects violations | ✓ Caught |
| T4 | Main reset; tasks returned to Backlog; worktrees cleaned | ✓ Recovery |

---

## Root Cause Analysis (5 Whys)

### Problem: Why did agents #23 and #25 commit to main?

1. **Why didn't they create worktrees?**
   - The ImplementerPrompt instructed worktree creation, but it was not a **blocking, first step** with validation.
   - Agents could skip it and proceed directly to main branch.

2. **Why didn't the orchestrator prevent this?**
   - **Phase 3 prep was skipped.** The orchestration spec mandates:
     ```
     Per-Task prep (before dispatch):
       - Compute branch = task/{NN}-{slug}
       - Compute worktree = path
       - Move issue Status Backlog → In progress
     ```
     Orchestrator jumped straight to "Dispatch" without this prep.

   - No validation of return messages. Agent #23's return "on main" contradicted the spec's required format "on task/23-...". This should have triggered an immediate halt.

3. **Why were no safeguards in place?**
   - The superpowers (`superpowers:using-git-worktrees`) were supposed to enforce worktree discipline, but either:
     - Agents didn't invoke them properly, OR
     - The skill didn't block non-worktree execution
   - The hard rule ("Sub-agents NEVER push to main") was stated but not enforced via process gates.

---

## Failure Modes & Gaps

| Gap | Severity | Orchestrator Responsibility | Agent Responsibility |
|-----|----------|------------------------------|----------------------|
| Phase 3 prep skipped (no branch/status prep) | Critical | ✗ Orchestrator error | — |
| Worktree creation not blocking | High | ✗ Dispatch prompt design | ✗ Agent should fail if unable to worktree |
| Return message not validated | High | ✗ No validation gate | ✓ Agent returned correct format? Unclear |
| Hard rules not bolded/emphasized in prompt | Medium | ✗ Prompt clarity | ✓ Agent should prioritize hard rules |
| No pre-dispatch checklist | Medium | ✗ Process design | — |

---

## Key Findings

### 1. Orchestrator Skipped Phase 3 Prep
The spec clearly states:
```
Phase 3 — Dispatch sub-agents in parallel

**Per-Task prep (before dispatch):**
  - Compute branch = task/{NN}-{slug}
  - Compute worktree = path
  - Move issue Status Backlog → In progress
```

**What the orchestrator did:** Jumped to Agent dispatch without this prep.

**Result:** No branches existed; no status was set; agents found themselves on main with no guard rails.

### 2. Dispatch Prompt Lacked Blocking Enforcement
The ImplementerPrompt instructed:
```
Set up your worktree:
  cd C:/Users/nagal/Documents/ai_projects/kanban
  git worktree add ../kanban-worktrees/task-{NN} -b task/{NN}-{slug}
  cd ../kanban-worktrees/task-{NN}
```

**Problem:** This was a soft instruction ("Set up..."), not a hard gate. Agents could parse the prompt, skip the worktree step, and work directly on main.

**What should have happened:** The prompt should have used a blocking pattern:
```
BLOCKING STEP 1: Create worktree.
If this step fails or is skipped, STOP and return a "blocked" error.
Only proceed to implementation after worktree is confirmed.
```

### 3. Return Messages Were Not Validated
Agent #23's return: `done — committed c00c6b8 on main`
Expected format: `done — committed <sha> on task/23-markdown-component`

**No validation occurred.** The orchestrator should have checked:
```
IF return message contains "on main" THEN halt and error.
IF return message doesn't match "on task/{NN}-..." THEN halt and error.
```

### 4. Superpowers Invocation Unclear in Agents
The ImplementerPrompt mentions:
```
You MUST invoke `superpowers:test-driven-development` for the implementation loop.
...
Use `superpowers:using-git-worktrees` for worktree discipline.
```

**Question:** Did the agents actually invoke these? Did the superpowers enforce the discipline, or did agents ignore them?

**Finding:** The superpowers should be invoked at the START, not as an afterthought, and they should BLOCK non-compliant execution.

---

## Corrective Actions

### Immediate (for Wave 2)

#### 1. **Pre-Dispatch Checklist (Blocking)**
Before dispatching any agent, orchestrator MUST:
```yaml
For each selected Task:
  - [ ] Compute branch name: task/{NN}-{slug}
  - [ ] Compute worktree path: kanban-worktrees/task-{NN}
  - [ ] Update issue Status: Backlog → In progress (via gh project item-edit)
  - [ ] Log completion of all 3 items before proceeding to dispatch
```
**Owner:** Orchestrator  
**Timeline:** Implement before Wave 2

#### 2. **Enforce Worktree Creation as BLOCKING First Step**
Revise ImplementerPrompt (embedded in orchestrator code):
```markdown
## ⚠️ HARD RULES (Non-negotiable)

1. **BLOCKING STEP 1:** Create worktree immediately.
   DO NOT proceed to any implementation until this is complete.
   
   $ cd C:/Users/nagal/Documents/ai_projects/kanban
   $ git worktree add ../kanban-worktrees/task-{NN} -b task/{NN}-{slug}
   $ cd ../kanban-worktrees/task-{NN}
   
   If `git worktree add` fails → STOP. Return: `blocked — worktree creation failed: <error>`
   If you are not in the worktree directory → STOP. Return: `blocked — not in worktree`

2. **NEVER commit to main.** All commits go to task/{NN}-{slug} only.
   Verify with: `git branch --show-current`
   If output is "main" → STOP and return: `blocked — on main branch, not task branch`

3. **Return message format (EXACT):**
   MUST be: `done — committed <sha> on task/{NN}-<slug>`
   NEVER: `done — committed <sha> on main`
   If you cannot match this format, return: `blocked — <reason>`
```
**Owner:** Orchestrator (in dispatch template)  
**Timeline:** Implement before Wave 2  
**Validation:** Superpowers should enforce; orchestrator validates return message format

#### 3. **Add Return Message Validation Gate**
After each agent completes, orchestrator MUST validate:
```python
IF "on main" in return_message OR "on main branch" in return_message:
  → HALT wave, post issue comment: "implementation failed — agent committed to main"
  → Mark task status: In progress (stuck)
  → DO NOT proceed to Phase 4
  
IF not matches "done — committed <sha> on task/<NN>-" pattern:
  → HALT wave, same as above
```
**Owner:** Orchestrator  
**Timeline:** Implement in Phase 3 → Phase 4 gate

#### 4. **Invoke Superpowers Explicitly at Agent Start**
Revise ImplementerPrompt to require explicit invocation BEFORE any other action:
```markdown
## Required Superpowers (Invoke Before Implementation)

You MUST invoke the following skills and **wait for completion** before proceeding:

1. `superpowers:using-git-worktrees` — Ensure worktree discipline throughout
2. `superpowers:test-driven-development` — TDD loop for all implementation
3. `superpowers:verification-before-completion` — Verify all AC before declaring done

Do not begin implementation until all three are active.
```
**Owner:** Orchestrator + superpowers design  
**Timeline:** Implement before Wave 2

#### 5. **Document Hard Rules Prominently**
Create a `ORCHESTRATION_HARD_RULES.md` file:
```markdown
# Orchestration Hard Rules

## For Sub-Agents

1. **Always create worktree first.** Before any code edit, create the task worktree.
2. **Never commit to main.** All commits go to task/{NN}-slug branch only.
3. **Always run verification before declaring done.** All AC must pass tests.
4. **Return message must match exact format.** `done — committed <sha> on task/<NN>-<slug>`
5. **If blocked, return immediately.** `blocked — <reason>` stops the task.

## For Orchestrator

1. **Always do Phase 3 prep before dispatch.** Status updates, branch prep, worktree paths.
2. **Always validate return messages.** Check format before accepting completion.
3. **Never skip validation gates.** A "done" that doesn't match spec is a failure.
4. **Always halt on hard-rule violations.** Don't try to recover; surface the error.
```
**Owner:** Orchestrator author  
**Timeline:** Create before Wave 2

---

## Recommendations for Future Waves

### Process Improvements

1. **Create pre-dispatch script** (PowerShell or bash) that performs checklist automatically:
   - Queries issue status
   - Updates status via gh API
   - Logs output
   - Only proceeds if all 3 items complete

2. **Implement return-message validation as a gate:**
   - Regex pattern: `done — committed [a-f0-9]{7} on task/\d+-`
   - Reject anything else immediately
   - Log rejection as incident

3. **Add periodic sanity checks during Wave execution:**
   - After each agent returns, verify branch exists in git
   - Verify commit is on the branch, not on main
   - Verify no new commits appeared on main unexpectedly

4. **Design superpowers to be self-enforcing:**
   - `superpowers:using-git-worktrees` should BLOCK execution if:
     - Worktree doesn't exist
     - Current directory is not the worktree
     - Attempts to commit to main are detected
   - Return error immediately; don't let agent continue

5. **Create an agent-side checklist:**
   - Agents should verify their own execution before returning
   - Pre-return check: confirm branch name, verify commits are off main, verify all tests pass
   - Return `blocked` if any check fails

### Questions for Orchestrator/Superpowers Design

1. **Should the orchestrator pre-create worktrees**, or should agents do it?
   - Current design: agents create worktrees
   - Alternative: orchestrator creates them, agents just use them
   - Benefit of pre-create: orchestrator can validate they exist before dispatch

2. **Should superpowers enforce hard rules with hard blocks**, or just advisory?
   - Current state: unclear if superpowers enforced anything
   - Recommendation: make them enforcers, not advisors

3. **Should we require agents to invoke superpowers explicitly**, or should they be auto-applied?
   - Current state: agents "MUST invoke" but unclear if they did
   - Recommendation: auto-apply at agent startup, not optional

---

## Recovery Summary

| Task | Action | Status |
|------|--------|--------|
| Main reset | `git reset --hard 91b1c7d` | ✓ Complete |
| #23 status reset | Backlog status restored | ✓ Complete |
| #25 status reset | Backlog status restored | ✓ Complete |
| #28 status | Left at "In progress" | ✓ Correct |
| Worktree cleanup | N/A (none were created) | ✓ N/A |
| Wave re-entry | Ready for Wave 2 with corrective actions | — |

---

## Sign-Off

**Incident Date:** 2026-05-01  
**Investigation Completed:** 2026-05-01  
**Recovery Status:** Complete  
**Ready for Retry:** Yes (after Action Items 1–5 implemented)

**Next Steps:**
1. Implement pre-dispatch checklist (Action Item 1)
2. Revise ImplementerPrompt with hard-rule blocking (Action Item 2)
3. Deploy return-message validator (Action Item 3)
4. Update superpower invocation requirements (Action Item 4)
5. Document hard rules file (Action Item 5)
6. Re-run Wave 1 with three selected tasks (#23, #25, #28)
