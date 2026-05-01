import aiosqlite
from pathlib import Path
from datetime import datetime, timezone


async def init_database(data_folder: Path) -> None:
    """Initialize database with schema and bootstrap data."""
    db_path = data_folder / "kanban.db"

    async with aiosqlite.connect(str(db_path)) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")

        # Create tables
        await db.execute("""
            CREATE TABLE IF NOT EXISTS columns (
                id          INTEGER PRIMARY KEY,
                name        TEXT NOT NULL,
                position    INTEGER NOT NULL,
                created_at  TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS epics (
                id            INTEGER PRIMARY KEY,
                slug          TEXT NOT NULL UNIQUE,
                title         TEXT NOT NULL,
                content_path  TEXT NOT NULL,
                assignee      TEXT,
                column_id     INTEGER NOT NULL REFERENCES columns(id),
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id            INTEGER PRIMARY KEY,
                slug          TEXT NOT NULL UNIQUE,
                epic_id       INTEGER REFERENCES epics(id),
                title         TEXT NOT NULL,
                content_path  TEXT NOT NULL,
                assignee      TEXT,
                column_id     INTEGER NOT NULL REFERENCES columns(id),
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id           INTEGER PRIMARY KEY,
                entity_type  TEXT NOT NULL CHECK (entity_type IN ('epic','task')),
                entity_id    INTEGER NOT NULL,
                author       TEXT NOT NULL,
                body         TEXT NOT NULL,
                created_at   TEXT NOT NULL
            )
        """)

        # Create indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_epic ON tasks(epic_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_comments_lookup ON comments(entity_type, entity_id)")

        # Bootstrap columns (only if they don't exist)
        cursor = await db.execute("SELECT COUNT(*) FROM columns")
        count = await cursor.fetchone()

        if count[0] == 0:
            now = datetime.now(timezone.utc).isoformat()
            await db.execute(
                "INSERT INTO columns (name, position, created_at) VALUES (?, ?, ?)",
                ("Todo", 0, now)
            )
            await db.execute(
                "INSERT INTO columns (name, position, created_at) VALUES (?, ?, ?)",
                ("In Progress", 1, now)
            )
            await db.execute(
                "INSERT INTO columns (name, position, created_at) VALUES (?, ?, ?)",
                ("Done", 2, now)
            )

        await db.commit()
