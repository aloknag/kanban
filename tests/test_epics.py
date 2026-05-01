import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database


@pytest.mark.asyncio
async def test_get_epics_returns_empty():
    """GET /api/epics returns empty list initially."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/epics")
            assert response.status_code == 200
            assert response.json() == []


@pytest.mark.asyncio
async def test_post_epic_creates_epic():
    """POST /api/epics creates an epic with slug."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/epics",
                json={
                    "title": "User authentication",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )

            assert response.status_code == 201
            result = response.json()
            assert result["title"] == "User authentication"
            assert "slug" in result
            assert result["slug"].startswith("EPIC-")
            assert result["task_count"] == 0
            assert result["done_count"] == 0


@pytest.mark.asyncio
async def test_get_epic_detail_returns_content():
    """GET /api/epics/{id} returns epic with content."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n\nDetails here")

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

            response = await client.get(f"/api/epics/{epic_id}")
            assert response.status_code == 200
            result = response.json()
            assert result["title"] == "Epic"
            assert result["content"] == "# Epic\n\nDetails here"


@pytest.mark.asyncio
async def test_patch_epic_updates():
    """PATCH /api/epics/{id} updates epic."""
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
                    "title": "Old name",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )
            epic_id = create_response.json()["id"]

            response = await client.patch(
                f"/api/epics/{epic_id}",
                json={"title": "New name"}
            )
            assert response.json()["title"] == "New name"


@pytest.mark.asyncio
async def test_delete_epic_removes_it():
    """DELETE /api/epics/{id} removes epic."""
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

            response = await client.delete(f"/api/epics/{epic_id}")
            assert response.status_code == 204

            list_response = await client.get("/api/epics")
            assert len(list_response.json()) == 0
