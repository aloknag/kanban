import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database


@pytest.mark.asyncio
async def test_get_columns_returns_bootstrap_data():
    """GET /api/columns returns the three bootstrap columns."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/columns")

            assert response.status_code == 200
            columns = response.json()
            assert len(columns) == 3
            assert columns[0]["name"] == "Todo"
            assert columns[0]["position"] == 0
            assert columns[1]["name"] == "In Progress"
            assert columns[1]["position"] == 1
            assert columns[2]["name"] == "Done"
            assert columns[2]["position"] == 2


@pytest.mark.asyncio
async def test_post_columns_creates_column():
    """POST /api/columns creates a new column."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/columns",
                json={"name": "Review"}
            )

            assert response.status_code == 201
            result = response.json()
            assert result["name"] == "Review"
            assert result["position"] == 3
            assert "id" in result

            # Verify it was added to DB
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            assert len(columns) == 4
            assert columns[3]["name"] == "Review"


@pytest.mark.asyncio
async def test_patch_column_updates_name():
    """PATCH /api/columns/{id} updates column name."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get Todo column ID
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            todo_id = columns[0]["id"]

            # Update name
            response = await client.patch(
                f"/api/columns/{todo_id}",
                json={"name": "Backlog"}
            )

            assert response.status_code == 200
            result = response.json()
            assert result["name"] == "Backlog"

            # Verify change persisted
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            assert columns[0]["name"] == "Backlog"


@pytest.mark.asyncio
async def test_delete_column_removes_it():
    """DELETE /api/columns/{id} removes empty column."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create a new column
            post_response = await client.post(
                "/api/columns",
                json={"name": "Review"}
            )
            column_id = post_response.json()["id"]

            # Delete it
            response = await client.delete(f"/api/columns/{column_id}")
            assert response.status_code == 204

            # Verify it's gone
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            assert len(columns) == 3  # Back to bootstrap only
            assert all(c["id"] != column_id for c in columns)


@pytest.mark.asyncio
async def test_reorder_columns():
    """PATCH /api/columns/reorder reorders columns."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get column IDs
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            ids = [c["id"] for c in columns]

            # Reorder: Done -> In Progress -> Todo
            response = await client.patch(
                "/api/columns/reorder",
                json={"ids": [ids[2], ids[1], ids[0]]}
            )

            assert response.status_code == 200

            # Verify order changed
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            assert columns[0]["id"] == ids[2]  # Done first
            assert columns[0]["position"] == 0
            assert columns[1]["id"] == ids[1]  # In Progress second
            assert columns[1]["position"] == 1
            assert columns[2]["id"] == ids[0]  # Todo third
            assert columns[2]["position"] == 2
