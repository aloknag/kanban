import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database


@pytest.mark.asyncio
async def test_get_tasks_returns_empty():
    """GET /api/tasks returns empty list initially."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/tasks")
            assert response.status_code == 200
            assert response.json() == []


@pytest.mark.asyncio
async def test_post_task_creates_task():
    """POST /api/tasks creates a task with generated slug."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        # Create a test markdown file
        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test Task\n\nContent here")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/tasks",
                json={
                    "title": "Implement auth",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )

            assert response.status_code == 201
            result = response.json()
            assert result["title"] == "Implement auth"
            assert result["content_path"] == "tasks/test.md"
            assert result["column_id"] == 1
            assert "slug" in result
            assert result["slug"].startswith("TASK-")
            assert "id" in result

            # Verify in list
            list_response = await client.get("/api/tasks")
            tasks = list_response.json()
            assert len(tasks) == 1
            assert tasks[0]["title"] == "Implement auth"


@pytest.mark.asyncio
async def test_get_task_detail_returns_content():
    """GET /api/tasks/{id} returns task with markdown content."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test Task\n\nContent here")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create task
            create_response = await client.post(
                "/api/tasks",
                json={
                    "title": "Implement auth",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )
            task_id = create_response.json()["id"]

            # Get detail
            response = await client.get(f"/api/tasks/{task_id}")
            assert response.status_code == 200
            result = response.json()
            assert result["title"] == "Implement auth"
            assert result["content"] == "# Test Task\n\nContent here"
            assert "content_path" in result
            assert "created_at" in result


@pytest.mark.asyncio
async def test_patch_task_changes_column():
    """PATCH /api/tasks/{id} can move task to different column."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create task in column 1 (Todo)
            create_response = await client.post(
                "/api/tasks",
                json={
                    "title": "Task",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )
            task_id = create_response.json()["id"]

            # Move to column 2 (In Progress)
            response = await client.patch(
                f"/api/tasks/{task_id}",
                json={"column_id": 2}
            )
            assert response.status_code == 200
            assert response.json()["column_id"] == 2

            # Verify change persisted
            detail_response = await client.get(f"/api/tasks/{task_id}")
            assert detail_response.json()["column_id"] == 2


@pytest.mark.asyncio
async def test_patch_task_changes_title():
    """PATCH /api/tasks/{id} can update title."""
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
                    "title": "Old title",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )
            task_id = create_response.json()["id"]

            response = await client.patch(
                f"/api/tasks/{task_id}",
                json={"title": "New title"}
            )
            assert response.json()["title"] == "New title"


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


@pytest.mark.asyncio
async def test_delete_task_removes_it():
    """DELETE /api/tasks/{id} removes task."""
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

            response = await client.delete(f"/api/tasks/{task_id}")
            assert response.status_code == 204

            list_response = await client.get("/api/tasks")
            assert len(list_response.json()) == 0


@pytest.mark.asyncio
async def test_task_with_missing_file():
    """GET /api/tasks/{id} returns content_error when file missing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "test.md").write_text("# Test\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create task
            create_response = await client.post(
                "/api/tasks",
                json={
                    "title": "Task",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )
            task_id = create_response.json()["id"]

            # Delete the file
            (tasks_dir / "test.md").unlink()

            # Get task — should have content_error
            response = await client.get(f"/api/tasks/{task_id}")
            assert response.status_code == 200
            result = response.json()
            assert result["content_error"] == "file_missing"
            assert result["content"] == ""
