# Docker Deployment Guide

This guide covers how to build, run, and manage the Kanban application using Docker and Docker Compose.

## Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+

### Installation

- **Linux:** [Docker Installation Guide](https://docs.docker.com/engine/install/)
- **macOS:** [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Windows:** [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

Verify installation:
```bash
docker --version
docker compose --version
```

---

## Quick Start

### 1. Clone & Navigate

```bash
cd kanban
```

### 2. Start Services

```bash
docker compose up -d
```

This will:
- Build backend (FastAPI) and frontend (React) Docker images
- Start both services in the background
- Create a persistent volume for data (`kanban-data`)
- Expose:
  - Backend: `http://localhost:8000` (API)
  - Frontend: `http://localhost:5173` (UI)

### 3. Verify Services

```bash
# Check running containers
docker compose ps

# Expected output:
# NAME                  STATUS          PORTS
# kanban-backend        Up (healthy)    0.0.0.0:8000->8000/tcp
# kanban-frontend       Up (healthy)    0.0.0.0:5173->5173/tcp
```

### 4. Access the Application

- **Frontend UI:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **API Docs (Swagger):** http://localhost:8000/docs

### 5. Stop Services

```bash
docker compose down
```

To also remove the persistent data volume:
```bash
docker compose down -v
```

---

## Development Workflow

### Live Development (with hot reload)

For **local development** (without Docker), use:

**Backend (Python):**
```bash
uv sync
DATA_DIR=/tmp/kanban-dev python -m uvicorn app.main:create_app --reload --host 0.0.0.0 --port 8000 --factory
```

**Frontend (React):**
```bash
cd frontend
npm install
npm run dev
```

### Docker Development (with container isolation)

Use Docker but rebuild on code changes:

```bash
# Rebuild and restart services
docker compose up --build

# View logs from both services
docker compose logs -f

# View logs from specific service
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Service Architecture

### Backend Service

**Image:** `kanban-backend` (built from `Dockerfile.backend`)

**Stack:**
- Python 3.12 on Alpine Linux
- FastAPI with Uvicorn
- SQLite database
- Async request handling

**Environment Variables:**
- `DATA_DIR=/data` — Path to persistent data folder
- `PYTHONUNBUFFERED=1` — Unbuffered Python output (for logs)

**Volume:**
- `/data` → Persistent volume `kanban-data`
  - Stores `kanban.db`, `epics/`, `tasks/` directories

**Port:** `8000`

**Health Check:** Queries `GET /api/columns` every 10s

**Network:** `kanban-network` (bridge)

### Frontend Service

**Image:** `kanban-frontend` (built from `Dockerfile.frontend`)

**Stack:**
- Node.js 20 on Alpine Linux
- React 19 + Vite (production build)
- `serve` package for static file hosting

**Build Process:**
1. Multi-stage build: `npm install` → `npm run build` → copy dist
2. Final image is minimal (only `dist/` folder)

**Environment Variables:**
- `VITE_API_BASE_URL=http://backend:8000/api` — API base URL (container network)

**Port:** `5173`

**Health Check:** Queries `GET http://localhost:5173/` every 10s

**Network:** `kanban-network` (bridge)

**Depends On:** Backend service (waits for health check)

---

## Common Commands

### Build Images Manually

```bash
# Build all services
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend

# Rebuild without cache (clean build)
docker compose build --no-cache
```

### Start/Stop Services

```bash
# Start services
docker compose up -d

# Start and watch logs
docker compose up

# Stop services
docker compose stop

# Restart services
docker compose restart

# Restart specific service
docker compose restart backend
```

### Logs & Debugging

```bash
# View all logs
docker compose logs

# View logs with timestamps
docker compose logs -t

# Follow logs (tail -f)
docker compose logs -f

# Follow specific service
docker compose logs -f backend

# Show last 50 lines
docker compose logs --tail 50
```

### Accessing Container Shell

```bash
# Backend shell (Python)
docker compose exec backend sh

# Frontend shell (Node)
docker compose exec frontend sh
```

### Running Commands in Containers

```bash
# Run backend tests
docker compose exec backend pytest tests/ -v

# Run backend type checking
docker compose exec backend mypy app/ --strict

# Run frontend tests
docker compose exec frontend npm run test

# Run frontend build
docker compose exec frontend npm run build
```

### Clean Up

```bash
# Stop and remove containers
docker compose down

# Remove dangling images
docker image prune -f

# Remove all unused resources (images, containers, networks, volumes)
docker system prune -a --volumes

# Remove specific volume
docker volume rm kanban-data
```

---

## Data Persistence

### Default Behavior

- Data is stored in Docker volume `kanban-data`
- Volume persists across container restarts
- Volume location varies by platform:
  - **Linux:** `/var/lib/docker/volumes/kanban-data/_data/`
  - **macOS:** `/var/lib/docker/volumes/kanban-data/_data/` (Docker Desktop VM)
  - **Windows:** `\\wsl$\docker-desktop\mnt\wsl\docker-desktop-data\version-pack-data\communityengine\volumes\`

### Inspect Volume

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect kanban-data

# Copy data from volume to host
docker run --rm -v kanban-data:/data -v $(pwd):/backup alpine cp -r /data /backup/kanban-data-backup
```

### Custom Data Location

To bind-mount a local directory instead of using a volume, edit `docker-compose.yml`:

```yaml
# Replace:
volumes:
  - kanban-data:/data

# With:
volumes:
  - /path/to/local/kanban-data:/data
```

Then restart:
```bash
docker compose down
docker compose up -d
```

---

## Networking

### Container-to-Container Communication

Inside the `kanban-network` bridge:
- Backend is accessible as `http://backend:8000` (from frontend container)
- Frontend is accessible as `http://frontend:5173` (from backend container)

This is why the frontend's `vite.config.ts` can use `http://backend:8000/api` for API calls in the container environment.

### Host Machine Access

From your host machine:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

### External Network Access

To allow external machines to access:
1. Ensure ports are exposed (already done in `docker-compose.yml`)
2. Allow firewall rules if needed
3. Use your machine's IP address instead of `localhost`

Example: `http://192.168.1.100:5173` (if host is at 192.168.1.100)

---

## Performance & Optimization

### Image Sizes

Current builds:
- **Backend:** ~200-300 MB (Python 3.12 slim + dependencies)
- **Frontend:** ~50-100 MB (Alpine Node 20 + dist)

To reduce size further:
- Use `python:3.12-slim-bullseye` or `python:3.12-alpine`
- Optimize frontend bundle (tree-shaking, code splitting)
- Use `.dockerignore` aggressively

### Build Caching

Docker caches layers. Optimize by:
1. Placing frequently-changing files later in the Dockerfile
2. Grouping `RUN` commands
3. Using specific versions (avoid `latest` tags)

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs backend

# Verify health
docker compose ps
```

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows PowerShell

# Or change port in docker-compose.yml:
# ports:
#   - "8001:8000"  # Use 8001 instead
```

### Backend Can't Find Data

```bash
# Verify volume is mounted
docker compose exec backend ls -la /data

# Check volume
docker volume inspect kanban-data
```

### Frontend Can't Reach Backend

Check API URL in frontend:
- In container environment: `http://backend:8000/api`
- From host machine: `http://localhost:8000/api`

The frontend's `vite.config.ts` should use container-relative URLs.

### Permissions Denied

Ensure files are readable:
```bash
# From host machine
chmod -R 755 /path/to/kanban

# Or run containers with user override
docker compose exec -u root backend chown -R nobody:nogroup /data
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Set environment variables securely (use `.env` file)
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Configure resource limits (memory, CPU)
- [ ] Set up log aggregation (ELK, Prometheus, etc.)
- [ ] Implement backup strategy for `kanban-data` volume
- [ ] Test disaster recovery

### Example: Nginx Reverse Proxy

Create `nginx.conf`:
```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:5173;
}

server {
    listen 80;
    server_name kanban.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kanban.example.com;

    ssl_certificate /etc/nginx/certs/kanban.crt;
    ssl_certificate_key /etc/nginx/certs/kanban.key;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add to `docker-compose.yml`:
```yaml
nginx:
  image: nginx:latest
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
    - ./certs:/etc/nginx/certs
  depends_on:
    - backend
    - frontend
```

### Resource Limits

Add to `docker-compose.yml` services:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### Logging

Use Docker's logging drivers:
```yaml
backend:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Python Docker Images](https://docs.docker.com/language/python/build-images/)
- [Best Practices for Node.js Docker Images](https://docs.docker.com/language/nodejs/build-images/)
