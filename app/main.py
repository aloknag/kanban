from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, cast

from app.database import init_database
from app.paths import validate_content_path, read_content, get_excerpt_cached
from app.models import ColumnResponse


async def _count_referencing(db: aiosqlite.Connection, table: str, column: str, value: int) -> int:
    """Count rows in `table` whose `column` equals `value` (FK dependency check)."""
    cursor = await db.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = ?", (value,))
    row = await cursor.fetchone()
    return int(row[0]) if row else 0


def create_app(data_folder: Path) -> FastAPI:
    """Create FastAPI app instance."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await init_database(data_folder)
        yield

    app = FastAPI(lifespan=lifespan)

    allowed_origins_env = os.environ.get("KANBAN_ALLOWED_ORIGINS")
    allowed_origins = (
        [origin.strip() for origin in allowed_origins_env.split(",")]
        if allowed_origins_env
        else ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def get_db() -> aiosqlite.Connection:
        """Get database connection."""
        db = await aiosqlite.connect(str(data_folder / "kanban.db"))
        await db.execute("PRAGMA foreign_keys=ON")
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
                LEFT JOIN tasks t ON c.id = t.column_id
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
        name = body.get("name", "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")

        db = await get_db()
        try:
            # Get next position
            cursor = await db.execute("SELECT MAX(position) FROM columns")
            max_pos = await cursor.fetchone()
            next_position = (max_pos[0] if max_pos[0] is not None else -1) + 1

            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO columns (name, position, created_at) VALUES (?, ?, ?)",
                (name, next_position, now)
            )
            await db.commit()

            column_id = cast(int, cursor.lastrowid)
            return ColumnResponse(id=column_id, name=name, position=next_position, task_count=0)
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
                LEFT JOIN tasks t ON c.id = t.column_id
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
            task_count = await _count_referencing(db, "tasks", "column_id", column_id)
            epic_count = await _count_referencing(db, "epics", "column_id", column_id)
            if task_count or epic_count:
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot delete column: {task_count} task(s) and {epic_count} epic(s) still reference it",
                )
            await db.execute("DELETE FROM columns WHERE id = ?", (column_id,))
            await db.commit()
        finally:
            await db.close()

    @app.get("/api/tasks")
    async def list_tasks(column_id: int | None = None):
        """List all tasks with excerpt field, optionally filtered by column_id."""
        db = await get_db()
        try:
            if column_id is not None:
                cursor = await db.execute(
                    "SELECT id, slug, title, content_path, assignee, column_id, epic_id FROM tasks WHERE column_id = ? ORDER BY created_at DESC",
                    (column_id,)
                )
            else:
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
        content_path = body.get("content_path")
        title = body.get("title")
        column_id = body.get("column_id")
        
        if not title or not isinstance(title, str) or not title.strip():
            raise HTTPException(status_code=400, detail="Invalid title")
        if column_id is None:
            raise HTTPException(status_code=400, detail="column_id is required")
        if not content_path or not validate_content_path(content_path, data_folder):
            raise HTTPException(status_code=400, detail="invalid_path")

        db = await get_db()
        try:
            cursor = await db.execute("SELECT id FROM columns WHERE id = ?", (column_id,))
            if not await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Invalid column_id")

            epic_id = body.get("epic_id")
            if epic_id is not None:
                cursor = await db.execute("SELECT id FROM epics WHERE id = ?", (epic_id,))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid epic_id")

            now = datetime.now(timezone.utc).isoformat()
            # Retry loop guards against slug UNIQUE constraint collision under concurrency (CR-10)
            for attempt in range(10):
                cursor = await db.execute("SELECT COUNT(*) FROM tasks")
                count = (await cursor.fetchone())[0]
                slug = f"TASK-{count + 1 + attempt:03d}"
                try:
                    cursor = await db.execute(
                        "INSERT INTO tasks (slug, title, content_path, assignee, column_id, epic_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        (slug, title, content_path, body.get("assignee"), column_id, body.get("epic_id"), now, now),
                    )
                    break
                except Exception as e:
                    if "UNIQUE" in str(e) and attempt < 9:
                        continue
                    raise HTTPException(status_code=500, detail="slug_collision")
            await db.commit()

            task_id = cursor.lastrowid
            return {
                "id": task_id,
                "slug": slug,
                "title": title,
                "content_path": content_path,
                "assignee": body.get("assignee"),
                "column_id": column_id,
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
                raise HTTPException(status_code=404, detail="Not found")

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

            # Validate column_id if it's being updated
            if "column_id" in body:
                column_id = body["column_id"]
                cursor = await db.execute("SELECT id FROM columns WHERE id = ?", (column_id,))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid column_id")

            # Validate epic_id if it's being updated (null clears the epic link)
            if "epic_id" in body and body["epic_id"] is not None:
                epic_id = body["epic_id"]
                cursor = await db.execute("SELECT id FROM epics WHERE id = ?", (epic_id,))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid epic_id")

            # Validate title if it's being updated
            if "title" in body and not body["title"].strip():
                raise HTTPException(status_code=400, detail="Title cannot be empty")

            # Validate content_path if it's being updated
            if "content_path" in body and not validate_content_path(body["content_path"], data_folder):
                raise HTTPException(status_code=400, detail="invalid_path")

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
            if not row:
                raise HTTPException(status_code=404, detail="Not found")

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
            done_row = await (await db.execute("SELECT id FROM columns WHERE name = 'Done'")).fetchone()
            done_column_id = done_row[0] if done_row else None

            cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id FROM epics ORDER BY created_at DESC"
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                epic_id = row[0]
                excerpt = get_excerpt_cached(row[3], data_folder)
                task_cursor = await db.execute(
                    "SELECT COUNT(*) FROM tasks WHERE epic_id = ?",
                    (epic_id,)
                )
                task_count = (await task_cursor.fetchone())[0]

                if done_column_id is not None:
                    done_cursor = await db.execute(
                        "SELECT COUNT(*) FROM tasks WHERE epic_id = ? AND column_id = ?",
                        (epic_id, done_column_id)
                    )
                    done_count = (await done_cursor.fetchone())[0]
                else:
                    done_count = 0

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
        title = body.get("title")
        content_path = body.get("content_path")

        if not title or not isinstance(title, str) or not title.strip():
            raise HTTPException(status_code=400, detail="title is required")
        if not content_path or not validate_content_path(content_path, data_folder):
            raise HTTPException(status_code=400, detail="invalid_path")

        column_id = body.get("column_id", 1)

        db = await get_db()
        try:
            cursor = await db.execute("SELECT id FROM columns WHERE id = ?", (column_id,))
            if not await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Invalid column_id")

            now = datetime.now(timezone.utc).isoformat()
            # Retry loop guards against slug UNIQUE constraint collision under concurrency (CR-10)
            for attempt in range(10):
                cursor = await db.execute("SELECT COUNT(*) FROM epics")
                count = (await cursor.fetchone())[0]
                slug = f"EPIC-{count + 1 + attempt:03d}"
                try:
                    cursor = await db.execute(
                        "INSERT INTO epics (slug, title, content_path, assignee, column_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (slug, title, content_path, body.get("assignee"), column_id, now, now),
                    )
                    break
                except Exception as e:
                    if "UNIQUE" in str(e) and attempt < 9:
                        continue
                    raise HTTPException(status_code=500, detail="slug_collision")
            await db.commit()

            epic_id = cursor.lastrowid
            return {
                "id": epic_id,
                "slug": slug,
                "title": title,
                "content_path": content_path,
                "assignee": body.get("assignee"),
                "column_id": column_id,
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
                raise HTTPException(status_code=404, detail="Not found")

            content, content_error = read_content(row[3], data_folder)
            excerpt = get_excerpt_cached(row[3], data_folder)

            # Get linked tasks
            task_cursor = await db.execute(
                "SELECT id, slug, title, content_path, assignee, column_id FROM tasks WHERE epic_id = ? ORDER BY created_at DESC",
                (epic_id,)
            )
            tasks = []
            for t_row in await task_cursor.fetchall():
                tasks.append({
                    "id": t_row[0],
                    "slug": t_row[1],
                    "title": t_row[2],
                    "content_path": t_row[3],
                    "assignee": t_row[4],
                    "column_id": t_row[5],
                })

            done_row = await (await db.execute("SELECT id FROM columns WHERE name = 'Done'")).fetchone()
            done_column_id = done_row[0] if done_row else None

            task_count = len(tasks)
            done_count = len([t for t in tasks if done_column_id is not None and t["column_id"] == done_column_id])

            result = {
                "id": row[0],
                "slug": row[1],
                "title": row[2],
                "content_path": row[3],
                "content": content,
                "excerpt": excerpt,
                "assignee": row[4],
                "column_id": row[5],
                "task_count": task_count,
                "done_count": done_count,
                "tasks": tasks,
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

            # Validate content_path if it's being updated
            if "content_path" in body and not validate_content_path(body["content_path"], data_folder):
                raise HTTPException(status_code=400, detail="invalid_path")

            # Validate column_id if it's being updated
            if "column_id" in body:
                cursor = await db.execute("SELECT id FROM columns WHERE id = ?", (body["column_id"],))
                if not await cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Invalid column_id")

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
            if not row:
                raise HTTPException(status_code=404, detail="Not found")

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
            task_count = await _count_referencing(db, "tasks", "epic_id", epic_id)
            if task_count:
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot delete epic: {task_count} task(s) still reference it",
                )
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
        comment_body = body.get("body", "")
        author = body.get("author", "")

        if not author or not comment_body or not comment_body.strip():
            raise HTTPException(status_code=400, detail="Invalid comment body or author")

        db = await get_db()
        try:
            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO comments (entity_type, entity_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)",
                ("task", task_id, author, comment_body, now)
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
        comment_body = body.get("body", "")
        author = body.get("author", "")

        if not author or not comment_body or not comment_body.strip():
            raise HTTPException(status_code=400, detail="Invalid comment body or author")

        db = await get_db()
        try:
            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO comments (entity_type, entity_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)",
                ("epic", epic_id, author, comment_body, now)
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
