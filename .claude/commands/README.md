# AgentBoard Orchestration Commands & Resources

**Directory:** `.claude/commands/`  
**Purpose:** Templates, scripts, and guides for orchestrating parallel sub-agent implementation waves

---

## Quick Start: Running Wave 2

```bash
# 1. For each task in priority order:
#    Run the pre-dispatch checklist
.\pre-dispatch-checklist.ps1 -TaskNumber 23 -TaskSlug "markdown-component"

# 2. If checklist passes, dispatch the agent using the ImplementerPrompt template
#    (see implementer-prompt-template.md for customization guide)

# 3. When agent returns, validate the return message automatically

# 4. Proceed to code review, merge, etc.
```

---

## Resources

### 1. **ORCHESTRATION_HARD_RULES.md**
**What:** Absolute, non-negotiable rules for orchestrator and sub-agents  
**When:** Read before and during every wave  
**Key sections:**
- Sub-Agent Rule 1: Create worktree FIRST (blocking)
- Sub-Agent Rule 4: Return message format (exact)
- Orchestrator Rule 1: Phase 3 prep is mandatory
- Orchestrator Rule 2: Validate return messages (blocking gate)

**Use case:** Reference when an agent's behavior seems off-spec, or to brief new sub-agents.

---

### 2. **pre-dispatch-checklist.ps1**
**What:** PowerShell script that validates all Phase 3 prep requirements  
**When:** Run BEFORE dispatching each sub-agent  
**Usage:**
```powershell
.\pre-dispatch-checklist.ps1 -TaskNumber 23 -TaskSlug "markdown-component"
```

**What it checks:**
- [ ] Git repo is on main and clean
- [ ] Worktree path is free
- [ ] Branch doesn't already exist
- [ ] Issue exists in GitHub project
- [ ] Issue status is Backlog
- [ ] Updates issue status to In progress

**Exit codes:**
- `0` — Checklist passed, ready to dispatch
- `1` — Checklist failed, fix issues before dispatching

---

### 3. **implementer-prompt-template.md**
**What:** Enhanced ImplementerPrompt with hard-rule blocking and superpower invocation requirements  
**When:** Customize and use when dispatching sub-agents  
**Key additions (vs. old template):**
- Hard rules section (blocking worktree creation, no main commits, return format)
- Mandatory superpower invocation (STEP 2)
- Pre-return verification checklist
- Return message examples (correct vs. incorrect)
- Customization guide with placeholders

**How to use:**
1. Open template
2. Replace `{NN}` with issue number, `{slug}` with branch slug
3. Replace `{CITE_SECTIONS}` with relevant FrontEngDesign/TDD sections
4. Copy full prompt into Agent dispatch call
5. Send to sub-agent

---

### 4. **superpowers-invocation-guide.md**
**What:** Guide for sub-agents to understand, invoke, and confirm three mandatory superpowers  
**When:** Sub-agents reference this to understand the invocation sequence  
**The three superpowers:**
1. `superpowers:using-git-worktrees` — Enforces worktree discipline
2. `superpowers:test-driven-development` — Enforces TDD loop
3. `superpowers:verification-before-completion` — Enforces pre-return verification

**Key sections:**
- Overview and sequence
- Individual superpower documentation
- Full example walkthrough (Issue #23)
- Common issues & recovery
- Pre-return checklist for agents

**How to use:**
- Provide link to sub-agents in their dispatch prompt, or
- Verbally reference it: "See superpowers-invocation-guide.md in the orchestration commands directory"

---

### 5. **post-mortem-wave-1-failure.md**
**What:** Complete incident report from Wave 1 (not a resource, but context)  
**When:** Reference to understand what went wrong and why these fixes were needed  
**Key findings:**
- Root cause: Orchestrator skipped Phase 3 prep; agents lacked enforcement
- Five corrective actions identified and implemented

---

## Orchestrator Workflow (Wave 2+)

### Phase 1: Scan & Select
```bash
gh issue list --repo aloknag/testfiles --label Task --state open ...
# (Existing workflow, no changes)
```

### Phase 2: Bootstrap (if T0)
```bash
# (Existing workflow, no changes)
```

### **Phase 3: Pre-Dispatch & Dispatch (UPDATED)**

For each selected task:

1. **Run pre-dispatch checklist:**
   ```powershell
   .\pre-dispatch-checklist.ps1 -TaskNumber {NN} -TaskSlug {slug}
   
   # If exit code 0 → proceed to step 2
   # If exit code 1 → fix issues and retry
   ```

2. **Customize ImplementerPrompt:**
   ```markdown
   # From: implementer-prompt-template.md
   - Replace {NN}, {slug}, {CITE_SECTIONS}
   - Include reference to superpowers-invocation-guide.md
   - Include reference to ORCHESTRATION_HARD_RULES.md
   ```

3. **Dispatch sub-agent:**
   ```
   Agent(
     description: "Implement T{X}.{Y} — {title} (issue #{NN})",
     subagent_type: "general-purpose",
     prompt: <customized ImplementerPrompt>
   )
   ```

4. **Validate return message:**
   ```
   IF return matches "done — committed <sha> on task/<NN>-<slug>":
     → Proceed to Phase 4 (code review)
   ELSE IF return mentions "on main":
     → HALT wave (hard rule violation)
   ELSE IF "blocked":
     → Post comment, mark stuck, continue next task
   ELSE:
     → HALT wave (invalid format)
   ```

### Phase 4: Review-Fix Loop
```bash
# (Existing workflow, uses superpowers:requesting-code-review + receiving-code-review)
```

### Phase 5: Merge
```bash
# (Existing workflow, squash merge to main)
```

### Phase 6: Summary
```bash
# (Existing workflow, print summary table)
```

---

## File Structure

```
.claude/
├── ORCHESTRATION_HARD_RULES.md          ← Read first, reference constantly
├── post-mortem-wave-1-failure.md        ← Context for why fixes were needed
└── commands/
    ├── README.md                        ← You are here
    ├── implement.md                     ← Main orchestration spec
    ├── pre-dispatch-checklist.ps1       ← Run before each dispatch
    ├── implementer-prompt-template.md   ← Customize for each agent
    ├── superpowers-invocation-guide.md  ← Sub-agent reference
    └── validate-return-message.ps1      ← [Future] Automated validation
```

---

## Key Changes from Wave 1

| Aspect | Wave 1 | Wave 2+ |
|--------|--------|---------|
| Phase 3 prep | ❌ Skipped | ✅ Mandatory (pre-dispatch-checklist.ps1) |
| Worktree enforcement | ❌ Soft instruction | ✅ Hard block in STEP 1 |
| Superpower invocation | ❌ Mentioned, not enforced | ✅ STEP 2, mandatory, explicit sequence |
| Return message validation | ❌ None | ✅ Gate before Phase 4 |
| Hard rules documentation | ❌ Scattered | ✅ Centralized in ORCHESTRATION_HARD_RULES.md |

---

## Checklist: Ready for Wave 2?

- [ ] Read ORCHESTRATION_HARD_RULES.md
- [ ] Understand Phase 3 pre-dispatch checklist requirements
- [ ] Know how to run pre-dispatch-checklist.ps1
- [ ] Have implementer-prompt-template.md open for customization
- [ ] Understand three mandatory superpowers (guide available for sub-agents)
- [ ] Know how to validate return messages (regex: `done — committed [a-f0-9]{7} on task/\d+-`)
- [ ] Understand halt conditions (hard rule violations, invalid format)
- [ ] Created a new post-mortem or incident log for Wave 2 (if needed)

---

## FAQ

**Q: What if the pre-dispatch checklist fails?**  
A: Fix the issue (usually: update issue status, verify repo state) and re-run. Don't dispatch until it passes.

**Q: What if a sub-agent doesn't invoke superpowers?**  
A: The superpower invocation is now in the REQUIRED ImplementerPrompt. If they skip it, their work will not be verified properly. Halt and ask them to re-do with superpowers active.

**Q: What if a return message says "done — committed X on main"?**  
A: This is a hard rule violation. Halt the wave, reset main, move task back to Backlog, create a post-mortem note.

**Q: Can I run multiple waves in parallel?**  
A: No. Each wave operates sequentially: Phase 3 (dispatch all) → Phase 4 (review all) → Phase 5 (merge all). Only one wave at a time.

**Q: Where do I document the return message validation logic?**  
A: In validate-return-message.ps1 (to be implemented) or inline in the orchestrator workflow.

---

## Future Improvements

- [ ] Implement validate-return-message.ps1 for automated return validation
- [ ] Add return message format examples to all agent prompts
- [ ] Create a wave execution dashboard (optional, for visibility)
- [ ] Automate Phase 5 merge logic (squash, status update, issue close)
- [ ] Implement a "halt and resume" mechanism for long waves

---

**Last Updated:** 2026-05-01  
**Version:** 1.0 (Post-Wave-1 Recovery)  
**Maintained By:** AgentBoard Orchestration Team
