# Code Review — Deep Analysis

> Methodology: No assumptions made about any symbol, method, parameter, or data flow. Every access, every return code, every null path examined. Findings cross-referenced against `docs/RCA.md` anti-patterns.
>
> Severity scale: **CRITICAL** (likely crash or data corruption in normal use) → **HIGH** (exploitable or regularly reachable bug) → **MEDIUM** (silent wrong behaviour or reachable edge case) → **LOW** (latent risk, dead code, or unlikely edge case)

---

## CRITICAL

---

### CR-01 — `app/main.py` · `create_column` — unchecked `body["name"]`

**Line:** ~73
**Code:**
```python
name = body["name"]
```
**Risk:** `KeyError` → unhandled 500 if `name` is absent. No empty-string guard either — `name=""` inserts a blank column.
**RCA pattern:** #5 (unconditional key access), #8 (missing input validation), #10 (empty string accepted)

---

### CR-02 — `app/main.py` · `create_task` — unchecked `body["title"]` and `body["column_id"]`

**Line:** ~202
**Code:**
```python
title = body["title"]
column_id = body["column_id"]
```
**Risk:** Either key missing → `KeyError` → 500. `title` is never checked for empty string before insert.
**RCA pattern:** #5, #8

---

### CR-03 — `app/main.py` · `update_task` — `row[0]` on potentially-`None` row

**Line:** ~297–301
**Code:**
```python
row = cursor.fetchone()
return row[0]  # TypeError if task_id doesn't exist
```
**Risk:** If `task_id` is not found after UPDATE, `row` is `None`, `row[0]` raises `TypeError` → 500. Should return HTTP 404.
**RCA pattern:** #9 (wrong status code for missing resource), #8

---

### CR-04 — `app/main.py` · `create_epic` — unchecked `body["title"]` and `body["content_path"]`

**Line:** ~365–386
**Code:**
```python
validate_content_path(body["content_path"], ...)  # KeyError if content_path absent
...
title = body["title"]  # KeyError if title absent
```
**Risk:** Either key missing → `KeyError` → 500 before any validation runs.
**RCA pattern:** #5, #8

---

### CR-05 — `app/main.py` · `update_epic` — `row[0]` on potentially-`None` row

**Line:** ~492–504
**Code:**
```python
row = cursor.fetchone()
return row[0]  # TypeError if epic_id doesn't exist
```
**Risk:** Same pattern as CR-03 — nonexistent epic ID causes 500 instead of 404.
**RCA pattern:** #9, #8

---

### CR-06 — `app/database.py` · `get_db` connections never set `PRAGMA foreign_keys=ON`

**Line:** `database.py:11` sets pragma only on the init connection. `main.py:31–34` opens new connections per request without re-setting it.
**Code:**
```python
# database.py init_database:
cursor.execute("PRAGMA foreign_keys=ON")  # applies to THIS connection only

# main.py get_db — called for every request:
conn = sqlite3.connect(DATABASE_PATH)     # foreign_keys=OFF by default
```
**Risk:** All FK constraints (e.g., `column_id` in `tasks`, `epic_id` in `tasks`) are silently unenforced at runtime. Invalid FKs insert without error, corrupting relational integrity.
**RCA pattern:** #6 (foreign key not enforced by application)

---

### CR-07 — `frontend/src/components/board/SortableTaskCard.tsx` · `useDraggable` with no activation constraint

**Line:** ~28–31
**Code:**
```tsx
const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id })
```
**Risk:** `useDraggable` does NOT consume the `PointerSensor` `activationConstraint: { distance: 8 }` set on the parent `DndContext` — that constraint only applies to `useSortable`. With raw `useDraggable`, any pointer-down immediately activates drag, swallowing child `<Link>` click events. Task card title navigation is broken on all pointer-based input.
**RCA pattern:** #3 (dnd-kit without `activationConstraint`)

---

## HIGH

---

### CR-08 — `app/main.py` · `update_column` — empty string accepted for `name`

**Line:** ~127
**Code:**
```python
if "name" in body:
    updates.append(("name", body["name"]))  # no strip/empty check
```
**Risk:** Column name can be set to `""`. Returns HTTP 200, board renders a nameless column.
**RCA pattern:** #8, #10

---

### CR-09 — `app/main.py` · `create_task` — empty string title accepted

**Line:** ~186–188
**Code:**
```python
title = body["title"]  # no strip(), no length check
```
**Risk:** `POST /api/tasks` with `{"title": ""}` inserts a blank-title task. Same visual corruption seen with #42 but reachable via create, not just update.
**RCA pattern:** #8, #10

---

### CR-10 — `app/main.py` · `create_task` / `create_epic` — slug race condition

**Line:** `create_task` ~192, `create_epic` ~374
**Code:**
```python
count = cursor.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
slug = f"TASK-{count+1:03d}"
# ... later ...
cursor.execute("INSERT INTO tasks (..., slug, ...) VALUES (...)")
```
**Risk:** Two simultaneous POST requests read the same count, both compute the same slug, one INSERT succeeds, the other hits a UNIQUE constraint → `sqlite3.IntegrityError` → unhandled 500. Non-atomic slug generation.
**RCA pattern:** Race condition (new pattern)

---

### CR-11 — `app/main.py` · `update_task` — `body["title"].strip()` without type check

**Line:** ~280–281
**Code:**
```python
if "title" in body and not body["title"].strip():
```
**Risk:** If the client sends `{"title": null}` or `{"title": 42}`, `.strip()` raises `AttributeError` → 500. No type guard before string method call.
**RCA pattern:** #8 (missing type validation)

---

### CR-12 — `app/main.py` · `update_task` — `content_path` not re-validated on PATCH

**Line:** ~283–286
**Code:**
```python
if "content_path" in body:
    updates.append(("content_path", body["content_path"]))
```
**Risk:** `validate_content_path` is not called for updates. A PATCH with `{"content_path": "../etc/passwd"}` or `{"content_path": ""}` bypasses path validation and corrupts the record.
**RCA pattern:** #8

---

### CR-13 — `app/main.py` · `list_epics` and `get_epic` — hardcoded column `id=3` as "Done"

**Lines:** `list_epics` ~344, `get_epic` ~444
**Code:**
```python
done_count = len([t for t in tasks if t["column_id"] == 3])
```
**Risk:** Assumes "Done" is always column id=3. If columns are deleted/recreated or initialized differently, `done_count` silently computes against the wrong (or deleted) column. The value `3` is a magic constant with no symbolic name or lookup.
**RCA pattern:** #6 (hardcoded FK assumption without validation)

---

### CR-14 — `app/main.py` · `update_epic` — no `column_id` FK validation

**Line:** ~478
**Code:**
```python
if "column_id" in body:
    updates.append(("column_id", body["column_id"]))
```
**Risk:** `update_task` validates that `column_id` exists in the columns table (bug #37 was fixed there). `update_epic` has no equivalent check — an epic can reference a non-existent column.
**RCA pattern:** #6

---

### CR-15 — `app/main.py` · `update_epic` — empty string title accepted

**Line:** ~478
**Code:**
```python
if "title" in body:
    updates.append(("title", body["title"]))  # no empty check
```
**Risk:** Epic title can be set to `""`. Same class of bug as #42 (PATCH task empty title) but on epics — and without the type check that causes CR-11.
**RCA pattern:** #8, #10

---

### CR-16 — `app/main.py` · `update_epic` — `content_path` not re-validated

**Line:** ~478
**Code:**
```python
if "content_path" in body:
    updates.append(("content_path", body["content_path"]))
```
**Risk:** Same as CR-12 for epics — path traversal or empty string accepted.
**RCA pattern:** #8

---

### CR-17 — `app/main.py` · `create_task_comment` — no task-existence check

**Line:** ~535–561
**Code:**
```python
cursor.execute("INSERT INTO task_comments (task_id, ...) VALUES (?, ...)", (task_id, ...))
```
**Risk:** Comments are inserted for non-existent `task_id` values (orphaned records). No prior `SELECT` to confirm the task exists. No FK enforcement (see CR-06).
**RCA pattern:** #6 (FK not enforced by app), #8

---

### CR-18 — `app/main.py` · `create_epic_comment` — no epic-existence check

**Line:** ~580–606
**Code:** Same pattern as CR-17 for `epic_id`.
**Risk:** Orphaned comments created for non-existent epics.
**RCA pattern:** #6, #8

---

### CR-19 — `frontend/src/lib/api.ts` — hardcoded `localhost:8000`

**Line:** ~6
**Code:**
```ts
const API_BASE = 'http://localhost:8000/api'
```
**Risk:** Hardcoded to localhost. In any non-local deployment (Docker, staging, CI), the frontend silently points at the wrong host. No `import.meta.env.VITE_API_BASE` fallback.
**RCA pattern:** #4 (masked by Vite dev proxy)

---

## MEDIUM

---

### CR-20 — `app/main.py` · `delete_column` / `delete_task` / `delete_epic` — silent 204 for nonexistent IDs

**Lines:** `delete_column` ~153, `delete_task` ~319, `delete_epic` ~513
**Code:**
```python
cursor.execute("DELETE FROM ... WHERE id = ?", (id,))
return Response(status_code=204)  # regardless of rows affected
```
**Risk:** DELETE on a nonexistent ID returns 204 (success) instead of 404. Callers cannot distinguish "successfully deleted" from "never existed." Idempotent DELETEs are acceptable in some REST conventions but should be documented and tested.
**RCA pattern:** #9

---

### CR-21 — `app/main.py` · CORS `allow_origins=["*"]`

**Line:** ~26
**Code:**
```python
allow_origins=["*"]
```
**Risk:** Any origin can send requests. Acceptable in controlled dev/internal environments; a security risk if the backend is ever exposed publicly.
**RCA pattern:** #4

---

### CR-22 — `app/main.py` · `update_task` and `update_epic` PATCH responses — incomplete data

**Lines:** `update_task` ~297, `update_epic` ~492
**Code:** Response dictionaries omit `created_at`, `updated_at`, `excerpt`, `content`, and (for epics) `task_count`, `done_count`, `tasks`.
**Risk:** Frontend may cache the PATCH response and overwrite a fully-populated task/epic object with one missing fields, causing timestamps and progress counters to disappear until the next poll.
**RCA pattern:** #11 (detail endpoints return incomplete data)

---

### CR-23 — `app/main.py` · `get_db` — new SQLite connection per request, no pool

**Line:** ~31–34
**Code:**
```python
conn = sqlite3.connect(DATABASE_PATH)
```
**Risk:** Under concurrent load, many connections open simultaneously. SQLite handles concurrent reads well in WAL mode but concurrent writes may cause `OperationalError: database is locked` → unhandled 500. No connection pool or retry logic.
**RCA pattern:** Architectural (connection management)

---

### CR-24 — `frontend/src/routes/Board.tsx` · `updated_at` never available for list tasks

**Line:** ~163–201
**Code:**
```tsx
task.updated_at  // always undefined — GET /api/tasks list response doesn't include it
```
**Risk:** The "recently updated" badge logic comparing `task.updated_at` to a timestamp is permanently dead for all board cards. No visual feedback when tasks are moved.
**RCA pattern:** #11 (API returns incomplete data for list endpoint)

---

### CR-25 — `frontend/src/components/detail/Markdown.tsx` · speculative `codeNode?.meta` HAST access

**Line:** ~107–112
**Code:**
```ts
const codeNode = node?.children?.[0] as (HastElement & { meta?: string }) | undefined
const codeNodeMeta = codeNode?.meta
```
**Risk:** `meta` is a remark AST (mdast) property, not a HAST element property. The cast `& { meta?: string }` is speculative. After remark-to-hast transformation, `meta` may not survive on the node, silently causing mermaid blocks tagged with `meta: "mermaid"` to never render as diagrams. Should use `codeNode?.properties?.['data-meta']` or inspect the raw mdast node before HAST conversion.
**RCA pattern:** #2 (incorrect HAST node property access)

---

### CR-26 — `frontend/src/components/detail/MermaidBlock.tsx` · duplicate mermaid render ID

**Line:** ~20
**Code:**
```ts
const id = `mermaid-${figureNumber}`
mermaid.render(id, code)
```
**Risk:** If the component re-mounts (fast navigation, HMR, React StrictMode double-render), `mermaid.render` may throw `"Element with id … already exists"` because it inserts a hidden SVG element with that ID and doesn't clean it up on re-render. No cleanup in `useEffect` return.
**RCA pattern:** Stateful third-party lib without cleanup

---

### CR-27 — `frontend/src/components/detail/JournalCompose.tsx` · optimistic `id: -1` collision

**Line:** ~82–87
**Code:**
```tsx
{ id: -1, body: text, author, created_at: new Date().toISOString() }
```
**Risk:** Two rapid comment submits before any refetch produces two optimistic entries both with `key={-1}`. React key collision causes de-duplication or incorrect re-render ordering in the comment list.
**RCA pattern:** Optimistic update ID management

---

### CR-28 — `frontend/src/routes/TaskDetail.tsx` · `NaN` from non-numeric route param

**Line:** ~25
**Code:**
```ts
const taskId = id ? parseInt(id, 10) : null
```
**Risk:** `parseInt("abc", 10)` returns `NaN`. `!!NaN` is `false`, so `taskId` is treated as `null`, the query is disabled, and the UI silently shows a perpetual loading state with no "invalid URL" error.
**RCA pattern:** Missing input validation on route param

---

### CR-29 — `frontend/src/routes/EpicDetail.tsx` · same `NaN` route param issue

**Line:** ~24
**Risk:** Identical to CR-28 for epic IDs.
**RCA pattern:** Missing input validation on route param

---

### CR-30 — `frontend/src/components/board/TaskCard.tsx` · epic slug derived from `epic_id` integer

**Line:** ~74
**Code:**
```tsx
`EPIC-${String(task.epic_id).padStart(3, '0')}`
```
**Risk:** Derives the display slug by zero-padding the raw `epic_id` integer. If any epic was deleted and IDs are non-sequential, the derived `EPIC-NNN` will not match the actual `slug` stored in the epics table. The real slug comes from the DB and should be fetched, not computed.
**RCA pattern:** #11 (incomplete data — epic slug not included in task list response)

---

## LOW

---

### CR-31 — `app/main.py` · `list_task_comments` / `list_epic_comments` — no parent-existence check

**Lines:** ~519, ~564
**Risk:** GET comments for a nonexistent task/epic ID returns HTTP 200 + `[]` instead of 404. Minor REST contract violation.
**RCA pattern:** #9

---

### CR-32 — `app/database.py` · bootstrap not wrapped in exclusive transaction

**Line:** ~67–87
**Risk:** If two processes start simultaneously (e.g., a test runner and a dev server), both pass the column-name existence check before either inserts, potentially creating duplicate rows. Extremely unlikely in practice but not guarded by `BEGIN EXCLUSIVE`.
**RCA pattern:** #7 (DB init not fully idempotent under concurrency)

---

### CR-33 — `app/paths.py` · cache read-then-write TOCTOU

**Line:** ~138–157
**Risk:** Two concurrent requests for the same uncached path both miss the cache, both read the file, both write to cache. The second write may evict a different entry unnecessarily. Not a correctness bug but a cache-efficiency and eviction-order issue.
**RCA pattern:** Thread-safety / TOCTOU

---

### CR-34 — `frontend/src/lib/api.ts` · `Column` type missing `task_count`

**Line:** ~51
**Risk:** The `Column` TypeScript interface doesn't include `task_count` even though `GET /api/columns` returns it. Any consumer needing this field gets `undefined` silently.
**RCA pattern:** #11 (incomplete type definition)

---

### CR-35 — `frontend/src/routes/Board.tsx` · `sortedColumns` recreated on every render

**Line:** ~214
**Risk:** `sortedColumns` is a new array reference on every render, causing `handleDragEnd`'s `useCallback` to recompute every render even when columns haven't changed. Minor performance issue; could cause stale-closure bugs if memoization is refactored carelessly.
**RCA pattern:** React memoization

---

### CR-36 — `frontend/src/components/detail/MermaidBlock.tsx` · no `mermaid.initialize()` call

**Line:** ~21
**Risk:** Mermaid renders with default config. No theme set. If dark-mode CSS vars are ever passed to `mermaid.initialize` without resolving them first, it will silently fail (RCA #1). Currently harmless but one refactor away from a known breakage.
**RCA pattern:** #1 (latent risk if theme vars added)

---

### CR-37 — `frontend/src/components/detail/JournalCompose.tsx` · stale `author` closure

**Line:** ~164
**Risk:** `submitComment` closes over `author` state. In React 18 concurrent mode, state may be read from a stale closure if the user changes `author` between composing and submitting. Low probability but not guarded.
**RCA pattern:** React closure / concurrent mode

---

### CR-38 — `frontend/src/routes/TaskDetail.tsx` and `EpicDetail.tsx` · `{} as TypeX` type cast

**Lines:** `TaskDetail.tsx:102`, `EpicDetail.tsx:110`
**Risk:** Empty object cast to a complex interface bypasses TypeScript null safety. If the early-return guard logic is ever changed, component children accessing `.slug`, `.title`, etc. will get `undefined` at runtime with no compile-time warning.
**RCA pattern:** Type-safety masking

---

### CR-39 — `frontend/src/routes/Epics.tsx` · unconditional 5-second polling

**Line:** ~26
**Risk:** `refetchInterval: 5000` runs regardless of page visibility or user activity. Combined with polling elsewhere, contributes to unnecessary server traffic and may surface backend errors more frequently than expected.
**RCA pattern:** Resource management

---

## Summary

| ID | File | Severity | RCA Pattern |
|----|------|----------|-------------|
| CR-01 | app/main.py — `create_column` | **CRITICAL** | #5, #8, #10 |
| CR-02 | app/main.py — `create_task` | **CRITICAL** | #5, #8 |
| CR-03 | app/main.py — `update_task` response | **CRITICAL** | #9, #8 |
| CR-04 | app/main.py — `create_epic` | **CRITICAL** | #5, #8 |
| CR-05 | app/main.py — `update_epic` response | **CRITICAL** | #9, #8 |
| CR-06 | app/database.py — FK pragma not set per-connection | **CRITICAL** | #6 |
| CR-07 | SortableTaskCard.tsx — `useDraggable` no activationConstraint | **CRITICAL** | #3 |
| CR-08 | app/main.py — `update_column` empty name | HIGH | #8, #10 |
| CR-09 | app/main.py — `create_task` empty title | HIGH | #8, #10 |
| CR-10 | app/main.py — slug race condition | HIGH | race |
| CR-11 | app/main.py — `update_task` type check on `.strip()` | HIGH | #8 |
| CR-12 | app/main.py — `update_task` content_path not revalidated | HIGH | #8 |
| CR-13 | app/main.py — hardcoded column id=3 for "Done" | HIGH | #6 |
| CR-14 | app/main.py — `update_epic` column_id not validated | HIGH | #6 |
| CR-15 | app/main.py — `update_epic` empty title | HIGH | #8, #10 |
| CR-16 | app/main.py — `update_epic` content_path not revalidated | HIGH | #8 |
| CR-17 | app/main.py — `create_task_comment` no task-existence check | HIGH | #6, #8 |
| CR-18 | app/main.py — `create_epic_comment` no epic-existence check | HIGH | #6, #8 |
| CR-19 | frontend/src/lib/api.ts — hardcoded localhost:8000 | HIGH | #4 |
| CR-20 | app/main.py — DELETE returns 204 for nonexistent IDs | MEDIUM | #9 |
| CR-21 | app/main.py — CORS wildcard | MEDIUM | #4 |
| CR-22 | app/main.py — PATCH responses missing fields | MEDIUM | #11 |
| CR-23 | app/main.py — no DB connection pool | MEDIUM | arch |
| CR-24 | Board.tsx — `updated_at` always undefined in list | MEDIUM | #11 |
| CR-25 | Markdown.tsx — speculative `codeNode?.meta` HAST access | MEDIUM | #2 |
| CR-26 | MermaidBlock.tsx — duplicate render ID on re-mount | MEDIUM | third-party |
| CR-27 | JournalCompose.tsx — optimistic `id: -1` collision | MEDIUM | optimistic |
| CR-28 | TaskDetail.tsx — `parseInt` returns NaN for non-numeric param | MEDIUM | validation |
| CR-29 | EpicDetail.tsx — same NaN route param issue | MEDIUM | validation |
| CR-30 | TaskCard.tsx — epic slug derived, not fetched | MEDIUM | #11 |
| CR-31 | app/main.py — comment list 200 for nonexistent parent | LOW | #9 |
| CR-32 | app/database.py — bootstrap not in exclusive transaction | LOW | #7 |
| CR-33 | app/paths.py — cache TOCTOU | LOW | race |
| CR-34 | api.ts — `Column` type missing `task_count` | LOW | #11 |
| CR-35 | Board.tsx — `sortedColumns` recreated every render | LOW | React memo |
| CR-36 | MermaidBlock.tsx — no `mermaid.initialize()` | LOW | #1 latent |
| CR-37 | JournalCompose.tsx — stale `author` closure | LOW | closure |
| CR-38 | TaskDetail/EpicDetail.tsx — `{} as TypeX` casts | LOW | type-safety |
| CR-39 | Epics.tsx — unconditional 5s polling | LOW | resource |

**Total findings: 39** (7 CRITICAL · 12 HIGH · 11 MEDIUM · 9 LOW)
