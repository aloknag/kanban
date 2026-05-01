# Kanban — Technical Design Document

> Status: Approved 2026-04-30
> Approach: Lean SQLite Monolith with disk-backed Markdown content (Trifecta Direction A, revised)

---

## 1. Project Identity

**Name:** `kanban` (display name: **AgentBoard**)

**Description:** A local-only Kanban board where AI agents author work as Markdown files on disk and register them via a REST API. The server is launched with `--folder <path>`, treats that folder as the data root (SQLite metadata + Markdown files), reads files on demand, and renders them in a futuristic dark-glassmorphism UI with full Mermaid support.

---

## 2. Context & Strategic Reason

AI agents in this workspace (Claude Code, custom Python agents, LangGraph workflows) produce structured work — plans, proposals, task breakdowns — but have no shared, persistent, human-readable place to surface that work.

This board provides:
- **Agents:** a write target (REST API + filesystem) and a read surface across sessions
- **Humans:** a futuristic, ADHD-friendly visual board with rendered Markdown and Mermaid diagrams to quickly understand what agents are proposing or doing

Built now because adjacent projects (`retroai`, `cowork`, `autoresearch`) have established a stable local stack (FastAPI + React 19 + Vite + Tailwind) that can be reused directly.

---

## 3. Objectives & Success Criteria

| Goal | Verification Signal |
|---|---|
| Agents create Epics and Tasks without human involvement | `POST /api/epics` and `POST /api/tasks` return 201 with no manual setup |
| Humans can read the board without touching a terminal | `http://localhost:8000` opens a working board in the browser |
| Mermaid diagrams render inside Epic/Task content | A file with a ` ```mermaid ` block shows a rendered diagram, not raw text |
| Markdown content is owned by agents on disk | Agents can edit a tracked `.md` file directly, UI reflects changes within 5s |
| Column order is persistent and draggable | Dragging a column updates `position`, survives page refresh |
| Comments are visible per entity and postable via API | `POST /api/tasks/{id}/comments` appears in the UI within 5 seconds |
| Server is portable across data folders | `kanban serve --folder <any-path>` initializes a fresh board if the folder is empty |

---

## 4. Target Audience

**Primary (API):** AI agents running locally — Claude Code, custom Python agents, LangGraph workflows.
- Motivation: a persistent task store they can write to and read from across sessions.
- Authorship pattern: write Markdown files to disk, register paths via REST.

**Secondary (UI):** The human operator — checking agent progress, reading proposals with embedded diagrams, dragging tasks between columns.
- Needs ADHD-friendly visual density: clear hierarchy, strong contrast, diagrams rendered inline rather than as raw text.

---

## 5. Outputs & Scope

### In scope
- FastAPI backend: REST API for Epics, Tasks, Columns, Comments
- SQLite database (single file, `<data-folder>/kanban.db`)
- Markdown content stored as files on disk, owned by agents
- React 19 frontend: **Board** view (Tasks in Kanban columns), **Epics** view (cards with progress roll-up)
- Markdown rendering with Mermaid, GFM tables, task lists, syntax highlighting
- Drag-to-reorder columns (UI + API)
- Dynamic columns: default `Todo / In Progress / Done`, addable via UI and API
- Free-text Assignee field on Epics and Tasks
- Inline comment threads on each Epic and Task (Markdown body, stored in DB)
- CLI: `kanban serve --folder <path>`
- Single Makefile: `make dev`, `make build`, `make start`
- Polling-based UI updates via TanStack Query (`refetchInterval: 5000`)

### Out of scope (v1)
- Authentication, API keys, multi-user accounts
- Cloud deployment, Docker, CI/CD
- Notifications (email, Slack, webhooks)
- Due dates, priority levels, story points
- Full-text search
- File attachments beyond the Markdown content file
- Edit/delete on comments
- Real-time push (WebSocket/SSE)
- File-watching for sub-second update latency

---

## 6. Architecture

### Topology — Single-process monolith

```
┌──────────────────────────────────────────────────┐
│   uvicorn :8000                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  FastAPI app                               │  │
│  │  ├── /api/*       JSON REST endpoints      │  │
│  │  └── /            StaticFiles → dist/      │  │
│  └────────────────────────────────────────────┘  │
│           │                       │              │
│           ▼                       ▼              │
│   <data-folder>/kanban.db   <data-folder>/{epics,tasks}/*.md │
└──────────────────────────────────────────────────┘

         ▲                                    ▲
         │ HTTP                               │ HTTP
   ┌─────┴────────┐                    ┌──────┴──────┐
   │ AI agents    │                    │ Browser UI  │
   │ (Python/CC)  │                    │ (React 19)  │
   └──────────────┘                    └─────────────┘
```

- One Python process, one port (8000), one DB file, one data folder.
- During development, Vite dev server runs separately on 5173 with API proxy; in production the React build is mounted as static files.
- No Docker required at runtime.

### Storage split

| What | Where | Why |
|---|---|---|
| Epic/Task metadata (title, assignee, column, slug, paths, timestamps) | SQLite `kanban.db` | Cheap to query, supports drag/reorder transactions |
| Epic/Task **content** (descriptions, deliverables, diagrams) | Markdown files in `epics/` and `tasks/` | Agents author it, humans can edit it, diff-friendly, no DB blob bloat |
| Comments | SQLite (inline body) | Short status messages — file overhead isn't worth it |
| Columns | SQLite | Pure metadata |

---

## 7. Data Folder Layout

When the server is launched as `kanban serve --folder /home/user/project-x/`:

```
/home/user/project-x/
├── kanban.db              # SQLite — all metadata
├── epics/
│   ├── EPIC-001.md        # agent-authored markdown
│   └── EPIC-002.md
└── tasks/
    ├── TASK-001.md
    └── TASK-002.md
```

- `kanban.db` and the two subfolders are created automatically on first launch if the folder exists but is empty/uninitialized.
- The folder must already exist; the server does **not** create the root.
- Agents may author Markdown freely, including ` ```mermaid ` fenced blocks, GFM tables, task lists, and inline code.

---

## 8. Data Model

```sql
CREATE TABLE columns (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE epics (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,         -- e.g. EPIC-001
  title         TEXT NOT NULL,
  content_path  TEXT NOT NULL,                -- relative to data folder
  assignee      TEXT,
  column_id     INTEGER NOT NULL REFERENCES columns(id),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE tasks (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,         -- e.g. TASK-001
  epic_id       INTEGER REFERENCES epics(id), -- nullable
  title         TEXT NOT NULL,
  content_path  TEXT NOT NULL,                -- relative to data folder
  assignee      TEXT,
  column_id     INTEGER NOT NULL REFERENCES columns(id),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE comments (
  id           INTEGER PRIMARY KEY,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('epic','task')),
  entity_id    INTEGER NOT NULL,
  author       TEXT NOT NULL,
  body         TEXT NOT NULL,                 -- markdown, inline
  created_at   TEXT NOT NULL
);

CREATE INDEX idx_tasks_column   ON tasks(column_id);
CREATE INDEX idx_tasks_epic     ON tasks(epic_id);
CREATE INDEX idx_comments_lookup ON comments(entity_type, entity_id);
```

**Bootstrap data** (inserted on first launch):
- Columns: `Todo` (position 0), `In Progress` (position 1), `Done` (position 2)

---

## 9. API Surface

All endpoints under `/api`. JSON request/response. No auth.

### Columns
```
GET    /api/columns                       → [{id, name, position}, ...]
POST   /api/columns          { name }     → 201 {id, name, position}
PATCH  /api/columns/{id}     { name? }    → 200
DELETE /api/columns/{id}                  → 204 (must be empty)
PATCH  /api/columns/reorder  { ids: [int, ...] }   → 200
```

### Epics
```
GET    /api/epics                                  → [{id, slug, title, assignee, column_id, task_count, done_count}, ...]
POST   /api/epics  { title, content_path, assignee?, column_id }
                                                    → 201 {id, slug, ...}
GET    /api/epics/{id}                             → {metadata, content, content_error?}
PATCH  /api/epics/{id}  { title?, content_path?, assignee?, column_id? }
                                                    → 200
DELETE /api/epics/{id}                             → 204
```

### Tasks
```
GET    /api/tasks                                  → [{id, slug, title, assignee, column_id, epic_id}, ...]
                                                     ?column_id, ?epic_id, ?assignee filters
POST   /api/tasks  { title, content_path, assignee?, column_id, epic_id? }
                                                    → 201 {id, slug, ...}
GET    /api/tasks/{id}                             → {metadata, content, content_error?}
PATCH  /api/tasks/{id}  { title?, content_path?, assignee?, column_id?, epic_id? }
                                                    → 200
DELETE /api/tasks/{id}                             → 204
```

### Comments
```
GET    /api/epics/{id}/comments                    → [{id, author, body, created_at}, ...]
POST   /api/epics/{id}/comments  { author, body }  → 201
GET    /api/tasks/{id}/comments                    → [...]
POST   /api/tasks/{id}/comments  { author, body }  → 201
```

### Content semantics

- `content_path` is **always relative** to the data folder root.
- On `POST` / `PATCH`, the server validates the path: resolves it, asserts it is inside the data folder, and verifies the file exists. Returns `400` otherwise.
- `GET /api/{epics|tasks}/{id}` always reads the file fresh from disk and includes the raw Markdown in the response.
- If the file has been deleted since registration, the response is `200` with `content_error: "file_missing"` and `content: ""`.

### Two valid agent workflows

1. **Author then register:** Agent writes `tasks/onboarding.md` to disk, then `POST /api/tasks { content_path: "tasks/onboarding.md", ... }`.
2. **Edit-in-place:** Agent edits an already-registered file directly. UI picks up changes within the next 5s poll cycle. No API call needed for content edits — only for status/column/title changes.

---

## 10. Frontend Architecture

### Stack
- React 19, TypeScript strict
- Vite 7
- Tailwind CSS v3 (custom theme)
- TanStack Query v5 (`refetchInterval: 5000` on board queries)
- React Router v6
- React Hook Form + Zod for the few forms (column add, task quick-create, comment compose)
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop
- `react-markdown` + `remark-gfm` for Markdown
- `mermaid` rendered via a custom `<MermaidBlock />` code-block renderer
- `lucide-react` icons
- Inter font (variable, self-hosted)

### Routes
```
/              → Board view (tasks in columns)
/epics         → Epic cards with progress roll-up
/epics/:id     → Epic detail (rendered Markdown + child tasks + comments)
/tasks/:id     → Task detail (rendered Markdown + comments)
```

### Polling strategy
All list and detail queries set `refetchInterval: 5000` and `refetchOnWindowFocus: true`. Mutations invalidate the relevant query keys for immediate refresh on top of polling.

### Mermaid integration
- `react-markdown` is configured with a custom `code` component.
- When language is `mermaid`, the component renders a `<MermaidBlock>` that runs `mermaid.render(id, code)` on mount and on `content` change, and dangerously sets the resulting SVG.
- Mermaid is initialized once at app boot with `theme: 'dark'` and the project's accent palette.

### Drag-and-drop scope
- Columns can be reordered (drag column header).
- Tasks can be moved between columns (changes `column_id`).
- Tasks cannot be reordered *within* a column in v1 — order is creation-time DESC. (Adds complexity for marginal value.)

---

## 11. Aesthetic — Dark Glassmorphism

| Token | Value |
|---|---|
| Background | `#0a0f1e` (deep navy) |
| Surface (cards) | `bg-white/5` with `backdrop-blur-xl` |
| Border | `border-white/10`, on hover `border-violet-400/30` |
| Primary accent | Violet `#7c3aed` → `#a78bfa` gradient |
| Text primary | `text-slate-100` |
| Text muted | `text-slate-400` |
| Font | Inter, variable, weights 400/500/600/700 |
| Radius | `rounded-2xl` for cards, `rounded-xl` for buttons |
| Hover effect | Subtle violet border glow + `transition-all duration-200` |

No scanlines, no glitch effects, no skeuomorphic ornament. The futuristic feel comes from blur, depth, and the violet glow on interaction — not decoration.

---

## 12. Requirements & Constraints

### Functional
- `epic_id` on tasks is nullable (tasks can exist without an epic).
- Columns are dynamic: default set is `Todo / In Progress / Done`, addable via UI and API.
- Column `position` is a dense integer (0, 1, 2…); drag reorder rewrites all positions in one transaction.
- Comments are append-only in v1 (no edit/delete).
- All `body` and file content is treated as Markdown.
- A column with tasks/epics in it cannot be deleted until those items are moved.

### Technical
- Python 3.12+, `uv` for package management.
- FastAPI + `aiosqlite`, raw parameterized SQL (no ORM).
- SQLite opened with `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON`.
- React 19, TypeScript strict, Vite 7, Tailwind v3.
- TanStack Query v5, polling at 5s.
- `react-markdown` + `remark-gfm` + `mermaid` (client-side).
- `@dnd-kit` for drag-and-drop.
- FastAPI mounts React `dist/` as StaticFiles — single port `8000`.
- Path validation on every `content_path` write: `Path.resolve(strict=True).is_relative_to(data_folder)` — reject otherwise.

### Aesthetic / Brand
- Dark Glassmorphism as defined in §11.
- Inter font throughout. No mixed font families.
- Violet/purple is the **only** accent color in v1 — no rainbow status chips.

---

## 13. CLI & Invocation

```bash
# Production
kanban serve --folder /home/user/anag/project-x/

# Equivalent
DATA_DIR=/home/user/anag/project-x/ uv run uvicorn app.main:app
```

Implementation:
- A small `__main__.py` parses `--folder`, sets `DATA_DIR`, then launches uvicorn programmatically.
- FastAPI startup hook: resolves and validates the folder, creates `epics/` and `tasks/` subfolders if missing, opens `kanban.db` (or initializes schema + bootstrap columns), sets PRAGMAs.
- `make dev FOLDER=<path>` runs backend + Vite dev server in parallel for development.
- `make build` runs `npm run build` and copies/links `dist/` to a known location FastAPI mounts.
- `make start FOLDER=<path>` runs the production single-process mode.

---

## 14. Implementation Considerations

| Choice | Status | Rationale |
|---|---|---|
| Single process (FastAPI serves API + static UI) | **Locked** | Simplest run-mode; matches "minimal" |
| No auth | **Locked** | Local-only; auth adds setup friction without security gain on `localhost` |
| SQLite raw async via `aiosqlite` (no ORM) | **Locked** | 4 simple tables; ORM overhead not justified |
| Markdown content as files on disk | **Locked** | Agent ergonomics + human inspectability + diff-friendliness |
| Polling at 5s via TanStack Query | **Locked** | Sufficient for human reads; no WebSocket complexity |
| Dynamic columns with drag-to-reorder | **Locked** | User-requested |
| Two views (Board, Epics) | **Locked** | Cleaner than nested hierarchical board |
| Dark Glassmorphism aesthetic | **Locked** | User-selected |
| Comments inline in DB (not files) | **Locked** | Short messages; file overhead unjustified |
| Tasks reorder *within* a column | **Deferred** | Out of v1; only column changes drag |
| File watcher for sub-second update | **Deferred** | Polling at 5s is acceptable |

---

## 15. Validation Plan

| Check | Command / Method |
|---|---|
| Backend unit tests | `uv run pytest tests/ -v` |
| Backend types | `uv run mypy app/` |
| Backend lint | `uv run ruff check app/` |
| Frontend types | `npm run build` (tsc strict) |
| Frontend lint | `npm run lint` |
| Path traversal rejected | `pytest`: POST `content_path: "../etc/passwd"` → 400 |
| Path outside data folder rejected | `pytest`: POST absolute path outside root → 400 |
| Symlink escape rejected | `pytest`: symlink in data folder pointing outside → 400 |
| Server initializes a fresh folder | `kanban serve --folder /tmp/empty/` → DB + subdirs created, listens on 8000 |
| External edit picked up | Edit `tasks/TASK-001.md` on disk, refresh UI → new content within 5s |
| Mermaid renders | Open a task with a ` ```mermaid ` block → diagram visible, no raw fence |
| Column drag persists | Drag a column, refresh page → order preserved |
| Agent smoke test | `curl -X POST localhost:8000/api/tasks -H 'content-type: application/json' -d '{"title":"test","content_path":"tasks/t1.md","column_id":1}'` → 201 |
| Concurrent agent writes | Two parallel `POST /api/tasks` with WAL mode → both succeed |

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Path traversal (`content_path: "../../../etc/passwd"`) | `Path.resolve()` + `is_relative_to(data_folder)` on every write; reject with 400 |
| Symlink attack (file inside data folder symlinks outside) | Resolve with `strict=True`; reject if resolved target escapes root |
| File deleted on disk after registration | GET returns 200 with `content_error: "file_missing"`; UI shows warning chip |
| File edited externally while UI is open | Acceptable — 5s polling re-reads from disk |
| Two agents write the same file simultaneously | Out of scope for v1; last-writer-wins on FS; documented limitation |
| Mermaid client-side init race | Use `useEffect` keyed on content hash; debounce render |
| Column reorder producing position gaps | Dense re-rank (0, 1, 2…) on every reorder, single transaction |
| aiosqlite slow under concurrent writes | `PRAGMA journal_mode=WAL` on DB init |
| React `dist/` not found on `make start` | `start` target depends on `build` |
| Schema drift (no Alembic) | Document any schema change; ship a one-shot migration script in `scripts/` if it ever happens |
| Large Markdown files (e.g. agent dumps a 1MB plan) | Cap at 1MB per file at API layer; return 413 if the file on disk exceeds that |

---

## 17. Decisions Log

Captured during alignment (Phase 2):

1. **Single process** — FastAPI serves both the REST API and the built React UI as static files; Vite dev server only during development.
2. **No auth** — Local-only; agents call the API bare.
3. **Dynamic columns** — Default `Todo / In Progress / Done`; addable via UI and API; draggable to reorder.
4. **Polling** — TanStack Query `refetchInterval: 5000`; no WebSocket/SSE in v1.
5. **Aesthetic** — Dark Glassmorphism (deep navy, violet accent, frosted glass, Inter).
6. **Two views** — Separate **Board** (tasks) and **Epics** routes; no hierarchical nesting on the board.
7. **Content on disk** — Epic/Task descriptions are Markdown files authored by agents; the API stores the relative path; the server reads on demand.
8. **Configurable data folder** — Server launched with `--folder <path>`; SQLite + `epics/` + `tasks/` live inside.

---

## 18. Project Structure (planned)

```
kanban/
├── TDD.md                       # this document
├── Makefile
├── pyproject.toml
├── uv.lock
├── app/
│   ├── __init__.py
│   ├── __main__.py              # CLI entry — parses --folder
│   ├── main.py                  # FastAPI app + static mount
│   ├── config.py                # data folder resolution
│   ├── database.py              # aiosqlite connection + schema bootstrap
│   ├── paths.py                 # path validation helpers
│   ├── routers/
│   │   ├── columns.py
│   │   ├── epics.py
│   │   ├── tasks.py
│   │   └── comments.py
│   ├── schemas/                 # Pydantic models
│   └── services/                # business logic
├── tests/
│   ├── test_columns.py
│   ├── test_epics.py
│   ├── test_tasks.py
│   ├── test_comments.py
│   └── test_path_security.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── lib/
        │   ├── api.ts           # typed fetch client
        │   └── query.ts         # TanStack Query setup
        ├── components/
        │   ├── Markdown.tsx     # react-markdown + Mermaid block
        │   ├── MermaidBlock.tsx
        │   ├── Card.tsx
        │   ├── Column.tsx
        │   ├── TaskCard.tsx
        │   └── EpicCard.tsx
        ├── routes/
        │   ├── Board.tsx
        │   ├── Epics.tsx
        │   ├── EpicDetail.tsx
        │   └── TaskDetail.tsx
        └── styles/
            └── index.css        # Tailwind + Inter import
```
