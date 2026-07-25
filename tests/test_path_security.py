import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database


@pytest.mark.asyncio
async def test_reject_path_traversal():
    """POST /api/tasks rejects path traversal attacks."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/tasks",
                json={
                    "title": "Attack",
                    "content_path": "../../../etc/passwd",
                    "column_id": 1
                }
            )

            assert response.status_code == 400
            # FastAPI HTTPException returns detail, not error
            assert "invalid_path" in str(response.json().get("detail", ""))


@pytest.mark.asyncio
async def test_reject_absolute_path():
    """POST /api/tasks rejects absolute paths."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/tasks",
                json={
                    "title": "Attack",
                    "content_path": "/etc/passwd",
                    "column_id": 1
                }
            )

            assert response.status_code == 400


@pytest.mark.asyncio
async def test_allow_valid_relative_path():
    """POST /api/tasks accepts valid relative paths."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        (tasks_dir / "valid.md").write_text("# Valid\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/tasks",
                json={
                    "title": "Valid",
                    "content_path": "tasks/valid.md",
                    "column_id": 1
                }
            )

            assert response.status_code == 201


@pytest.mark.asyncio
async def test_epic_path_validation():
    """POST /api/epics rejects unsafe paths."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/epics",
                json={
                    "title": "Attack",
                    "content_path": "../../sensitive.md",
                    "column_id": 1
                }
            )

            assert response.status_code == 400


@pytest.mark.asyncio
async def test_patch_task_rejects_path_traversal():
    """PATCH /api/tasks/{id} rejects path traversal attacks in content_path."""
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
                json={"content_path": "../../etc/passwd"}
            )

            assert response.status_code == 400
            assert "invalid_path" in str(response.json().get("detail", ""))


@pytest.mark.asyncio
async def test_patch_epic_rejects_path_traversal():
    """PATCH /api/epics/{id} rejects path traversal attacks in content_path."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/epics",
                json={
                    "title": "Epic",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )
            epic_id = create_response.json()["id"]

            response = await client.patch(
                f"/api/epics/{epic_id}",
                json={"content_path": "../../etc/passwd"}
            )

            assert response.status_code == 400
            assert "invalid_path" in str(response.json().get("detail", ""))
