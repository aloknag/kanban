# Kanban — AgentBoard

A local-only Kanban board where AI agents author work as Markdown files on disk and manage them via a REST API. The server is launched with `--folder <path>`, treats that folder as the data root (SQLite metadata + Markdown files), reads files on demand, and renders them in a futuristic dark-glassmorphism UI.

## Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:**
- Docker 20.10+
- Docker Compose 2.0+

**Start both backend and frontend:**
```bash
docker compose up -d
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Swagger Docs: http://localhost:8000/docs

**See:** [Docker Deployment Guide](docs/DOCKER.md) for full documentation.

### Option 2: Local Development

**Prerequisites:**
- Python 3.12+
- `uv` package manager
- Node.js 18+ (for frontend, optional)

### Installation & Setup

```bash
# Install dependencies
uv sync

# Create a data folder
mkdir /path/to/kanban-data
```

#### Start the Server

**On Linux/macOS:**
```bash
make dev FOLDER=/path/to/kanban-data
```

**On Windows (PowerShell):**
```powershell
$env:DATA_DIR = 'C:\path\to\kanban-data'
.venv\Scripts\python -m app serve --folder 'C:\path\to\kanban-data' --port 8000
```

**On Windows (Git Bash):**
```bash
DATA_DIR=/tmp/kanban-test .venv/Scripts/python -m app serve --folder /tmp/kanban-test --port 8000
```

**Direct Python (all platforms):**
```bash
python -m app serve --folder /path/to/kanban-data --host 0.0.0.0 --port 8000
```

The server will initialize the database and directory structure automatically:
```
/path/to/kanban-data/
├── kanban.db              # SQLite database with metadata
├── epics/                 # Epic markdown files
│   └── EPIC-001.md
└── tasks/                 # Task markdown files
    └── TASK-001.md
```

## Architecture

### Backend (Python + FastAPI)
- **Framework:** FastAPI with async SQLite (`aiosqlite`)
- **Database:** SQLite with WAL mode for concurrent writes
- **Storage:** Split metadata (DB) and content (files on disk)
- **API:** RESTful JSON endpoints, no authentication

### Frontend (React 19 + Vite) — *scaffolding complete*
- **UI:** Dark glassmorphism design (deep navy, violet accents)
- **State:** TanStack Query v5 with 5s polling
- **Markdown:** react-markdown + remark-gfm + Mermaid diagrams
- **DnD:** @dnd-kit for drag-to-reorder columns
- **Forms:** React Hook Form + Zod

## API Overview

All endpoints are under `/api`. Full specification in `docs/TDD.md`.

### Columns
```
GET    /api/columns                          → list all
POST   /api/columns { name }                 → create
PATCH  /api/columns/{id} { name? }           → update
DELETE /api/columns/{id}                     → delete (must be empty)
PATCH  /api/columns/reorder { ids: [...] }   → reorder all
```

### Tasks
```
GET    /api/tasks                            → list
POST   /api/tasks { title, content_path, column_id, assignee?, epic_id? } → create
GET    /api/tasks/{id}                       → detail (with markdown content)
PATCH  /api/tasks/{id} { title?, column_id?, ... } → update
DELETE /api/tasks/{id}                       → delete
```

### Epics
```
GET    /api/epics                            → list (with task_count, done_count)
POST   /api/epics { title, content_path, column_id, assignee? } → create
GET    /api/epics/{id}                       → detail (with content)
PATCH  /api/epics/{id} { ... }               → update
DELETE /api/epics/{id}                       → delete
```

### Comments
```
GET    /api/tasks/{id}/comments              → list
POST   /api/tasks/{id}/comments { author, body } → create
GET    /api/epics/{id}/comments              → list
POST   /api/epics/{id}/comments { author, body } → create
```

## Content Management

### Agent Workflows

**Workflow 1: Author then register**
```python
# Agent writes file to disk
Path("/data/tasks/setup.md").write_text("# Setup DB schema\n...")

# Then register via API
POST /api/tasks {
  "title": "Setup database",
  "content_path": "tasks/setup.md",
  "column_id": 1
}
```

**Workflow 2: Edit-in-place**
```python
# Create task (file and record)
resp = POST /api/tasks { ... }
task_id = resp.json()["id"]

# Agent edits file directly
Path("/data/tasks/setup.md").write_text("# Setup DB schema\n... updated ...")

# UI picks up changes within 5s (polling). No API call needed for content edits.
```

## Security

- **Path validation:** All `content_path` values are validated to prevent traversal attacks (`../../../etc/passwd`)
- **Rejected patterns:** Absolute paths, symlink escapes (resolve with `strict=True`), paths outside data folder
- **Markdown:** Rendered client-side; server returns raw text

## CI/CD Pipeline

### Drone CI

Automated build, test, and deploy pipeline on every push to `main` or `develop` branches.

**Pipeline Stages:**
1. Build backend Docker image
2. Build frontend Docker image
3. Start services with docker-compose
4. Health checks
5. Run backend tests (pytest)
6. Run frontend unit tests (Vitest)
7. Run TypeScript checks
8. Backend linting (Ruff)
9. Frontend linting (ESLint)
10. Build frontend production bundle
11. Deploy status report

**Data Folder:**
- Local `./data/` folder is mounted in containers
- Gitignored for user-specific state
- `.gitkeep` ensures directory exists

**View Pipeline:**
- See [docs/DRONE_CI.md](docs/DRONE_CI.md) for full documentation
- Configuration: `.drone.yml`

---

## Docker Deployment

### Building & Running with Docker

See the comprehensive [Docker Deployment Guide](docs/DOCKER.md) for:
- Service architecture & configuration
- Development workflow with Docker
- Data persistence & volumes
- Networking & port management
- Troubleshooting & production deployment

**Quick commands:**
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Run tests inside container
docker compose exec backend pytest tests/ -v

# Stop services
docker compose down
```

### Images

- **Backend:** `kanban-backend` (Python 3.12 + FastAPI)
- **Frontend:** `kanban-frontend` (Node.js 20 + React/Vite)
- **Network:** `kanban-network` (bridge)
- **Volume:** `kanban-data` (persistent data storage)

---

## Testing

### Backend Tests

**Linux/macOS:**
```bash
# Run all tests
make test

# Watch mode (re-run on file change)
make test-watch

# Type checking
make type

# Linting
make lint

# Auto-fix linting issues
make lint-fix
```

**Windows (PowerShell):**
```powershell
# Run all tests
.venv\Scripts\pytest tests/ -v

# Watch mode (re-run on file change)
.venv\Scripts\pytest tests/ -v --tb=short -x

# Type checking
.venv\Scripts\mypy app/ --strict

# Linting
.venv\Scripts\ruff check app/

# Auto-fix linting issues
.venv\Scripts\ruff check app/ --fix
```

**Test Coverage:** 26 tests covering:
- Database initialization & schema
- All CRUD operations (Columns, Tasks, Epics, Comments)
- Content reading and error handling (missing files)
- Path security (traversal, absolute paths, symlinks)

### E2E Tests (Playwright)

**Prerequisites:** Backend must be running with an empty data folder.

**Terminal 1 — Start the backend:**
```bash
# Linux/macOS:
DATA_DIR=/tmp/e2e-data .venv/Scripts/python -m app serve --folder /tmp/e2e-data --port 8000

# Windows (PowerShell):
$env:DATA_DIR = 'C:\tmp\e2e-data'
.venv\Scripts\python -m app serve --folder C:\tmp\e2e-data --port 8000
```

**Terminal 2 — Run E2E tests:**
```bash
cd frontend

# Run all E2E tests
npm run e2e

# Run specific E2E test
npm run e2e -- poll-delivers-new-card

# Run in UI mode (interactive)
npm run e2e:ui

# Run in headed mode (see browser)
npm run e2e -- --headed

# Debug with inspector
npm run e2e:debug
```

**E2E Test Coverage:**
- Poll delivers new card within 6s with signal rule
- Board loads and displays columns
- Column headers visible and interactive
- Responsive design on mobile viewport

## Development

### Project Structure
```
kanban/
├── app/
│   ├── __init__.py
│   ├── __main__.py          # CLI entry point
│   ├── main.py              # FastAPI app + all endpoints
│   ├── database.py          # Schema initialization
│   ├── paths.py             # Path validation
│   └── config.py            # Configuration
├── tests/
│   ├── test_database.py
│   ├── test_columns.py
│   ├── test_tasks.py
│   ├── test_epics.py
│   ├── test_comments.py
│   └── test_path_security.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── src/                 # React components (to be implemented)
├── Makefile
├── pyproject.toml
└── docs/
    └── TDD.md                # Technical Design Document
```

### Development Workflow

**Linux/macOS:**
```bash
# Install dependencies
uv sync

# Start backend (watching for changes)
make dev FOLDER=/tmp/kanban-dev

# In another terminal, start frontend (optional)
cd frontend && npm install && npm run dev

# Run tests as you develop
make test-watch
```

**Windows (PowerShell):**
```powershell
# Install dependencies
uv sync

# Start backend
$env:DATA_DIR = 'C:\tmp\kanban-dev'
.venv\Scripts\python -m uvicorn app.main:create_app --reload --host 0.0.0.0 --port 8000 --factory

# In another terminal, start frontend (optional)
cd frontend; npm install; npm run dev

# Run tests as you develop
.venv\Scripts\pytest tests/ -v --tb=short -x
```

## Data Model

### Database Schema (SQLite)
```sql
CREATE TABLE columns (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE epics (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,      -- e.g., EPIC-001
  title TEXT NOT NULL,
  content_path TEXT NOT NULL,     -- relative path
  assignee TEXT,
  column_id INTEGER NOT NULL REFERENCES columns(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,      -- e.g., TASK-001
  epic_id INTEGER REFERENCES epics(id),  -- nullable
  title TEXT NOT NULL,
  content_path TEXT NOT NULL,
  assignee TEXT,
  column_id INTEGER NOT NULL REFERENCES columns(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,      -- 'epic' or 'task'
  entity_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,             -- markdown
  created_at TEXT NOT NULL
);
```

### Bootstrap Data
On initialization, three columns are created:
- **Todo** (position 0)
- **In Progress** (position 1)
- **Done** (position 2)

## Configuration

Environment variables:
- `DATA_DIR` — Path to data folder (required for CLI)
- `PYTHONPATH` — Set to `.` to run as module

## Status

**Backend:** ✅ Complete (26/26 tests passing)
- Database schema & initialization
- All CRUD APIs (Columns, Tasks, Epics, Comments)
- Content file handling (Markdown on disk)
- Path security validation
- Error handling (missing files, invalid paths)

**Frontend:** 🏗️ Scaffolding complete, implementation pending
- Project structure, configs, and dependencies ready
- Components to be implemented: Board, Epics, Detail views, Comment threads, DnD

**See:** `docs/TDD.md` for full design specification
