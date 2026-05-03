.PHONY: dev build start test lint type clean docker-up docker-down docker-build docker-logs docker-ps docker-clean

dev:
	@if [ -z "$(FOLDER)" ]; then echo "Usage: make dev FOLDER=/path/to/data"; exit 1; fi
	@echo "Starting Kanban development server..."
	@PYTHONPATH=. DATA_DIR=$(FOLDER) .venv/Scripts/python -m uvicorn app.main:create_app --reload --host 0.0.0.0 --port 8000 --factory

build:
	@echo "Building project..."
	cd frontend && npm run build || exit 1
	@echo "Build complete"

start:
	@if [ -z "$(FOLDER)" ]; then echo "Usage: make start FOLDER=/path/to/data"; exit 1; fi
	@echo "Starting Kanban server..."
	@PYTHONPATH=. DATA_DIR=$(FOLDER) .venv/Scripts/uvicorn app.main:app --host 0.0.0.0 --port 8000

test:
	.venv/Scripts/pytest tests/ -v

test-watch:
	.venv/Scripts/pytest tests/ -v --tb=short -x

type:
	.venv/Scripts/mypy app/ --strict

lint:
	.venv/Scripts/ruff check app/

lint-fix:
	.venv/Scripts/ruff check app/ --fix

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache

# Docker commands
docker-up:
	@echo "Starting Docker services..."
	docker compose up -d
	@echo "Services are running:"
	@docker compose ps
	@echo ""
	@echo "Access:"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:8000/api"
	@echo "  Swagger:  http://localhost:8000/docs"

docker-down:
	@echo "Stopping Docker services..."
	docker compose down

docker-build:
	@echo "Building Docker images..."
	docker compose build

docker-logs:
	docker compose logs -f

docker-ps:
	docker compose ps

docker-clean:
	@echo "Removing containers, images, and volumes..."
	docker compose down -v
	@echo "Cleanup complete"
