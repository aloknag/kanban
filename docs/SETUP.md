# Setup & Deployment Guide

Complete guide to setting up the Kanban application.

## Table of Contents

1. [Docker (Recommended)](#docker-recommended)
2. [Local Development](#local-development)
3. [Project Structure](#project-structure)
4. [Troubleshooting](#troubleshooting)

---

## Docker (Recommended)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### One-Command Start

```bash
docker compose up -d
```

This starts:
- Backend API at `http://localhost:8000` (FastAPI + SQLite)
- Frontend UI at `http://localhost:5173` (React + Vite)
- Persistent data volume at `/data`

### Verify Services

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Kanban board UI |
| Backend API | http://localhost:8000/api | REST API endpoints |
| Swagger Docs | http://localhost:8000/docs | API documentation |
| Health Check | http://localhost:8000/api/columns | Backend health |

### Using Make Commands

```bash
make docker-up      # Start services
make docker-down    # Stop services
make docker-build   # Rebuild images
make docker-logs    # View logs
make docker-ps      # Show status
make docker-clean   # Remove all containers, images, volumes
```

### Full Docker Documentation

See [DOCKER.md](DOCKER.md) for:
- Service architecture details
- Development with Docker
- Data persistence & volumes
- Production deployment
- Troubleshooting

---

## Local Development

### Prerequisites
- Python 3.12+
- `uv` package manager ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- Node.js 18+ (optional, for frontend)

### Backend Setup

```bash
# Install dependencies
uv sync

# Create data directory
mkdir -p /tmp/kanban-data

# Start backend server
DATA_DIR=/tmp/kanban-data python -m uvicorn app.main:create_app --reload --host 0.0.0.0 --port 8000 --factory
```

Server runs at: `http://localhost:8000`

**macOS/Linux shorthand:**
```bash
make dev FOLDER=/tmp/kanban-data
```

### Frontend Setup (optional)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Run Tests

**Backend:**
```bash
make test           # Run all tests
make test-watch     # Watch mode
make type           # Type checking
make lint           # Linting
```

**Frontend:**
```bash
cd frontend
npm run test        # Unit tests
npm run e2e         # E2E tests
```

---

## Project Structure

```
kanban/
├── app/                          # Backend (FastAPI)
│   ├── __main__.py              # CLI entry point
│   ├── main.py                  # FastAPI app + endpoints
│   ├── database.py              # Schema initialization
│   ├── models.py                # Data models
│   ├── paths.py                 # Path validation
│   ├── config.py                # Configuration
│   └── static/                  # Built frontend (production)
├── frontend/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── routes/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── package.json
│   └── package-lock.json
├── tests/                        # Backend tests
│   ├── test_database.py
│   ├── test_columns.py
│   ├── test_tasks.py
│   ├── test_epics.py
│   ├── test_comments.py
│   └── test_path_security.py
├── docs/                         # Documentation
│   ├── DOCKER.md                # Docker deployment guide
│   └── SETUP.md                 # This file
├── Dockerfile.backend           # Backend Docker image
├── Dockerfile.frontend          # Frontend Docker image
├── docker-compose.yml           # Docker Compose orchestration
├── .dockerignore                # Docker build context exclusions
├── .env.example                 # Environment variables template
├── docker-compose.override.yml.example  # Development overrides example
├── Makefile                     # Build & test commands
├── pyproject.toml               # Python dependencies
├── uv.lock                      # Locked Python dependencies
├── README.md                    # Main documentation
├── TDD.md                       # Technical design document
└── FrontEngDesign.md            # Frontend design spec
```

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

**Key variables:**
- `DATA_DIR` — Path to persistent data folder (default: `/data`)
- `VITE_API_BASE_URL` — Frontend API endpoint (default: `http://backend:8000/api`)
- `PYTHONUNBUFFERED` — Enable unbuffered Python output (default: `1`)

### Docker Compose Override

For custom development setup:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

Then edit to add:
- Source code mounts for hot reload
- Custom ports
- Additional services (Adminer, MailHog, etc.)

Docker Compose automatically merges `docker-compose.override.yml` with `docker-compose.yml`.

---

## Data & Persistence

### Default Setup (Docker Volume)

Data is stored in the `kanban-data` volume, which persists across restarts:

```bash
# Inspect volume
docker volume inspect kanban-data

# Backup data
docker run --rm -v kanban-data:/data -v $(pwd):/backup alpine cp -r /data /backup/kanban-backup
```

### Local Data Directory (Development)

To use a host directory instead:

1. Edit `docker-compose.yml`:
   ```yaml
   volumes:
     - /path/to/local/kanban-data:/data
   ```

2. Restart services:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Data Structure

```
/data/
├── kanban.db              # SQLite database with metadata
├── epics/                 # Epic markdown files
│   └── EPIC-001.md
└── tasks/                 # Task markdown files
    └── TASK-001.md
```

---

## API Endpoints

All endpoints are under `/api`. Full spec in [TDD.md](../TDD.md).

### Examples

```bash
# List columns
curl http://localhost:8000/api/columns

# Create task
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Setup database",
    "content_path": "tasks/setup.md",
    "column_id": 1
  }'

# Get task details
curl http://localhost:8000/api/tasks/1
```

---

## Troubleshooting

### Docker Services Won't Start

```bash
# Check logs
docker compose logs

# Verify Docker daemon
docker ps

# Rebuild images
docker compose build --no-cache

# Full reset
docker compose down -v
docker compose up -d
```

### Backend Can't Access Data Directory

```bash
# Verify volume is mounted
docker compose exec backend ls -la /data

# Check volume permissions
docker exec kanban-backend chmod -R 755 /data
```

### Frontend Can't Reach Backend

Ensure `VITE_API_BASE_URL` points to the correct address:
- In container: `http://backend:8000/api`
- From host machine: `http://localhost:8000/api`

### Port Already in Use

Change port in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

### Clean Local Development

```bash
# Reset Python environment
rm -rf .venv
uv sync

# Reset frontend
rm -rf frontend/node_modules
npm install --prefix frontend
```

---

## Next Steps

1. **Read the design documents:**
   - [FrontEngDesign.md](../FrontEngDesign.md) — UI/UX architecture
   - [TDD.md](../TDD.md) — Technical design & API spec
   - [DOCKER.md](DOCKER.md) — Docker deployment in detail

2. **Run tests:**
   ```bash
   make test
   cd frontend && npm run test
   ```

3. **Start developing:**
   ```bash
   docker compose up -d
   # OR: make dev FOLDER=/tmp/kanban-data
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000/api
   - Docs: http://localhost:8000/docs

---

## Common Tasks

### Add a New Endpoint

1. Add route in `app/main.py`
2. Write tests in `tests/test_*.py`
3. Run `make test` to verify
4. Frontend auto-discovers via polling

### Deploy to Production

See [DOCKER.md — Production Deployment](DOCKER.md#production-deployment) for:
- Building secure images
- Setting resource limits
- Configuring reverse proxy (Nginx)
- Logging & monitoring

### Debug with Container Shell

```bash
# Backend Python shell
docker compose exec backend python

# Frontend Node shell
docker compose exec frontend sh

# Run arbitrary command
docker compose exec backend pytest tests/test_database.py -v
```

---

**Need help?** Check [DOCKER.md](DOCKER.md) for more detailed documentation.
