# Root Cause Analysis

---

### Mermaid initialized with unresolvable CSS vars

Why: The theme toggle feature passed CSS custom properties as mermaid color values, but mermaid parses them synchronously before the DOM exists.
Who: `frontend/src/main.tsx` — `mermaid.initialize()` call added with the theme toggle commit (e244ae6).
Where: Should have been caught by an E2E smoke test on the Docker build, or a local `npm run build && serve dist` check before merging.
Avoid: Never pass `var(--x)` to third-party libraries that parse values at init time; validate features against the production build, not just `npm run dev`.

---

### BUG-001 (#34): Mermaid diagrams always render as error

Why: `Markdown.tsx` read `codeNode?.value` to extract fenced-block source, but HAST element nodes have no `value` — the text lives in `codeNode.children[0].value`. The bug was latent since T3.2 (f4cb6dd) because the placeholder MermaidBlock just printed raw text; it only surfaced in T3.3 (2c0b0a7) when real `mermaid.render()` was wired up.  
Who: `frontend/src/components/detail/Markdown.tsx:110` — incorrect HAST property access, present since first commit of the component.  
Where: Should have been caught by a unit test asserting the `code` prop passed to `MermaidBlock` equals the diagram source. No such test existed.  
Avoid: When integrating AST-based libraries (hast, mdast, remark), verify the exact node shape with a quick `console.log` or node script before writing extraction code. Always add a test that pins the value flowing into a rendering boundary.

---

### BUG-002 (#35): Task card title click doesn't navigate to detail page

Why: `SortableTaskCard` spreads `{...listeners}` from `useDraggable` onto the entire card wrapper. dnd-kit captures `onPointerDown` immediately with no activation threshold, so child `<Link>` clicks never complete navigation.  
Who: `frontend/src/routes/Board.tsx` — `useSensor(PointerSensor)` registered without `activationConstraint`, present since DnD was first added (68d3527).  
Where: Should have been caught by an E2E test clicking a task card title and asserting the URL changed to `/tasks/{id}`.  
Avoid: When wrapping interactive elements with dnd-kit draggables, always set `activationConstraint: { distance: N }` so taps pass through to child links and buttons.

---

### Backend shipped without CORS headers

Why: CORS was never needed in dev because the Vite proxy handles API calls server-side, masking the requirement for the production build.
Who: `app/main.py` — `create_app()` has no `CORSMiddleware`, present since the backend was first scaffolded.
Where: Should have been caught by an E2E test running against a built Docker image, not the Vite dev server.
Avoid: Treat Docker Compose as the only valid acceptance environment; any API consumed by a browser requires CORS headers regardless of the dev proxy setup.

## Bug ID: #36
- **Why introduced**: Missing validation for mandatory field 'content_path' in POST /api/tasks.
- **Who/where**:  in  endpoint.
- **Where it should have been caught**: Backend unit tests.
- **What to avoid**: Unconditionally accessing keys in request body payloads.

## Bug ID: #36
- **Why introduced**: Missing validation for mandatory field 'content_path' in POST /api/tasks.
- **Who/where**: `app/main.py` in `create_task` endpoint.
- **Where it should have been caught**: Backend unit tests.
- **What to avoid**: Unconditionally accessing keys in request body payloads.

## Bug ID: #37
- **Why introduced**: No validation of column_id against the columns table.
- **Who/where**: `app/main.py` in `update_task` endpoint.
- **Where it should have been caught**: Backend integration tests.
- **What to avoid**: Assuming foreign key relationships are enforced or validated by application logic without explicit checks.

## Bug ID: #38
- **Why introduced**: Race condition/lack of idempotency in database initialization code allowed duplicate columns to be created upon startup.
- **Who/where**: `app/database.py` in `init_database` function.
- **Where it should have been caught**: Integration testing with persistent storage.
- **What to avoid**: Using simple counters or checks that do not account for existing data when performing database bootstrapping.

## Bug ID: #39
- **Why introduced**: Lack of input validation on the comment API endpoints allowed empty or invalid comments to be persisted and missing fields to trigger an unhandled Exception (500).
- **Who/where**: `app/main.py` in `create_task_comment` and `create_epic_comment` endpoints.
- **Where it should have been caught**: Backend unit testing for API endpoints.
- **What to avoid**: Assuming client-provided payloads contain all expected fields and have valid content; always perform server-side validation.

## Bug ID: #40
- **Why introduced**: Unconditional access to the 'column_id' key in the request payload for , which is not mandatory for epics.
- **Who/where**: `app/main.py` in `create_epic` endpoint.
- **Where it should have been caught**: Backend integration/unit testing for API endpoints.
- **What to avoid**: Assuming all keys in a request body are present, especially if they are optional in the data model.

## Bug ID: #41
- **Why introduced**: Incorrect API implementation returned HTTP 200 with an error object rather than using HTTP 404 for missing resources.
- **Who/where**: `app/main.py` in `get_task` and `get_epic` endpoints.
- **Where it should have been caught**: Backend API contract testing.
- **What to avoid**: Using 200 OK for error responses; always use the correct semantic HTTP status code for errors (e.g., 404 for missing items).

## Bug ID: #42
- **Why introduced**: PATCH /api/tasks/{id} lacked validation to prevent setting an empty string or whitespace-only title for tasks.
- **Who/where**: `app/main.py` in `update_task` endpoint.
- **Where it should have been caught**: Backend API contract testing.
- **What to avoid**: Assuming incoming strings are not empty when the model expects a non-empty string.

## Bug ID: #43
- **Why introduced**: The API implementation of `get_epic` was incomplete and did not fetch linked tasks for an epic, nor did the frontend have navigation links to individual epic pages.
- **Who/where**: `app/main.py` in `get_epic` endpoint, frontend routing issues.
- **Where it should have been caught**: Frontend integration testing for the epic detail page.
- **What to avoid**: Leaving API endpoints incomplete; always ensure that detail views are populated with all necessary related entities.

## Bug ID: #44
- **Why introduced**: The CATALOG sidebar was a stub component with no search/filter functionality implemented.
- **Who/where**: `frontend/src/components/catalog/Gutter.tsx` and `frontend/src/routes/Board.tsx`.
- **Where it should have been caught**: Frontend UI/functional testing.
- **What to avoid**: Leaving UI stubs without implementation and documentation of intended behavior.

---

### Bug #48 — Board layout collapses (columns stack vertically instead of flex row)

**Bug ID:** #48
**Why introduced:** The `<div data-testid="board-content">` in `Board.tsx` was rendered without a `className`. No flex rule targeted it in the normal stylesheet (only a print `page-break-after` rule). The component was never tested for CSS layout properties in unit tests, only for presence in the DOM.
**Who/where:** `frontend/src/routes/Board.tsx:443` (bare div); `frontend/src/components/board/SortableColumn.tsx:75` (missing `flex-1 min-w-0` on the flex child).
**Where it should have been caught:** An E2E layout smoke test on the board route, or a visual regression test asserting `display: flex` on the board container. The unit tests only checked `toBeInTheDocument()`, not layout properties.
**What to avoid:** When a container's visual correctness depends entirely on a CSS class, assert that class (or the resulting computed style) in tests. A `data-testid` element that renders with no `className` should be a red flag in code review.

---

### Bug #49 — Enter key on focused task card navigates to the wrong task

**Bug ID:** #49
**Why introduced:** `focusedCardId` in `Board.tsx` is auto-initialized to `tasks[0].id` on mount and only updated by `j`/`k` hotkeys. Tab navigation updates DOM focus but never calls `setFocusedCardId`, so the Enter hotkey handler fired with a stale closure pointing at the auto-initialized task (the most recently created one) rather than the Tab-focused card.
**Who/where:** `frontend/src/routes/Board.tsx` — `enter` hotkey handler (lines ~355–357) used `focusedCardId` exclusively; the auto-init `useEffect` (lines ~167–171) set it to `tasks[0].id` unconditionally.
**Where it should have been caught:** An E2E test that Tabs to a specific task card and asserts the navigated URL matches that card, not a different one. Tab-to-Enter keyboard flow was never tested.
**What to avoid:** When there are two parallel "focus" concepts (keyboard-tracked state vs. DOM focus), the hotkey handler must check both. DOM `document.activeElement` is the source of truth for Tab navigation; `focusedCardId` only covers j/k navigation.

---

### Bug #62 — POST /api/tasks, POST /api/epics, PATCH /api/epics/{id} still 500 on invalid column_id

**Bug ID:** #62
**Why introduced:** The FK-validation pass for #56-#59 added existence checks for `epic_id` on `create_task`/`update_task` and dependency checks on `delete_column`/`delete_epic`, but never audited the sibling `column_id` paths on `create_task`, `create_epic`, and `update_epic` — `update_task` already validated `column_id`, creating an inconsistent pattern across otherwise-parallel handlers.
**Who/where:** `app/main.py` — `create_task` (no column_id check before insert), `create_epic` (same), `update_epic` (no column_id check at all, unlike `update_task`).
**Where it should have been caught:** The #56-#59 fix PR should have grepped for every `column_id`/`epic_id` write path and confirmed each had a matching existence check, rather than fixing only the specific call site each issue reported.
**What to avoid:** When fixing "missing FK validation" as a bug class, enumerate all call sites for that FK column across the file, not just the one in the report. `create_task`/`create_epic`'s broad `except Exception: raise HTTPException(500, "slug_collision")` in the slug-retry loop also remains a standing risk — it will mislabel any future unhandled FK/DB error on these tables as a slug collision; narrowing it to catch only the actual UNIQUE-constraint case (not fixed here, flagged by the issue as optional) would prevent this bug class from recurring for any new FK added later.

---

### Bug #53 — GET /api/tasks?column_id=N ignores filter

**Bug ID:** #53
**Why introduced:** `list_tasks()` was written to just return every task; a `column_id` query filter was never added when the endpoint was first built, and no test asserted the filter worked (only that the unfiltered list worked).
**Who/where:** `app/main.py` — `list_tasks()` had no parameters at all, so FastAPI never bound the query string to anything.
**Where it should have been caught:** Any test exercising `GET /api/tasks?column_id=N` against a board with tasks in multiple columns. Existing tests only checked the unfiltered endpoint.
**What to avoid:** An API contract implied by other endpoints' filtering conventions (or by the frontend's needs) should have an explicit test for the filtered case, not just the default case.

---

### Bug #55 — GET /api/columns task_count does not match actual per-column task counts

**Bug ID:** #55
**Why introduced:** The original task_count feature (closes #16) deliberately excluded epic-linked tasks via `LEFT JOIN tasks t ON c.id = t.column_id AND t.epic_id IS NULL`, with a test locking in that exclusion. This design decision was never revisited once epics became a common part of real usage, at which point the field stopped reflecting the actual per-column task total that QA (and any API consumer) would reasonably expect.
**Who/where:** `app/main.py` — `list_columns()` and `update_column()`, both with the same stray `AND t.epic_id IS NULL` join condition.
**Where it should have been caught:** Confirmed with the maintainer during this fix that the original exclusion was not an intentional contract worth keeping — should have been re-evaluated when epics were introduced, or caught by an integration test cross-checking GET /api/columns task_count against GET /api/tasks counts grouped by column.
**What to avoid:** A test that locks in a specific numeric exclusion (e.g. "excludes epic tasks") should record *why* that's correct, not just *that* it's correct — otherwise a later regression looks identical to the original intended behavior, and nothing flags that the intent itself may be wrong.

---

### Bug #60 — GET /api/tasks/{id} with an oversized numeric ID returns 500 instead of 404

**Bug ID:** #60
**Why introduced:** `task_id: int` in the FastAPI path param accepts any Python integer (arbitrary precision), but the value is bound directly into a SQLite query, and SQLite's INTEGER column is a signed 64-bit type. Nothing bounded the value before it reached the database driver.
**Who/where:** `app/main.py` — `get_task(task_id: int)`.
**Where it should have been caught:** A boundary-value test for path params (very large / very small integers), not just the in-range nonexistent-ID case that was already tested via `-5`.
**What to avoid:** Any handler that types a path/query param as `int` and passes it straight to a DB driver should assume the value can be arbitrarily large — validate against the DB column's actual range, don't assume "int" means "int the database can store."

**Follow-up (not fixed here, flagged only):** `get_epic`, `delete_task`, `delete_epic`, `list_task_comments`, and `list_epic_comments` all take the same unchecked `int` path param and share this same latent overflow risk. Worth a dedicated pass to apply the same bounds check (or a shared FastAPI dependency) across all of them rather than fixing one at a time as each is independently reported.

---

### Bug #61 — PATCH /api/columns/{id} allows an empty string as the column name

**Bug ID:** #61
**Why introduced:** `create_column()` validates `name` (strip + reject-if-empty) but `update_column()` was written later without the same check — the two handlers drifted out of sync.
**Who/where:** `app/main.py` — `update_column()` wrote `body["name"]` directly with no validation.
**Where it should have been caught:** Any test exercising PATCH with an empty/whitespace name — the existing PATCH test only covered a valid rename.
**What to avoid:** When two handlers validate the same field (create vs. update), a change to one's validation should prompt checking the other. This is the third bug in this round (#61, and the column_id gaps in #62) that comes from `update_*`/`create_*` pairs validating a field inconsistently.

---

### Bug #54 — Non-numeric task/epic ID renders a blank broken page instead of not-found

**Bug ID:** #54
**Why introduced:** `TaskDetail.tsx`/`EpicDetail.tsx` compute `id ? parseInt(id, 10) : null` and gate the react-query fetch with `enabled: !!taskId`. Nobody accounted for `parseInt` returning `NaN` on a non-numeric id — `!!NaN` is `false`, so the query silently never runs instead of erroring, and the fallback render branch (not loading, not not-found) rendered a blank `DetailHeader` shell.
**Who/where:** `frontend/src/routes/TaskDetail.tsx` and `frontend/src/routes/EpicDetail.tsx` — `isNotFound` was derived only from a 404 API error, with no case for an id that never produced a request at all.
**Where it should have been caught:** A test with a non-numeric route param (`/tasks/abc`), not just the numeric-but-nonexistent case (`/tasks/-1`) that was already covered.
**What to avoid:** When gating a query on `!!parsedValue`, remember `parseInt` failure produces `NaN`, which is falsy but not `null`/`undefined` — treat "failed to parse" as its own explicit state rather than lumping it in with "still loading."
