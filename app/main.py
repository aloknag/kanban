from fastapi import FastAPI, HTTPException
from pathlib import Path
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, cast

from app.database import init_database
from app.paths import validate_content_path, read_content, get_excerpt_cached
from app.models import ColumnResponse


def create_app(data_folder: Path) -> FastAPI:
    """Create FastAPI app instance."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await init_database(data_folder)
        yield

    app = FastAPI(lifespan=lifespan)

    async def get_db() -> aiosqlite.Connection:
        """Get database connection."""
        db = await aiosqlite.connect(str(data_folder / "kanban.db"))
        return db

    @app.get("/api/columns", response_model=List[ColumnResponse])
    async def list_columns():
        """List all columns with task count."""
        db = await get_db()
        try:
            cursor = await db.execute(
                """SELECT 
                    c.id, c.name, c.position,
                    COUNT(t.id) as task_count
                FROM columns c
                LEFT JOIN tasks t ON c.id = t.column_id AND t.epic_id IS NULL
                GROUP BY c.id, c.name, c.position
                ORDER BY c.position"""
            )
            rows = await cursor.fetchall()
            return [ColumnResponse(
                id=row[0],
                name=row[1],
                position=row[2],
                task_count=row[3]
            ) for row in rows]
        finally:
            await db.close()

    @app.post("/api/columns", status_code=201, response_model=ColumnResponse)
    async def create_column(body: dict):
        """Create a new column."""
        db = await get_db()
        try:
            # Get next position
            cursor = await db.execute("SELECT MAX(position) FROM columns")
            max_pos = await cursor.fetchone()
            next_position = (max_pos[0] if max_pos[0] is not None else -1) + 1

            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO columns (name, position, created_at) VALUES (?, ?, ?)",
                (body["name"], next_position, now)
            )
            await db.commit()

            column_id = cast(int, cursor.lastrowid)
            return ColumnResponse(id=column_id, name=body["name"], position=next_position, task_count=0)
        finally:
            await db.close()

    @app.patch("/api/columns/reorder")
    async def reorder_columns(body: dict):
        """Reorder columns by updating positions."""
        db = await get_db()
        try:
            ids = body.get("ids", [])

            # Validate: must contain exactly the set of all existing column IDs
            cursor = await db.execute("SELECT id FROM columns")
            all_column_ids = set(row[0] for row in await cursor.fetchall())
            provided_ids = set(ids)

            # Check that provided IDs match exactly the columns in the database
            if provided_ids != all_column_ids:
                missing_ids = all_column_ids - provided_ids
                extra_ids = provided_ids - all_column_ids
                detail_parts = []
                if missing_ids:
                    detail_parts.append(f"missing columns: {sorted(missing_ids)}")
                if extra_ids:
                    detail_parts.append(f"invalid columns: {sorted(extra_ids)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Reorder must include all columns. {'; '.join(detail_parts)}"
                )

            # Update positions for each column
            for position, column_id in enumerate(ids):
                await db.execute(
                    "UPDATE columns SET position = ? WHERE id = ?",
                    (position, column_id)
                )
            await db.commit()
            return {"status": "ok"}
        finally:
            await db.close()

    @app.patch("/api/columns/{column_id}", response_model=ColumnResponse)
    async def update_column(column_id: int, body: dict):
        """Update a column."""
        db = await get_db()
        try:
            if "name" in body:
                await db.execute(
                    "UPDATE columns SET name = ? WHERE id = ?",
                    (body["name"], column_id)
                )
                await db.commit()

            cursor = await db.execute(
                """SELECT c.id, c.name, c.position,
                       COUNT(t.id) as task_count
                FROM columns c
                LEFT JOIN tasks t ON c.id = t.column_id AND t.epic_id IS NULL
                WHERE c.id = ?
                GROUP BY c.id, c.name, c.position""",
                (column_id,)
            )
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Not found")

            return ColumnResponse(id=row[0], name=row[1], position=row[2], task_count=row[3])
        finally:
            await db.close()

    @app.delete("/api/columns/{column_id}", status_code=204)
    async def delete_column(column_id: int):
        """Delete a column."""
        db = await get_db()
        try:
            await db.execute("DELETE FROM columns WHERE id = ?", (column_id,))
            await db.commit()
        finally:
            await db.close()

    @app.get("/api/tasks")
    async def list_tasks():
        """List all tasks with excerpt field."""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id, epic_id FROM tasks ORDER BY created_at DESC"
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                excerpt = get_excerpt_cached(row[3], data_folder)
                result.append({
                    "id": row[0],
                    "slug": row[1],
                    "title": row[2],
                    "assignee": row[4],
                    "column_id": row[5],
                    "epic_id": row[6],
                    "excerpt": excerpt,
                })
            return result
        finally:
            await db.close()

    @app.post("/api/tasks", status_code=201)
    async def create_task(body: dict):
        """Create a new task."""
        if not validate_content_path(body["content_path"], data_folder):
            raise HTTPException(status_code=400, detail="invalid_path")

        db = await get_db()
        try:
            # Get next slug
            cursor = await db.execute("SELECT COUNT(*) FROM tasks")
            count = await cursor.fetchone()
            task_number = count[0] + 1
            slug = f"TASK-{task_number:03d}"

            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO tasks (slug, title, content_path, assignee, column_id, epic_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    slug,
                    body["title"],
                    body["content_path"],
                    body.get("assignee"),
                    body["column_id"],
                    body.get("epic_id"),
                    now,
                    now,
                )
            )
            await db.commit()

            task_id = cursor.lastrowid
            return {
                "id": task_id,
                "slug": slug,
                "title": body["title"],
                "content_path": body["content_path"],
                "assignee": body.get("assignee"),
                "column_id": body["column_id"],
                "epic_id": body.get("epic_id"),
            }
        finally:
            await db.close()

    @app.get("/api/tasks/{task_id}")
    async def get_task(task_id: int):
        """Get task detail with content and excerpt."""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id, epic_id, created_at, updated_at FROM tasks WHERE id = ?",
                (task_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return {"error": "Not found"}, 404

            content, content_error = read_content(row[3], data_folder)
            excerpt = get_excerpt_cached(row[3], data_folder)

            result = {
                "id": row[0],
                "slug": row[1],
                "title": row[2],
                "content_path": row[3],
                "content": content,
                "excerpt": excerpt,
                "assignee": row[4],
                "column_id": row[5],
                "epic_id": row[6],
                "created_at": row[7],
                "updated_at": row[8],
            }
            if content_error:
                result["content_error"] = content_error

            return result
        finally:
            await db.close()

    @app.patch("/api/tasks/{task_id}")
    async def update_task(task_id: int, body: dict):
        """Update a task."""
        db = await get_db()
        try:
            now = datetime.now(timezone.utc).isoformat()
            updates = []
            values = []

            for field in ["title", "content_path", "assignee", "column_id", "epic_id"]:
                if field in body:
                    updates.append(f"{field} = ?")
                    values.append(body[field])

            if updates:
                updates.append("updated_at = ?")
                values.append(now)
                values.append(task_id)

                query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
                await db.execute(query, values)
                await db.commit()

            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id, epic_id FROM tasks WHERE id = ?",
                (task_id,)
            )
            row = await cursor.fetchone()
            return {
                "id": row[0],
                "slug": row[1],
                "title": row[2],
                "content_path": row[3],
                "assignee": row[4],
                "column_id": row[5],
                "epic_id": row[6],
            }
        finally:
            await db.close()

    @app.delete("/api/tasks/{task_id}", status_code=204)
    async def delete_task(task_id: int):
        """Delete a task."""
        db = await get_db()
        try:
            await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            await db.commit()
        finally:
            await db.close()

    @app.get("/api/epics")
    async def list_epics():
        """List all epics with excerpt field."""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id FROM epics ORDER BY created_at DESC"
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                epic_id = row[0]
                excerpt = get_excerpt_cached(row[3], data_folder)
                # Get task count
                task_cursor = await db.execute(
                    "SELECT COUNT(*) FROM tasks WHERE epic_id = ?",
                    (epic_id,)
                )
                task_count = (await task_cursor.fetchone())[0]

                # Get done count (tasks in column 3 = Done)
                done_cursor = await db.execute(
                    "SELECT COUNT(*) FROM tasks WHERE epic_id = ? AND column_id = 3",
                    (epic_id,)
                )
                done_count = (await done_cursor.fetchone())[0]

                result.append({
                    "id": epic_id,
                    "slug": row[1],
                    "title": row[2],
                    "assignee": row[4],
                    "column_id": row[5],
                    "task_count": task_count,
                    "done_count": done_count,
                    "excerpt": excerpt,
                })
            return result
        finally:
            await db.close()

    @app.post("/api/epics", status_code=201)
    async def create_epic(body: dict):
        """Create a new epic."""
        if not validate_content_path(body["content_path"], data_folder):
            raise HTTPException(status_code=400, detail="invalid_path")

        db = await get_db()
        try:
            # Get next slug
            cursor = await db.execute("SELECT COUNT(*) FROM epics")
            count = await cursor.fetchone()
            epic_number = count[0] + 1
            slug = f"EPIC-{epic_number:03d}"

            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO epics (slug, title, content_path, assignee, column_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    slug,
                    body["title"],
                    body["content_path"],
                    body.get("assignee"),
                    body["column_id"],
                    now,
                    now,
                )
            )
            await db.commit()

            epic_id = cursor.lastrowid
            return {
                "id": epic_id,
                "slug": slug,
                "title": body["title"],
                "content_path": body["content_path"],
                "assignee": body.get("assignee"),
                "column_id": body["column_id"],
                "task_count": 0,
                "done_count": 0,
            }
        finally:
            await db.close()

    @app.get("/api/epics/{epic_id}")
    async def get_epic(epic_id: int):
        """Get epic detail with content and excerpt."""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id, created_at, updated_at FROM epics WHERE id = ?",
                (epic_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return {"error": "Not found"}, 404

            content, content_error = read_content(row[3], data_folder)
            excerpt = get_excerpt_cached(row[3], data_folder)

            result = {
                "id": row[0],
                "slug": row[1],
                "title": row[2],
                "content_path": row[3],
                "content": content,
                "excerpt": excerpt,
                "assignee": row[4],
                "column_id": row[5],
                "created_at": row[6],
                "updated_at": row[7],
            }
            if content_error:
                result["content_error"] = content_error

            return result
        finally:
            await db.close()

    @app.patch("/api/epics/{epic_id}")
    async def update_epic(epic_id: int, body: dict):
        """Update an epic."""
        db = await get_db()
        try:
            now = datetime.now(timezone.utc).isoformat()
            updates = []
            values = []

            for field in ["title", "content_path", "assignee", "column_id"]:
                if field in body:
                    updates.append(f"{field} = ?")
                    values.append(body[field])

            if updates:
                updates.append("updated_at = ?")
                values.append(now)
                values.append(epic_id)

                query = f"UPDATE epics SET {', '.join(updates)} WHERE id = ?"
                await db.execute(query, values)
                await db.commit()

            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id FROM epics WHERE id = ?",
                (epic_id,)
            )
            row = await cursor.fetchone()
            return {
                "id": row[0],
                "slug": row[1],
                "title": row[2],
                "content_path": row[3],
                "assignee": row[4],
                "column_id": row[5],
            }
        finally:
            await db.close()

    @app.delete("/api/epics/{epic_id}", status_code=204)
    async def delete_epic(epic_id: int):
        """Delete an epic."""
        db = await get_db()
        try:
            await db.execute("DELETE FROM epics WHERE id = ?", (epic_id,))
            await db.commit()
        finally:
            await db.close()

    @app.get("/api/tasks/{task_id}/comments")
    async def list_task_comments(task_id: int):
        """List comments on a task."""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT id, author, body, created_at FROM comments WHERE entity_type = 'task' AND entity_id = ? ORDER BY created_at",
                (task_id,)
            )
            rows = await cursor.fetchall()
            return [
                {"id": row[0], "author": row[1], "body": row[2], "created_at": row[3]}
                for row in rows
            ]
        finally:
            await db.close()

    @app.post("/api/tasks/{task_id}/comments", status_code=201)
    async def create_task_comment(task_id: int, body: dict):
        """Create a comment on a task."""
        db = await get_db()
        try:
            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO comments (entity_type, entity_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)",
                ("task", task_id, body["author"], body["body"], now)
            )
            await db.commit()

            comment_id = cursor.lastrowid
            return {
                "id": comment_id,
                "author": body["author"],
                "body": body["body"],
                "created_at": now,
            }
        finally:
            await db.close()

    @app.get("/api/epics/{epic_id}/comments")
    async def list_epic_comments(epic_id: int):
        """List comments on an epic."""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT id, author, body, created_at FROM comments WHERE entity_type = 'epic' AND entity_id = ? ORDER BY created_at",
                (epic_id,)
            )
            rows = await cursor.fetchall()
            return [
                {"id": row[0], "author": row[1], "body": row[2], "created_at": row[3]}
                for row in rows
            ]
        finally:
            await db.close()

    @app.post("/api/epics/{epic_id}/comments", status_code=201)
    async def create_epic_comment(epic_id: int, body: dict):
        """Create a comment on an epic."""
        db = await get_db()
        try:
            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO comments (entity_type, entity_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)",
                ("epic", epic_id, body["author"], body["body"], now)
            )
            await db.commit()

            comment_id = cursor.lastrowid
            return {
                "id": comment_id,
                "author": body["author"],
                "body": body["body"],
                "created_at": now,
            }
        finally:
            await db.close()

    return app
