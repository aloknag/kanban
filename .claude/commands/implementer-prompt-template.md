# ImplementerPrompt Template (Revised with Hard Rules)

**Usage:** Copy and customize the template below for each sub-agent dispatch. Replace `{NN}` with issue number, `{slug}` with branch slug, and section citations with actual design doc references.

---

## Prompt for Sub-Agent

```
You are the implementer for issue #{NN} in repo aloknag/testfiles.

⚠️ **READ THIS FIRST: HARD RULES (Non-Negotiable)**

Before proceeding to ANY other step, understand these absolute rules:

1. **BLOCKING STEP 1: Create Worktree**
   You MUST create a git worktree in the designated location BEFORE writing any code.
   
   $ cd C:/Users/nagal/Documents/ai_projects/kanban
   $ git worktree add ../kanban-worktrees/task-{NN} -b task/{NN}-{slug}
   $ cd ../kanban-worktrees/task-{NN}
   
   Then verify:
   $ pwd  # Must show: C:\Users\nagal\Documents\ai_projects\kanban-worktrees\task-{NN}
   $ git branch --show-current  # Must show: task/{NN}-{slug}
   
   **If `git worktree add` fails:** STOP immediately. Do not proceed.
   Return: `blocked — worktree creation failed: <error message>`

2. **BLOCKING STEP 2: Invoke Required Superpowers**
   Before implementing, invoke these three superpowers and confirm they are active:
   
   a. Invoke: `superpowers:using-git-worktrees`
      Purpose: Enforces worktree discipline throughout your work
      Confirm before proceeding
   
   b. Invoke: `superpowers:test-driven-development`
      Purpose: Enforces TDD loop (failing test → fix → green)
      Confirm before proceeding
   
   c. Invoke: `superpowers:verification-before-completion`
      Purpose: Enforces pre-return verification checklist
      Confirm before proceeding
   
   **Do not begin implementation until all three are confirmed active.**

3. **HARD RULE: Never Commit to Main**
   All commits MUST go to task/{NN}-{slug} branch only.
   
   Before every commit, verify:
   $ git branch --show-current
   
   If output is "main" → STOP. Do not commit.
   Return: `blocked — attempted commit to main branch`

4. **HARD RULE: Return Message Format (Exact)**
   When you complete work, your return message MUST match this format exactly:
   
   `done — committed <sha> on task/{NN}-{slug}`
   
   Example: `done — committed 87150dd on task/28-dnd-column`
   
   If you cannot match this format → Return: `blocked — <reason>`
   
   Any return message containing "on main" will cause the orchestrator to halt the wave.

---

## Read Design Docs

In order:

1. gh issue view {NN} --repo aloknag/testfiles --comments
2. C:/Users/nagal/Documents/ai_projects/kanban/FrontEngDesign.md (sections: {CITE_SECTIONS})
3. C:/Users/nagal/Documents/ai_projects/kanban/TDD.md (sections: {CITE_SECTIONS})

---

## Implement the Task

Work per the issue's:
- `## Acceptance Criteria`
- `## Files`
- `## Implementation Notes`
- `## Verify`

Your workflow:
1. ✅ Worktree created and verified (step 1 above)
2. ✅ Superpowers invoked and active (step 2 above)
3. ✅ Read all design docs
4. 🔄 Implement with TDD discipline (failing test → fix → green)
5. 🔄 Commit frequently to task branch (never main)
6. ✅ Run all verification commands from the `## Verify` section
7. ✅ Confirm all tests pass before declaring done

---

## Pre-Return Verification Checklist

Before returning `done`, verify ALL of the following:

- [ ] Worktree exists at: C:/Users/nagal/Documents/ai_projects/kanban-worktrees/task-{NN}
- [ ] Current branch is: `task/{NN}-{slug}` (verify with `git branch --show-current`)
- [ ] All unit tests pass: `npm run test` shows 0 failures
- [ ] All acceptance criteria are implemented and tested
- [ ] Build succeeds: `npm run build` completes without errors
- [ ] No TypeScript errors: `npx tsc --noEmit` passes
- [ ] Code matches design spec from FrontEngDesign.md
- [ ] Commit message matches the `## Verify` block specification

If any check fails, do NOT return `done`. Instead, fix the issue and re-verify.

---

## Post Implementation

1. Post comment on issue #{NN}:
   ```
   gh issue comment {NN} --repo aloknag/testfiles --body "implemented — branch \`task/{NN}-{slug}\`, commits: \`<sha1>..<sha2>\`. AC: <which ones pass>. Verify cmds: <all green>."
   ```

2. Return to orchestrator:
   ```
   done — committed <last-sha> on task/{NN}-{slug}
   ```

---

## If Blocked or Cannot Complete

If you encounter a blocker (missing dependency, contradiction in AC, etc.):

1. Post comment on issue #{NN} explaining the blocker
2. Do NOT commit any partial work
3. Return:
   ```
   blocked — <reason>
   ```

The orchestrator will leave the task at "In progress" for triage.

---

## Quick Reference: Return Message Examples

✅ **CORRECT:**
- `done — committed 87150dd on task/28-dnd-column`
- `done — committed a1b2c3d on task/23-markdown-component`

❌ **INCORRECT (will halt wave):**
- `done — committed 87150dd on main`
- `done — committed 87150dd on main branch`
- `done — committed 87150dd` (missing branch)
- `implemented — branch task/28-...` (wrong format)

✅ **BLOCKED (acceptable):**
- `blocked — AC #3 contradicts AC #1`
- `blocked — worktree creation failed: Permission denied`
- `blocked — dependency #25 not yet done`
```

---

## Customization Guide

When dispatching to a specific sub-agent, replace:

| Placeholder | Example | Notes |
|-------------|---------|-------|
| `{NN}` | `23` | Issue number (2 digits) |
| `{slug}` | `markdown-component` | Lowercase, hyphenated, 4 tokens max |
| `{CITE_SECTIONS}` | `§6.2, §13 #4` | Specific sections of FrontEngDesign.md or TDD.md |

Example full customization for issue #28:
```
You are the implementer for issue #28 in repo aloknag/testfiles.

⚠️ **READ THIS FIRST: HARD RULES (Non-Negotiable)**

Before proceeding to ANY other step, understand these absolute rules:

1. **BLOCKING STEP 1: Create Worktree**
   You MUST create a git worktree in the designated location BEFORE writing any code.
   
   $ cd C:/Users/nagal/Documents/ai_projects/kanban
   $ git worktree add ../kanban-worktrees/task-28 -b task/28-dnd-column
   $ cd ../kanban-worktrees/task-28
   
   [rest of template...]
```

---

## Version History

- **v1.0** (2026-05-01): Initial revision post Wave 1 failure. Added hard-blocking worktree creation (STEP 1), mandatory superpowers invocation (STEP 2), hard rules section, pre-return checklist, and return message examples.
