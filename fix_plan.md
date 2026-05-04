# Implementation Plan for Code Review Fixes

## Phase 1: API & Backend Data Integrity (Critical/High Issues)
- [ ] CR-01: Fix create_column unchecked name
- [ ] CR-02: Fix create_task unchecked title/column_id
- [ ] CR-03: Fix update_task 500 on missing task
- [ ] CR-04: Fix create_epic unchecked title/content_path
- [ ] CR-05: Fix update_epic 500 on missing epic
- [ ] CR-06: Fix database FK enforcement (database.py)
- [ ] CR-08: Fix update_column empty name
- [ ] CR-09: Fix create_task empty title
- [ ] CR-10: Fix slug race condition (Atomic transactions/Retry)
- [ ] CR-11: Fix update_task title type check
- [ ] CR-12: Fix update_task content_path validation
- [ ] CR-13: Remove hardcoded column ID 3
- [ ] CR-14: Fix update_epic column_id validation
- [ ] CR-15: Fix update_epic empty title
- [ ] CR-16: Fix update_epic content_path validation
- [ ] CR-17: Fix create_task_comment orphan check
- [ ] CR-18: Fix create_epic_comment orphan check
- [ ] CR-20: Fix DELETE returns 204 for missing
- [ ] CR-23: Connection pool/retry

## Phase 2: Security & API Contract (Medium)
- [ ] CR-21: CORS wildcard
- [ ] CR-22: PATCH response incomplete data

## Phase 3: Frontend (UI/UX, Types, React)
- [ ] CR-07: Fix SortableTaskCard draggable activation
- [ ] CR-19: Frontend API base URL
- [ ] CR-24: Fix task update_at availability
- [ ] CR-25: Fix Markdown mermaid access
- [ ] CR-26: Fix MermaidBlock ID cleanup
- [ ] CR-27: Fix JournalCompose id collision
- [ ] CR-28/29: Fix route param NaN
- [ ] CR-30: Fix TaskCard epic slug derivation
- [ ] CR-34: Fix Column type
- [ ] CR-38: Fix EpicDetail/TaskDetail type casts
- [ ] CR-39: Fix Epics polling
