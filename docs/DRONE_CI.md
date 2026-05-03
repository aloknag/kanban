# Drone CI Configuration Guide

Drone CI pipeline for building, testing, and deploying the Kanban application using Docker.

## Overview

The `.drone.yml` file defines a 13-step pipeline that:
1. **Builds** Docker images for backend and frontend
2. **Tests** both backend and frontend code
3. **Lints** code for quality
4. **Deploys** services locally using docker-compose
5. **Verifies** health checks

---

## Pipeline Stages

### Step 1: Prepare Environment
- **Image:** `alpine:latest`
- **Purpose:** Create data directory structure
- **Output:** `./data/epics/`, `./data/tasks/`

### Step 2: Build Backend Image
- **Image:** `docker:dind` (Docker-in-Docker)
- **Purpose:** Build FastAPI backend image
- **Tags:** `kanban-backend:{commit-hash}`, `kanban-backend:latest`

### Step 3: Build Frontend Image
- **Image:** `docker:dind`
- **Purpose:** Build React/Vite frontend image
- **Tags:** `kanban-frontend:{commit-hash}`, `kanban-frontend:latest`

### Step 4: Start Services
- **Image:** `docker/compose:latest`
- **Purpose:** Start backend and frontend with docker-compose
- **Mount:** Local `./data/` folder to container `/data`
- **Services:**
  - Backend on `http://localhost:8000`
  - Frontend on `http://localhost:5173`

### Step 5: Health Check
- **Image:** `curlimages/curl:latest`
- **Purpose:** Verify backend is responding (30 retries, 2s each)
- **Test:** `GET /api/columns`

### Step 6: Test Backend
- **Image:** `python:3.12-slim`
- **Purpose:** Run pytest on backend tests
- **Command:** `pytest tests/ -v`

### Step 7: Test Frontend (Unit Tests)
- **Image:** `node:20-alpine`
- **Purpose:** Run Vitest unit tests
- **Command:** `npm run test -- --run`

### Step 8: Test Frontend (Type Checks)
- **Image:** `node:20-alpine`
- **Purpose:** Run TypeScript type checking
- **Command:** `npm run type-check`

### Step 9: Lint Backend
- **Image:** `python:3.12-slim`
- **Purpose:** Run Ruff linting on Python code
- **Command:** `ruff check app/`

### Step 10: Lint Frontend
- **Image:** `node:20-alpine`
- **Purpose:** Run ESLint on React code
- **Command:** `npm run lint`

### Step 11: Build Frontend Bundle
- **Image:** `node:20-alpine`
- **Purpose:** Build production React bundle
- **Command:** `npm run build`

### Step 12: Deployment Status
- **Image:** `docker/compose:latest`
- **Purpose:** Display final status and access URLs
- **Output:** Service status, data folder contents

### Step 13: Cleanup (Optional)
- **Image:** `docker/compose:latest`
- **Purpose:** Stop and remove containers
- **Status:** Runs on success or failure (commented out by default)

---

## Data Folder

The pipeline uses the local `./data` folder to store persistent data:

```
data/
├── kanban.db        # SQLite database (created by backend)
├── epics/           # Epic markdown files
└── tasks/           # Task markdown files
```

### Gitignore

The `data/` folder is ignored by git (except `.gitkeep`):

```gitignore
data/
!data/.gitkeep
```

This allows:
- Developers to have local data that doesn't interfere with git
- `.gitkeep` ensures the directory exists in the repository
- CI pipeline can use local data for testing

---

## Triggering the Pipeline

The pipeline runs on:
- **Branch:** `main`, `develop`
- **Event:** `push`, `pull_request`

### Example Triggers

```bash
# Trigger on push to main
git push origin main

# Trigger on push to develop
git push origin develop

# Trigger on pull request
# (Automatically triggers when PR is created)
```

### Skip Pipeline

To skip the pipeline for a commit:
```bash
git commit -m "docs: update README" --no-verify
# Note: This skips pre-commit hooks, not Drone CI
```

To skip via Drone, use the Drone CLI:
```bash
drone build skip <repo> <build>
```

---

## Environment Variables

### Available in Pipeline

```yaml
DRONE_COMMIT_SHA        # Full commit hash
DRONE_COMMIT_SHA:0:7    # Short hash (7 chars)
DRONE_REPO              # Repository name
DRONE_BRANCH            # Branch name
DRONE_PULL_REQUEST      # PR number (if applicable)
DRONE_BUILD_NUMBER      # Build number
```

### Custom Variables

```yaml
environment:
  DATA_DIR: ./data                # Local data folder mount
  DOCKER_BUILDKIT: 1              # Enable Docker BuildKit
```

---

## Volumes

The pipeline mounts the Docker socket to enable Docker commands:

```yaml
volumes:
  - name: docker-socket
    host:
      path: /var/run/docker.sock
```

This allows:
- Building Docker images within the pipeline
- Running docker-compose to start services
- Managing containers from pipeline steps

---

## Error Handling

### Test Failures

If any test fails, the pipeline stops and the build is marked **failed**:
- Backend tests fail → Pipeline stops
- Frontend tests fail → Pipeline stops
- Linting fails → Pipeline stops

### Health Check Failure

If the backend doesn't respond within 60 seconds (30 retries × 2s):
- Health check step fails
- Pipeline stops (unless subsequent steps don't depend on it)

### Service Startup Failure

If docker-compose fails to start:
- Start-services step fails
- Pipeline stops

---

## Success vs. Failure

### Success Path
✅ All steps complete  
✅ All tests pass  
✅ All lint checks pass  
✅ Services start successfully  
✅ Health check passes  

### Failure Path
❌ Any test fails → Pipeline stops  
❌ Lint fails → Pipeline stops  
❌ Service fails to start → Pipeline stops  
❌ Health check fails → Pipeline stops  

### Notifications

On failure, a separate pipeline runs to notify:
- Check logs at `http://drone.example.com`
- Or configure webhook notifications

---

## Debugging

### View Pipeline Logs

In Drone UI:
1. Go to repository page
2. Click on the build number
3. Expand each step to see logs

### Local Testing

To test the pipeline locally without Drone:

```bash
# Build images
docker build -f Dockerfile.backend -t kanban-backend:test .
docker build -f Dockerfile.frontend -t kanban-frontend:test .

# Start services
DATA_DIR=./data docker-compose up -d

# Run tests
pytest tests/ -v
cd frontend && npm run test

# Check health
curl http://localhost:8000/api/columns

# Stop services
docker-compose down
```

### SSH into Failed Build

Drone allows SSH access to failed builds (if configured):
```bash
drone build start <repo> <build-number>
```

Then use Drone CLI to connect.

---

## Configuration Customization

### Change Trigger Branch

Edit `.drone.yml`:
```yaml
trigger:
  branch:
    - main              # Change to your branch
    - develop
```

### Add Additional Tests

Add a new step:
```yaml
  - name: test-e2e
    image: node:20-alpine
    commands:
      - cd frontend && npm ci
      - npm run e2e
```

### Disable Specific Steps

Use `when` conditions:
```yaml
  - name: test-backend
    when:
      branch: [main, develop]  # Only on these branches
```

### Parallel Steps

Steps run sequentially by default. To run in parallel, group them (not recommended for shared resources like docker-compose).

---

## Performance Optimization

### Image Caching

Docker caches layers by default:
- Unchanged layers are reused
- Reduces build time

### Parallel Testing

Backend and frontend tests could run in parallel:
```yaml
  - name: test-backend
    # ...

  - name: test-frontend-unit
    # ...
    depends_on: []  # Doesn't wait for backend
```

### Pre-built Images

To avoid rebuilding on every push:
```bash
# Use docker registry (docker.io, gcr.io, etc.)
docker tag kanban-backend:latest docker.io/youruser/kanban-backend:latest
docker push docker.io/youruser/kanban-backend:latest
```

---

## Integration with Git Workflows

### Pull Request Checks

Drone automatically runs on pull requests:
1. Tests all commits in PR
2. Marks PR with status (success/failure)
3. Blocks merge if tests fail (if configured)

### Commit Status

Each commit shows status:
- ✅ **Success** — All checks passed
- ❌ **Failure** — One or more checks failed
- ⏳ **Pending** — Build in progress

### Branch Protection

Configure GitHub to require Drone status:
1. Repository Settings → Branches
2. Add branch protection rule
3. Require Drone CI to pass

---

## References

- [Drone Documentation](https://docs.drone.io)
- [Docker-in-Docker](https://docs.drone.io/plugins/dind/)
- [Drone YAML Syntax](https://docs.drone.io/config/)
- [Pipeline Triggers](https://docs.drone.io/config/triggering/)
