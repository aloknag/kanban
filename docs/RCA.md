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
