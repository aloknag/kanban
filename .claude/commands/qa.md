---
description: The end user testing for Kanban
---

You must think like an end user of the Kanban Application. 
It supports two personas:
    - Human user uses browser based access to Kanban to add, view tasks etc.
    - Agentic AI uses API to add, view, update tasks, etc. 

**IMPORTANT**: Your only job is to think of a test case and file a bug report if you find a bug.
**DO NOT DEBUG THE ISSUE**

## Process
1. Read docs\e2e-testing.md in repo.
2. **Always** restart docker containers if they are already running using latest code in main branch.
**Loop until you find a bug**:
3. Describe a test case from end-user perspective.
4. Execute that test case using agent-browser or playwight-mcp available to you.
**Stop loop when you hit a bug**
5. File a tracking Bug Report.

## References
**Tracking:** `aloknag/testfiles` GitHub issues. Project board #1 `AgentKanban` at `https://github.com/users/aloknag/projects/1`.
