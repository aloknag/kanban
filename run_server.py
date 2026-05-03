#!/usr/bin/env python
"""Entry point for running the Kanban server."""

import os
from pathlib import Path
from app.main import create_app

# Get data folder from environment
data_dir = os.environ.get("DATA_DIR", "/data")
data_folder = Path(data_dir)

# Create the app with the data folder
app = create_app(data_folder)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )
