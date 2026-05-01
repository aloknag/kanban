import pytest
import tempfile
import sqlite3
from pathlib import Path
from app.database import init_database


@pytest.mark.asyncio
async def test_database_initialization_creates_schema():
    """Database initialization creates tables and bootstrap data."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)

        # Initialize database
        await init_database(data_folder)

        # Verify kanban.db was created
        db_path = data_folder / "kanban.db"
        assert db_path.exists(), "kanban.db should be created"

        # Connect and verify schema
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check tables exist
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = {row[0] for row in cursor.fetchall()}
        expected_tables = {"columns", "epics", "tasks", "comments"}
        assert tables == expected_tables, f"Expected {expected_tables}, got {tables}"

        # Check bootstrap columns
        cursor.execute("SELECT name, position FROM columns ORDER BY position")
        columns = cursor.fetchall()
        assert len(columns) == 3, "Should have 3 bootstrap columns"
        assert columns[0] == ("Todo", 0)
        assert columns[1] == ("In Progress", 1)
        assert columns[2] == ("Done", 2)

        conn.close()
