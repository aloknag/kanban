import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database


@pytest.mark.asyncio
async def test_get_columns_returns_bootstrap_data():
    """GET /api/columns returns the three bootstrap columns with task_count."""
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
            assert columns[0]["task_count"] == 0
            assert columns[1]["name"] == "In Progress"
            assert columns[1]["position"] == 1
            assert columns[1]["task_count"] == 0
            assert columns[2]["name"] == "Done"
            assert columns[2]["position"] == 2
            assert columns[2]["task_count"] == 0


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
async def test_patch_column_rejects_empty_name():
    """PATCH /api/columns/{id} rejects an empty string name (bug #61)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            list_response = await client.get("/api/columns")
            todo_id = list_response.json()[0]["id"]

            response = await client.patch(
                f"/api/columns/{todo_id}",
                json={"name": ""}
            )
            assert response.status_code == 400

            # The column's name must not have been corrupted by the rejected request
            list_response = await client.get("/api/columns")
            assert list_response.json()[0]["name"] == "Todo"


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


@pytest.mark.asyncio
async def test_get_columns_task_count_with_non_epic_tasks():
    """GET /api/columns includes task_count for non-epic tasks."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get Todo column ID
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            todo_id = columns[0]["id"]

            # Create a non-epic task in Todo
            await client.post(
                "/api/tasks",
                json={
                    "title": "Test Task 1",
                    "content_path": "tasks/test1.md",
                    "column_id": todo_id,
                }
            )

            # Create another non-epic task in Todo
            await client.post(
                "/api/tasks",
                json={
                    "title": "Test Task 2",
                    "content_path": "tasks/test2.md",
                    "column_id": todo_id,
                }
            )

            # Get columns and verify task_count
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            todo_column = next(c for c in columns if c["id"] == todo_id)

            assert todo_column["task_count"] == 2


@pytest.mark.asyncio
async def test_get_columns_task_count_includes_epic_tasks():
    """GET /api/columns task_count includes tasks with epic_id (bug #55 -- must match actual per-column count)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get Todo column ID
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            todo_id = columns[0]["id"]

            # Create an epic
            epic_response = await client.post(
                "/api/epics",
                json={
                    "title": "Test Epic",
                    "content_path": "epics/test.md",
                    "column_id": todo_id,
                }
            )
            epic_id = epic_response.json()["id"]

            # Create a non-epic task
            await client.post(
                "/api/tasks",
                json={
                    "title": "Non-Epic Task",
                    "content_path": "tasks/test1.md",
                    "column_id": todo_id,
                }
            )

            # Create an epic task
            await client.post(
                "/api/tasks",
                json={
                    "title": "Epic Task",
                    "content_path": "tasks/test2.md",
                    "column_id": todo_id,
                    "epic_id": epic_id,
                }
            )

            # Get columns and verify task_count counts both tasks, epic-linked or not
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            todo_column = next(c for c in columns if c["id"] == todo_id)

            assert todo_column["task_count"] == 2


@pytest.mark.asyncio
async def test_reorder_columns_rejects_partial_id_list():
    """PATCH /api/columns/reorder rejects incomplete ID lists."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get column IDs
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            ids = [c["id"] for c in columns]

            # Try to reorder with only 2 out of 3 columns
            # This should be rejected as it's not a valid reorder of all columns
            response = await client.patch(
                "/api/columns/reorder",
                json={"ids": [ids[0], ids[1]]}  # Missing ids[2]
            )

            assert response.status_code == 400
            error = response.json()
            assert "detail" in error
            assert "all columns" in error.get("detail", "").lower()


@pytest.mark.asyncio
async def test_reorder_columns_rejects_invalid_ids():
    """PATCH /api/columns/reorder rejects lists with non-existent IDs."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get column IDs
            list_response = await client.get("/api/columns")
            columns = list_response.json()
            ids = [c["id"] for c in columns]

            # Try to reorder with a non-existent ID
            response = await client.patch(
                "/api/columns/reorder",
                json={"ids": [ids[0], ids[1], ids[2], 99999]}  # 99999 doesn't exist
            )

            assert response.status_code == 400
            error = response.json()
            assert "detail" in error


@pytest.mark.asyncio
async def test_delete_column_with_tasks_returns_409():
    """DELETE /api/columns/{id} returns 409, not 500, when the column still has tasks (bug #56)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            list_response = await client.get("/api/columns")
            todo_id = list_response.json()[0]["id"]

            await client.post(
                "/api/tasks",
                json={
                    "title": "Blocking task",
                    "content_path": "tasks/blocking.md",
                    "column_id": todo_id,
                }
            )

            response = await client.delete(f"/api/columns/{todo_id}")
            assert response.status_code == 409

            # Column must still exist — delete must not have partially applied
            list_response = await client.get("/api/columns")
            assert any(c["id"] == todo_id for c in list_response.json())


@pytest.mark.asyncio
async def test_delete_column_with_epic_returns_409():
    """DELETE /api/columns/{id} also blocks when an epic (not just a task) references it."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        (epics_dir / "test.md").write_text("# Epic\n")

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            list_response = await client.get("/api/columns")
            todo_id = list_response.json()[0]["id"]

            await client.post(
                "/api/epics",
                json={
                    "title": "Blocking epic",
                    "content_path": "epics/test.md",
                    "column_id": todo_id,
                }
            )

            response = await client.delete(f"/api/columns/{todo_id}")
            assert response.status_code == 409
