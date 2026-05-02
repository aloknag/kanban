# Superpowers Invocation Guide for Sub-Agents

**Purpose:** Ensure sub-agents explicitly invoke required superpowers at the start of implementation, before writing any code.

**Audience:** Sub-agents (e.g., general-purpose agents dispatched for task implementation)

---

## Overview

Three superpowers MUST be invoked at the start of every implementation task:

1. **`superpowers:using-git-worktrees`** — Enforces worktree discipline and safety
2. **`superpowers:test-driven-development`** — Enforces TDD loop (failing test → fix → green)
3. **`superpowers:verification-before-completion`** — Enforces pre-return verification

These are **not optional**. The orchestrator will check that they were invoked before accepting a completed implementation.

---

## Sequence: When to Invoke

```
STEP 1: Receive the ImplementerPrompt
        ↓
STEP 2: Understand hard rules (worktree, return format, superpowers requirement)
        ↓
STEP 3: → Invoke superpowers:using-git-worktrees
        → Wait for confirmation + guidance
        ↓
STEP 4: → Invoke superpowers:test-driven-development
        → Wait for confirmation + guidance
        ↓
STEP 5: → Invoke superpowers:verification-before-completion
        → Wait for confirmation + guidance
        ↓
STEP 6: All three confirmed active?
        YES → Proceed to implementation
        NO → Halt and report `blocked — superpowers not active`
        ↓
STEP 7: Begin implementation (TDD-guided, in worktree, per design spec)
        ↓
STEP 8: Finish implementation, verify all tests pass
        ↓
STEP 9: Run superpowers:verification-before-completion checks
        ↓
STEP 10: Return `done — committed <sha> on task/<NN>-<slug>`
```

---

## Individual Superpower Invocations

### 1. `superpowers:using-git-worktrees`

**When:** Immediately after reading the hard rules and ImplementerPrompt.

**Invoke by:** Using the Skill tool
```
/using-git-worktrees
```

Or in text form:
```
I am about to implement issue #{NN}. Please invoke superpowers:using-git-worktrees
to ensure my worktree is set up correctly and I follow worktree discipline throughout.
```

**What it does:**
- Guides you through creating the worktree
- Verifies you're in the correct directory
- Confirms the branch name is correct
- Provides safety checks for worktree operations (switch, commit, cleanup)
- Blocks unsafe operations (e.g., committing to main)

**Confirmation to wait for:**
- "Worktree created at: <path>"
- "Current branch: task/<NN>-<slug>"
- "Worktree environment verified"

**If this superpower fails:**
- Return `blocked — worktree setup failed: <error>`
- Do NOT proceed to implementation
- Do NOT attempt to work on main branch

---

### 2. `superpowers:test-driven-development`

**When:** After worktree setup is confirmed, before writing implementation code.

**Invoke by:** Using the Skill tool
```
/test-driven-development
```

Or in text form:
```
I am implementing issue #{NN} in a worktree. Please invoke 
superpowers:test-driven-development to guide my implementation with TDD discipline.
```

**What it does:**
- Guides you through TDD workflow: failing test → fix → green
- Enforces test-first approach for all code changes
- Helps you understand acceptance criteria as tests
- Validates that tests pass before proceeding to next AC

**Workflow per superpower:**
```
For each acceptance criterion (AC):
  1. Write a failing test that covers the AC
  2. Run test → confirms it fails
  3. Implement the code
  4. Run test → confirms it passes
  5. Commit the code
  6. Move to next AC
```

**Confirmation to wait for:**
- "TDD discipline enabled"
- "Failing test written: <test name>"
- "Test passes: <test name>"
- "Ready for next AC"

**If this superpower fails:**
- Return `blocked — TDD setup failed`
- Review the failure with the superpower
- Do NOT proceed to ad-hoc implementation

---

### 3. `superpowers:verification-before-completion`

**When:** After implementation is complete and all tests pass locally.

**Invoke by:** Using the Skill tool
```
/verification-before-completion
```

Or in text form:
```
I have finished implementing issue #{NN}. All tests pass locally.
Please invoke superpowers:verification-before-completion to verify 
I'm ready to return done.
```

**What it does:**
- Provides a checklist of verification steps
- Guides you through running all verification commands
- Confirms that:
  - All unit tests pass
  - All acceptance criteria are met
  - Build succeeds
  - TypeScript compiles
  - Return message is in correct format
- Blocks return if any check fails

**Pre-Invocation Checklist (before asking superpower):**
- [ ] All unit tests pass: `npm run test`
- [ ] All acceptance criteria implemented
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript check passes
- [ ] Commit message matches spec
- [ ] Return message ready: `done — committed <sha> on task/<NN>-<slug>`

**Confirmation to wait for:**
- "All verification checks passed"
- "Ready to return done"

**If this superpower fails:**
- Do NOT return `done`
- Fix the failing check (e.g., failing test, incorrect return format)
- Re-invoke verification superpower
- Only return `done` after all checks pass

---

## Example: Full Invocation Sequence

### Scenario: Implementing Issue #23 (Markdown component)

**Step 1: Receive ImplementerPrompt**
```
You are the implementer for issue #23 in repo aloknag/testfiles.

⚠️ **READ THIS FIRST: HARD RULES (Non-Negotiable)**

1. **BLOCKING STEP 1: Create Worktree**
   $ cd C:/Users/nagal/Documents/ai_projects/kanban
   $ git worktree add ../kanban-worktrees/task-23 -b task/23-markdown-component
   ...

2. **BLOCKING STEP 2: Invoke Required Superpowers**
   a. Invoke: `superpowers:using-git-worktrees`
   b. Invoke: `superpowers:test-driven-development`
   c. Invoke: `superpowers:verification-before-completion`
   
   Do not begin implementation until all three are confirmed active.
```

**Step 2: Understand hard rules and requirements**
- Worktree must be created in `kanban-worktrees/task-23`
- Branch must be `task/23-markdown-component`
- Must invoke three superpowers before coding
- Return message must be: `done — committed <sha> on task/23-markdown-component`

**Step 3: Invoke worktree superpower**
```
I am implementing issue #23 (Markdown component). I need to set up a worktree.
Please invoke superpowers:using-git-worktrees to guide me.
```

**Superpower response (example):**
```
✓ Worktree superpower activated.

SETUP CHECKLIST:
1. Execute: git worktree add ../kanban-worktrees/task-23 -b task/23-markdown-component
2. Navigate to: C:/Users/nagal/Documents/ai_projects/kanban-worktrees/task-23
3. Verify: git branch --show-current (should show: task/23-markdown-component)

Ready? Confirm worktree is set up and I'll guide you through safety practices.
```

**You confirm:**
```
Worktree created at: C:/Users/nagal/Documents/ai_projects/kanban-worktrees/task-23
Current branch: task/23-markdown-component
Ready to proceed.
```

**Step 4: Invoke TDD superpower**
```
Worktree is ready. Now invoking superpowers:test-driven-development
to guide my implementation of the Markdown component.
```

**Superpower response (example):**
```
✓ TDD discipline activated.

IMPLEMENTATION WORKFLOW:
1. Read AC from issue #23
2. For each AC:
   a. Write failing test
   b. Run test (confirm fail)
   c. Implement code
   d. Run test (confirm pass)
   e. Commit
   f. Move to next AC

First AC: "exports <Markdown source={string} />"
Write a test that verifies this component exists and accepts a source prop.
When ready, paste the test code.
```

**You proceed with TDD:**
```
[Writing failing test for first AC...]
Test written: checks that Markdown component exports with source prop

Running: npm run test -- Markdown
Result: Test fails (component doesn't exist yet) ✓

[Implementing Markdown component...]
[Running test again...]
Result: Test passes ✓

[Moving to next AC...]
```

**Step 5: Invoke verification superpower**
```
All tests pass locally. All acceptance criteria are implemented.
Ready to verify before returning done.
Please invoke superpowers:verification-before-completion.
```

**Superpower response (example):**
```
✓ Verification superpower activated.

PRE-RETURN CHECKLIST:

[ ] All unit tests pass
    Run: npm run test
    Expected: 0 failures
    Actual: 16 passing

[ ] All acceptance criteria met
    AC 1: ✓ Exports <Markdown source={string} />
    AC 2: ✓ Component map includes h1, h2, code, pre, etc.
    AC 3: ✓ H1 auto-numbered as §1, §2, ...
    AC 4: ✓ Pre blocks have language label
    AC 5: ✓ Inline code has correct styling
    AC 6: ✓ Tests cover each element

[ ] Build succeeds
    Run: npm run build
    Expected: Success
    Actual: ✓

[ ] TypeScript compiles
    Run: npx tsc --noEmit
    Expected: No errors
    Actual: ✓

[ ] Return message format correct
    Format: done — committed <sha> on task/23-markdown-component
    Actual: done — committed c00c6b8 on task/23-markdown-component
    Status: ✓

ALL CHECKS PASSED. Ready to return done.
```

**Step 6: Return to orchestrator**
```
done — committed c00c6b8 on task/23-markdown-component
```

---

## Common Issues & Recovery

### Issue: Superpower not responding
**Recovery:**
1. Check that you invoked it correctly (using `/` or Skill tool)
2. Confirm the superpower name matches exactly
3. If still failing, return `blocked — superpower failed: <name>`

### Issue: Superpower blocks your action
**Recovery:**
1. Read the superpower's feedback carefully
2. Follow its guidance (e.g., fix failing test)
3. Re-invoke if needed
4. If truly blocked, return `blocked — <reason>`

### Issue: Unsure if superpower is "active"
**Recovery:**
1. A superpower is active once it responds and provides guidance
2. Continue following its guidance until it says "ready to proceed" or equivalent
3. Only move to the next superpower when current one is confirmed

### Issue: Return message doesn't match required format
**Before returning:**
1. Verify message: `done — committed <sha> on task/<NN>-<slug>`
2. Get the correct `<sha>`: run `git log -1 --oneline`
3. Confirm `<NN>` is the issue number
4. Confirm `<slug>` matches the branch name
5. Reformat message to match exactly
6. Return corrected message

---

## Checklist for Agents

Before returning to orchestrator, confirm:

- [ ] Received and understood ImplementerPrompt with hard rules
- [ ] Invoked `superpowers:using-git-worktrees` — confirmed active
- [ ] Invoked `superpowers:test-driven-development` — confirmed active
- [ ] Invoked `superpowers:verification-before-completion` — confirmed active
- [ ] All implementation done via TDD
- [ ] All tests pass
- [ ] All AC verified
- [ ] Return message format: `done — committed <sha> on task/<NN>-<slug>`
- [ ] Posted comment on issue with verification evidence
- [ ] Ready to return

---

## Version History

- **v1.0** (2026-05-01): Initial guide. Three mandatory superpowers, explicit invocation sequence, examples, checklist, common issues.
