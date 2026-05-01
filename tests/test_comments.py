import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database


@pytest.mark.asyncio
async def test_get_task_comments_empty():
    """GET /api/tasks/{id}/comments returns empty initially."""
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

            # Get comments
            response = await client.get(f"/api/tasks/{task_id}/comments")
            assert response.status_code == 200
            assert response.json() == []


@pytest.mark.asyncio
async def test_post_task_comment():
    """POST /api/tasks/{id}/comments creates a comment."""
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

            # Add comment
            response = await client.post(
                f"/api/tasks/{task_id}/comments",
                json={"author": "Claude", "body": "Working on this"}
            )

            assert response.status_code == 201
            result = response.json()
            assert result["author"] == "Claude"
            assert result["body"] == "Working on this"
            assert "created_at" in result

            # Verify in list
            list_response = await client.get(f"/api/tasks/{task_id}/comments")
            comments = list_response.json()
            assert len(comments) == 1
            assert comments[0]["body"] == "Working on this"


@pytest.mark.asyncio
async def test_get_epic_comments():
    """GET /api/epics/{id}/comments returns comments."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create epic
            create_response = await client.post(
                "/api/epics",
                json={
                    "title": "Epic",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )
            epic_id = create_response.json()["id"]

            # Add comments
            await client.post(
                f"/api/epics/{epic_id}/comments",
                json={"author": "Claude", "body": "Started work"}
            )
            await client.post(
                f"/api/epics/{epic_id}/comments",
                json={"author": "Agent", "body": "In progress"}
            )

            # Get comments
            response = await client.get(f"/api/epics/{epic_id}/comments")
            assert response.status_code == 200
            comments = response.json()
            assert len(comments) == 2
            assert comments[0]["body"] == "Started work"
            assert comments[1]["body"] == "In progress"


@pytest.mark.asyncio
async def test_post_epic_comment():
    """POST /api/epics/{id}/comments creates comment."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create epic
            create_response = await client.post(
                "/api/epics",
                json={
                    "title": "Epic",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )
            epic_id = create_response.json()["id"]

            # Add comment
            response = await client.post(
                f"/api/epics/{epic_id}/comments",
                json={"author": "Claude", "body": "Great progress"}
            )

            assert response.status_code == 201
            result = response.json()
            assert result["author"] == "Claude"
            assert result["body"] == "Great progress"
