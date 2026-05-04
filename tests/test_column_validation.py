import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from app.main import create_app
from app.database import init_database

@pytest.mark.asyncio
async def test_post_column_rejects_empty_name():
    """POST /api/columns rejects empty or whitespace name."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_folder = Path(tmpdir)
        await init_database(data_folder)

        app = create_app(data_folder)
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Empty name
            response = await client.post("/api/columns", json={"name": ""})
            assert response.status_code == 400
            
            # Whitespace name
            response = await client.post("/api/columns", json={"name": "   "})
            assert response.status_code == 400
