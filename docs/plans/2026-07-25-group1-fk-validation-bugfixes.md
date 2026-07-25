# Group 1 — FK/Dependency Validation Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four backend bugs (GitHub #56, #57, #58, #59) that all share one root cause — `app/main.py` writes/deletes rows without validating that a referenced foreign key exists or has no dependents first, so SQLite's FK enforcement (`PRAGMA foreign_keys=ON`, set in `get_db()`) raises an uncaught exception that surfaces as an unhandled HTTP 500 instead of a clean 4xx.

**Architecture:** No new files, no routers, no shared framework — `app/main.py` is a single-file FastAPI app with all handlers defined inline in `create_app()`. Each fix adds an explicit `SELECT ... WHERE` existence/dependency check before the write, raising `HTTPException` with an appropriate 4xx status, mirroring the pattern FastAPI handler `update_task` already uses for `column_id` (main.py:281-285). One small shared helper (`_count_referencing`) is introduced for the two delete-with-dependents checks (#56, #57) since both need "how many rows in table X reference this id" and would otherwise duplicate the same `SELECT COUNT(*)` boilerplate twice.

**Tech Stack:** Python 3.12, FastAPI 0.109, aiosqlite 0.19, pytest + pytest-asyncio + httpx (in-process `AsyncClient` against the FastAPI app — no live server needed for these tests). Lint via `ruff`, type-check via `mypy --strict`.

## Global Constraints

- All changes are confined to `app/main.py` (single file, no new modules). This keeps the PR diff small (~60-90 lines across all four fixes, per prior code survey) and matches the "current worktree, one PR, under 500 lines" requirement.
- Every new validation error uses `HTTPException` with the same idiom already used elsewhere in the file (e.g. `raise HTTPException(status_code=400, detail="Invalid column_id")` at main.py:285) — no new exception classes or middleware.
- Do not touch #55 (task_count mismatch), #53 (column_id filter), #60 (oversized ID), #61 (empty column name) — those are Group 2, out of scope here.
- Do not touch #52 (undo/redo, already flagged INVALID by prior QA pass) or any frontend files (#54/#50/#51).
- Match existing test file conventions exactly: `tests/test_columns.py`, `tests/test_tasks.py`, `tests/test_epics.py` each use `tempfile.TemporaryDirectory()` + `init_database(data_folder)` + `create_app(data_folder)` + `httpx.AsyncClient` — new tests go in these same files, not new files.
- The four GitHub issues already carry QA-authored Playwright repro specs (`tests/e2e/bug_56_*.spec.js`, `bug_57_*.spec.js`, `bug_58_*.spec.js`, `bug_59_*.spec.js`) that use the `request` API-testing fixture (no browser needed). These are run as final acceptance verification against a live dev server in Task 5, in addition to the pytest unit tests used for the per-task TDD loop.

---

## File Structure

- Modify: `app/main.py` — add one module-level helper function (`_count_referencing`) and four handler-level fixes (`update_task`, `create_task`, `delete_column`, `delete_epic`).
- Modify: `tests/test_tasks.py` — add 3 tests (epic_id validation on PATCH, epic_id validation on POST, the exact #59 failed-create-then-valid-create repro).
- Modify: `tests/test_columns.py` — add 1 test (#56 delete-with-tasks → 409).
- Modify: `tests/test_epics.py` — add 1 test (#57 delete-with-tasks → 409).
- No new files.

---

### Task 1: `PATCH /api/tasks/{id}` rejects a non-existent `epic_id` (#58)

**Files:**
- Modify: `app/main.py:271-323` (`update_task` handler)
- Test: `tests/test_tasks.py` (append after `test_patch_task_changes_title`, line 161)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: nothing consumed by later tasks in this plan (Task 2 does the analogous fix in a different handler, independently).

- [ ] **Step 1: Write the failing test**

Append to `tests/test_tasks.py`:

```python
@pytest.mark.asyncio
async def test_patch_task_rejects_nonexistent_epic_id():
    """PATCH /api/tasks/{id} with a non-existent epic_id returns 400, not 500 (bug #58)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/tasks",
                json={
                    "title": "Task",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )
            task_id = create_response.json()["id"]

            response = await client.patch(
                f"/api/tasks/{task_id}",
                json={"epic_id": 999999}
            )
            assert response.status_code == 400
            assert response.json()["detail"] == "Invalid epic_id"

            # The task's epic_id must not have been corrupted by the failed request
            detail_response = await client.get(f"/api/tasks/{task_id}")
            assert detail_response.json()["epic_id"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/Scripts/pytest tests/test_tasks.py::test_patch_task_rejects_nonexistent_epic_id -v`
Expected: FAIL — currently returns 500 (unhandled FK constraint error), not 400.

- [ ] **Step 3: Write minimal implementation**

In `app/main.py`, inside `update_task` (currently lines 280-289), add an `epic_id` validation block mirroring the existing `column_id` block:

```python
            # Validate column_id if it's being updated
            if "column_id" in body:
                column_id = body["column_id"]
                cursor = await db.execute("SELECT id FROM columns WHERE id = ?", (column_id,))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid column_id")

            # Validate epic_id if it's being updated (null clears the epic link)
            if "epic_id" in body and body["epic_id"] is not None:
                epic_id = body["epic_id"]
                cursor = await db.execute("SELECT id FROM epics WHERE id = ?", (epic_id,))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid epic_id")

            # Validate title if it's being updated
            if "title" in body and not body["title"].strip():
                raise HTTPException(status_code=400, detail="Title cannot be empty")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/Scripts/pytest tests/test_tasks.py::test_patch_task_rejects_nonexistent_epic_id -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_tasks.py
git commit -m "fix(#58): PATCH /api/tasks/{id} rejects non-existent epic_id with 400"
```

---

### Task 2: `POST /api/tasks` validates `epic_id` instead of mislabeling the failure as `slug_collision` (#59)

**Files:**
- Modify: `app/main.py:188-233` (`create_task` handler)
- Test: `tests/test_tasks.py` (append after Task 1's test)

**Interfaces:**
- Consumes: nothing from Task 1 (independent handler).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_tasks.py`:

```python
@pytest.mark.asyncio
async def test_post_task_rejects_nonexistent_epic_id():
    """POST /api/tasks with a non-existent epic_id returns 400, not a mislabeled 500 slug_collision (bug #59)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/tasks",
                json={
                    "title": "Task with bad epic",
                    "content_path": "tasks/test.md",
                    "column_id": 1,
                    "epic_id": 999999,
                }
            )
            assert response.status_code == 400
            assert response.json()["detail"] == "Invalid epic_id"


@pytest.mark.asyncio
async def test_post_task_after_failed_create_does_not_500():
    """Exact QA repro for #59: a failed (400) create must not poison the next create into a false 500."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Step 1: intentionally invalid create (no content_path) — expect 400
            fail_response = await client.post(
                "/api/tasks",
                json={"title": "Bad create", "column_id": 1, "epic_id": "abc"}
            )
            assert fail_response.status_code == 400

            # Step 2: a similarly-shaped create right after, now with a valid
            # content_path but still an invalid (non-existent) epic_id
            ok_response = await client.post(
                "/api/tasks",
                json={
                    "title": "Good create",
                    "column_id": 1,
                    "epic_id": "abc",
                    "content_path": "tasks/test.md",
                }
            )
            assert ok_response.status_code == 400
            assert ok_response.json()["detail"] == "Invalid epic_id"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/Scripts/pytest tests/test_tasks.py::test_post_task_rejects_nonexistent_epic_id tests/test_tasks.py::test_post_task_after_failed_create_does_not_500 -v`
Expected: FAIL — both currently return 500 with `{"detail":"slug_collision"}`.

- [ ] **Step 3: Write minimal implementation**

In `app/main.py`, inside `create_task` (currently lines 202-204), add validation right after acquiring `db` and before the slug retry loop:

```python
        db = await get_db()
        try:
            epic_id = body.get("epic_id")
            if epic_id is not None:
                cursor = await db.execute("SELECT id FROM epics WHERE id = ?", (epic_id,))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid epic_id")

            now = datetime.now(timezone.utc).isoformat()
            # Retry loop guards against slug UNIQUE constraint collision under concurrency (CR-10)
            for attempt in range(10):
```

(The rest of the function is unchanged — `body.get("epic_id")` is still read again at the `INSERT` and in the response dict further down, which is fine since it's the same value we just validated.)

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/Scripts/pytest tests/test_tasks.py::test_post_task_rejects_nonexistent_epic_id tests/test_tasks.py::test_post_task_after_failed_create_does_not_500 -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_tasks.py
git commit -m "fix(#59): POST /api/tasks validates epic_id instead of mislabeling FK errors as slug_collision"
```

---

### Task 3: `DELETE /api/columns/{id}` rejects deletion while tasks or epics still reference it (#56)

**Files:**
- Modify: `app/main.py` — add module-level helper `_count_referencing` (place above `def create_app`, after the imports at line 11) and update `delete_column` (currently lines 153-161).
- Test: `tests/test_columns.py` (append after `test_reorder_columns_rejects_invalid_ids`, line 297)

**Interfaces:**
- Produces: `_count_referencing(db: aiosqlite.Connection, table: str, column: str, value: int) -> int` — an async helper that returns how many rows in `table` have `column == value`. Task 4 (`delete_epic`) reuses this exact function; its signature must not change.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_columns.py`:

```python
@pytest.mark.asyncio
async def test_delete_column_with_tasks_returns_409():
    """DELETE /api/columns/{id} returns 409, not 500, when the column still has tasks (bug #56)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            list_response = await client.get("/api/columns")
            todo_id = list_response.json()[0]["id"]

            await client.post(
                "/api/tasks",
                json={
                    "title": "Blocking task",
                    "content_path": "tasks/blocking.md",
                    "column_id": todo_id,
                }
            )

            response = await client.delete(f"/api/columns/{todo_id}")
            assert response.status_code == 409

            # Column must still exist — delete must not have partially applied
            list_response = await client.get("/api/columns")
            assert any(c["id"] == todo_id for c in list_response.json())


@pytest.mark.asyncio
async def test_delete_column_with_epic_returns_409():
    """DELETE /api/columns/{id} also blocks when an epic (not just a task) references it."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            list_response = await client.get("/api/columns")
            todo_id = list_response.json()[0]["id"]

            await client.post(
                "/api/epics",
                json={
                    "title": "Blocking epic",
                    "content_path": "epics/test.md",
                    "column_id": todo_id,
                }
            )

            response = await client.delete(f"/api/columns/{todo_id}")
            assert response.status_code == 409
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/Scripts/pytest tests/test_columns.py::test_delete_column_with_tasks_returns_409 tests/test_columns.py::test_delete_column_with_epic_returns_409 -v`
Expected: FAIL — currently returns 500 (unhandled FK constraint error) for the tasks case, and the epic case currently returns 204 (silently deletes the column, then the epic row becomes orphaned/inconsistent since epics.column_id has no cascade) — both are wrong.

- [ ] **Step 3: Write minimal implementation**

In `app/main.py`, add the helper above `def create_app` (after line 11, before line 14):

```python
async def _count_referencing(db: aiosqlite.Connection, table: str, column: str, value: int) -> int:
    """Count rows in `table` whose `column` equals `value` (FK dependency check)."""
    cursor = await db.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = ?", (value,))
    row = await cursor.fetchone()
    return row[0] if row else 0
```

Replace `delete_column` (lines 153-161):

```python
    @app.delete("/api/columns/{column_id}", status_code=204)
    async def delete_column(column_id: int):
        """Delete a column."""
        db = await get_db()
        try:
            task_count = await _count_referencing(db, "tasks", "column_id", column_id)
            epic_count = await _count_referencing(db, "epics", "column_id", column_id)
            if task_count or epic_count:
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot delete column: {task_count} task(s) and {epic_count} epic(s) still reference it",
                )
            await db.execute("DELETE FROM columns WHERE id = ?", (column_id,))
            await db.commit()
        finally:
            await db.close()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/Scripts/pytest tests/test_columns.py::test_delete_column_with_tasks_returns_409 tests/test_columns.py::test_delete_column_with_epic_returns_409 tests/test_columns.py::test_delete_column_removes_it -v`
Expected: PASS (including the pre-existing `test_delete_column_removes_it`, which deletes an empty column and must still return 204).

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_columns.py
git commit -m "fix(#56): DELETE /api/columns/{id} returns 409 when tasks or epics still reference it"
```

---

### Task 4: `DELETE /api/epics/{id}` rejects deletion while tasks still reference it (#57)

**Files:**
- Modify: `app/main.py:529-537` (`delete_epic` handler)
- Test: `tests/test_epics.py` (append after `test_delete_epic_removes_it`, line 142)

**Interfaces:**
- Consumes: `_count_referencing` from Task 3 — same signature, same file, already defined module-level by the time this task runs.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_epics.py`:

```python
@pytest.mark.asyncio
async def test_delete_epic_with_tasks_returns_409():
    """DELETE /api/epics/{id} returns 409, not 500, when the epic still has linked tasks (bug #57)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/epics",
                json={
                    "title": "Epic with tasks",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )
            epic_id = create_response.json()["id"]

            await client.post(
                "/api/tasks",
                json={
                    "title": "Linked task",
                    "content_path": "tasks/linked.md",
                    "column_id": 1,
                    "epic_id": epic_id,
                }
            )

            response = await client.delete(f"/api/epics/{epic_id}")
            assert response.status_code == 409

            # Epic must still exist — no data loss from the failed delete
            get_response = await client.get(f"/api/epics/{epic_id}")
            assert get_response.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/Scripts/pytest tests/test_epics.py::test_delete_epic_with_tasks_returns_409 -v`
Expected: FAIL — currently returns 500 (unhandled FK constraint error).

- [ ] **Step 3: Write minimal implementation**

Replace `delete_epic` (lines 529-537) in `app/main.py`:

```python
    @app.delete("/api/epics/{epic_id}", status_code=204)
    async def delete_epic(epic_id: int):
        """Delete an epic."""
        db = await get_db()
        try:
            task_count = await _count_referencing(db, "tasks", "epic_id", epic_id)
            if task_count:
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot delete epic: {task_count} task(s) still reference it",
                )
            await db.execute("DELETE FROM epics WHERE id = ?", (epic_id,))
            await db.commit()
        finally:
            await db.close()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/Scripts/pytest tests/test_epics.py::test_delete_epic_with_tasks_returns_409 tests/test_epics.py::test_delete_epic_removes_it -v`
Expected: PASS (including the pre-existing `test_delete_epic_removes_it`, which deletes an epic with no linked tasks and must still return 204).

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_epics.py
git commit -m "fix(#57): DELETE /api/epics/{id} returns 409 when tasks still reference it"
```

---

### Task 5: Full verification pass — lint, type-check, full suite, and the QA-authored e2e repro specs

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend test suite**

Run: `.venv/Scripts/pytest tests/ -v`
Expected: all tests PASS, including all 4 pre-existing test files plus the 6 new tests added in Tasks 1-4.

- [ ] **Step 2: Run ruff**

Run: `.venv/Scripts/ruff check app/`
Expected: no errors. If ruff flags anything in the new code, fix it (e.g. unused imports) and re-run.

- [ ] **Step 3: Run mypy strict**

Run: `.venv/Scripts/mypy app/ --strict`
Expected: no errors. `_count_referencing` and the modified handlers must be fully typed (they are, per the code in Tasks 1-4).

- [ ] **Step 4: Run the QA-authored e2e repro specs against a live server**

These 4 spec files were filed by QA directly against the GitHub issues and use Playwright's `request` fixture (HTTP-only, no browser needed):

```bash
# Terminal 1 — start the backend against a scratch data folder
mkdir -p /tmp/kanban-verify-group1
PYTHONPATH=. DATA_DIR=/tmp/kanban-verify-group1 .venv/Scripts/python -m uvicorn app.main:create_app --host 0.0.0.0 --port 8000 --factory &

# Terminal 2 — run the four repro specs
npx playwright test tests/e2e/bug_56_delete_column_with_tasks_500.spec.js \
  tests/e2e/bug_57_delete_epic_with_tasks_500.spec.js \
  tests/e2e/bug_58_patch_task_nonexistent_epic_500.spec.js \
  tests/e2e/bug_59_slug_collision_after_failed_create.spec.js
```

Expected: all 4 specs PASS (they only assert `status < 500`, which the 4xx responses now satisfy).

- [ ] **Step 5: Stop the server and clean up**

```bash
kill %1  # stop the background uvicorn process started in Step 4
rm -rf /tmp/kanban-verify-group1
```

- [ ] **Step 6: Final diff-size check**

Run: `git diff main --stat` (or `git diff <base-branch> --stat`)
Expected: total changed lines comfortably under 500 (estimated ~150-200 lines including the 6 new tests).

---

## Self-Review Notes

- **Spec coverage:** #56 ✓ (Task 3), #57 ✓ (Task 4), #58 ✓ (Task 1), #59 ✓ (Task 2). All four Group 1 issues have a task.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code.
- **Type consistency:** `_count_referencing(db: aiosqlite.Connection, table: str, column: str, value: int) -> int` is defined once in Task 3 and consumed with the identical signature in Task 4 — no drift.
- **Regression guard:** Task 3 and Task 4 both explicitly re-run the pre-existing "happy path" delete tests (`test_delete_column_removes_it`, `test_delete_epic_removes_it`) to confirm the new dependency checks don't break deleting an unreferenced column/epic.
