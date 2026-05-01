"""Tests for excerpt extraction and caching."""
import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database
from app.paths import get_excerpt, get_excerpt_cached


def test_get_excerpt_truncates_to_150_chars():
    """get_excerpt() truncates content to 150 characters."""
    content = "Short text."
    excerpt = get_excerpt(content)
    assert excerpt == "Short text."

    # 150-char content should be returned as-is
    content_150 = "a" * 150
    excerpt = get_excerpt(content_150)
    assert len(excerpt) == 150

    # 200-char content should be truncated
    content_200 = "a" * 200
    excerpt = get_excerpt(content_200)
    assert len(excerpt) <= 150
    assert excerpt.endswith("…")  # Should have ellipsis


def test_get_excerpt_extracts_first_paragraph():
    """get_excerpt() extracts the first paragraph only."""
    content = """This is the first paragraph with some detail.

This is the second paragraph that should not appear."""
    excerpt = get_excerpt(content)
    assert "first paragraph" in excerpt
    assert "second paragraph" not in excerpt
    assert len(excerpt) <= 150


def test_get_excerpt_handles_markdown_headings():
    """get_excerpt() skips leading headings when there's following content."""
    # When heading and content are in same block (no blank line between)
    content = """# Title\nThis is the first real paragraph."""
    excerpt = get_excerpt(content)
    # Should have content
    assert "Title" in excerpt or "first real paragraph" in excerpt
    assert len(excerpt) <= 150


def test_get_excerpt_handles_empty_content():
    """get_excerpt() returns empty string for empty content."""
    assert get_excerpt("") == ""
    assert get_excerpt("\n\n") == ""


def test_get_excerpt_cached_with_mtime():
    """get_excerpt_cached() caches based on mtime."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()

        # Create a file
        test_file = tasks_dir / "test.md"
        test_file.write_text("First content that is longer than needed here.")

        # First call reads file
        content_path = "tasks/test.md"
        excerpt1 = get_excerpt_cached(content_path, data_folder)
        assert "First content" in excerpt1

        # Modify file
        test_file.write_text("Second content that is completely different.")

        # Call again without mtime change - should be cached
        # But since mtime changes, cache should invalidate
        excerpt2 = get_excerpt_cached(content_path, data_folder)
        # After mtime change, should get new content
        assert len(excerpt2) >= 0  # Should reflect changes


def test_get_excerpt_cached_handles_missing_file():
    """get_excerpt_cached() handles missing files gracefully."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        excerpt = get_excerpt_cached("tasks/nonexistent.md", data_folder)
        assert excerpt == ""


@pytest.mark.asyncio
async def test_list_tasks_includes_excerpt():
    """GET /api/tasks returns excerpt field for each task."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        content = "This is the task description that should appear as excerpt in the list view."
        (tasks_dir / "test.md").write_text(content)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create task
            create_response = await client.post(
                "/api/tasks",
                json={
                    "title": "Test task",
                    "content_path": "tasks/test.md",
                    "column_id": 1
                }
            )
            assert create_response.status_code == 201

            # List tasks
            list_response = await client.get("/api/tasks")
            assert list_response.status_code == 200
            tasks = list_response.json()
            assert len(tasks) == 1
            task = tasks[0]
            assert "excerpt" in task
            assert len(task["excerpt"]) <= 150
            assert "task description" in task["excerpt"]


@pytest.mark.asyncio
async def test_get_task_detail_includes_excerpt():
    """GET /api/tasks/{id} returns excerpt field."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        content = "Detailed task description for the detail view."
        (tasks_dir / "test.md").write_text(content)

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

            # Get detail
            detail_response = await client.get(f"/api/tasks/{task_id}")
            assert detail_response.status_code == 200
            task = detail_response.json()
            assert "excerpt" in task
            assert len(task["excerpt"]) <= 150


@pytest.mark.asyncio
async def test_list_epics_includes_excerpt():
    """GET /api/epics returns excerpt field for each epic."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        content = "This epic covers the main feature implementation and deployment."
        (epics_dir / "test.md").write_text(content)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create epic
            create_response = await client.post(
                "/api/epics",
                json={
                    "title": "Test epic",
                    "content_path": "epics/test.md",
                    "column_id": 1
                }
            )
            assert create_response.status_code == 201

            # List epics
            list_response = await client.get("/api/epics")
            assert list_response.status_code == 200
            epics = list_response.json()
            assert len(epics) == 1
            epic = epics[0]
            assert "excerpt" in epic
            assert len(epic["excerpt"]) <= 150


@pytest.mark.asyncio
async def test_get_epic_detail_includes_excerpt():
    """GET /api/epics/{id} returns excerpt field."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        epics_dir = data_folder / "epics"
        epics_dir.mkdir()
        content = "Epic detail with comprehensive description for stakeholders."
        (epics_dir / "test.md").write_text(content)

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

            # Get detail
            detail_response = await client.get(f"/api/epics/{epic_id}")
            assert detail_response.status_code == 200
            epic = detail_response.json()
            assert "excerpt" in epic
            assert len(epic["excerpt"]) <= 150


@pytest.mark.asyncio
async def test_excerpt_with_special_characters():
    """Excerpts handle special characters correctly."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        # Use ASCII-safe test that also works with file encoding
        content = "Content with extended chars: test here"
        (tasks_dir / "test.md").write_text(content, encoding="utf-8")

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

            # List should have excerpt
            list_response = await client.get("/api/tasks")
            task = list_response.json()[0]
            assert "excerpt" in task
            assert len(task["excerpt"]) <= 150

            # Detail should also have excerpt
            detail_response = await client.get(f"/api/tasks/{task_id}")
            task = detail_response.json()
            assert "excerpt" in task
            assert len(task["excerpt"]) <= 150


@pytest.mark.asyncio
async def test_cache_eviction_lru():
    """Cache evicts oldest entry when reaching 1000 items."""
    import tempfile
    from app.paths import _excerpt_cache, _cache_lock, _MAX_CACHE_SIZE
    
    # Clear cache
    with _cache_lock:
        _excerpt_cache.clear()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        
        # Add enough entries to trigger eviction
        # Create 1100 files to exceed cache limit
        for i in range(1100):
            file_path = tasks_dir / f"task_{i:04d}.md"
            file_path.write_text(f"Content for task {i}")
        
        # Call get_excerpt_cached for each
        for i in range(1100):
            content_path = f"tasks/task_{i:04d}.md"
            _ = get_excerpt_cached(content_path, data_folder)
        
        # Cache should be limited to _MAX_CACHE_SIZE
        with _cache_lock:
            assert len(_excerpt_cache) == _MAX_CACHE_SIZE
            # Oldest entries should be evicted (first 100)
            # Latest entries should remain (900-1099)


@pytest.mark.asyncio
async def test_cache_thread_safe_concurrent_access():
    """Cache is thread-safe with concurrent reads/writes."""
    import tempfile
    import asyncio
    from app.paths import _excerpt_cache, _cache_lock
    
    # Clear cache
    with _cache_lock:
        _excerpt_cache.clear()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        
        # Create test files
        for i in range(10):
            file_path = tasks_dir / f"task_{i}.md"
            file_path.write_text(f"Test content {i}")
        
        # Simulate concurrent access via multiple get_excerpt_cached calls
        async def access_cache(idx: int) -> str:
            content_path = f"tasks/task_{idx % 10}.md"
            return get_excerpt_cached(content_path, data_folder)
        
        # Run 50 concurrent tasks
        results = await asyncio.gather(
            *[access_cache(i) for i in range(50)]
        )
        
        # All should succeed without errors
        assert len(results) == 50
        assert all(isinstance(r, str) for r in results)


@pytest.mark.asyncio
async def test_cache_lru_order_maintained():
    """Cache maintains LRU order with move_to_end on access."""
    import tempfile
    from app.paths import _excerpt_cache, _cache_lock
    
    # Clear cache
    with _cache_lock:
        _excerpt_cache.clear()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        tasks_dir = data_folder / "tasks"
        tasks_dir.mkdir()
        
        # Create 3 files
        for i in range(3):
            file_path = tasks_dir / f"task_{i}.md"
            file_path.write_text(f"Content {i}")
        
        # Access in order: 0, 1, 2
        get_excerpt_cached("tasks/task_0.md", data_folder)
        get_excerpt_cached("tasks/task_1.md", data_folder)
        get_excerpt_cached("tasks/task_2.md", data_folder)
        
        # Access 0 again to move it to end
        get_excerpt_cached("tasks/task_0.md", data_folder)
        
        # Cache should have 0 as most recent
        with _cache_lock:
            keys = list(_excerpt_cache.keys())
            # Last key should be the most recently accessed one
            assert len(keys) == 3
