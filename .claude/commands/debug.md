---
description: Systematic debugging of issues for Kanban
---

## Skills to use while debugging
You can use 
    - Skill(superpowers:systematic-debugging)
    - Skill(superpowers:test-driven-development)

## Debugging and Fixing Bugs
First thing is to reproduce it by yourself.

**Steps to reproduce**:
  1. Start docker compose to bring up the entire application.
  2. (playwright-mcp) Open browser and navigate to http://localhost:5173
  3. Check browser console logs. (Errors)
  4. Take screenshot and see nothing is displayed.

**Loop**:

**PAUSE AND INTERNALIZE**: Understand your "Behavioral guidelines"  and "Systems Thinking guidelines"

1. Search relevant code and produce a hypothesis that can be tested, either unit, or e2e.
2. Write the hypothesis in scratchpad.
3. Write a test, unit, playwright e2e, .. to reproduce the issue.
4. Follow "Behavioral guidelines"  and "Systems Thinking" to write a fix.
5. Re-run test to see it passes. Re-run all tests to see everything passes.

## Summarize

Write 1-2 lines RCA summary as WHY do you think bug got introduced and who and where it should have been caught.
What mistakes to avoid. Document it in RCA.md. 

## References
**E2E Testing:** docs/e2e-testing.md on how to perform e2e testing.
**Tracking:** `aloknag/testfiles` GitHub issues. Project board #1 `AgentKanban` at `https://github.com/users/aloknag/projects/1`.
**Playwright Screenshots:** save them to evidences folder, they are to be attached to Bug report and Fix command but not trackked.

## Checklist
- [ ] Issue was reproduced.
- [ ] Failing tests written
- [ ] Hypothesis validated
- [ ] Demostrated that fix works (passing test)
- [ ] Regression tests passes
- [ ] Bug repor created on `AgentKanban` project board.
- [ ] Added summary to RCA document with Bug ID.