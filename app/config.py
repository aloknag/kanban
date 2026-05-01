from pathlib import Path
import os


class Config:
    """Application configuration."""

    @staticmethod
    def get_data_folder() -> Path:
        """Get the data folder from environment or default."""
        data_dir = os.getenv("DATA_DIR")
        if not data_dir:
            raise RuntimeError(
                "DATA_DIR environment variable must be set. "
                "Usage: DATA_DIR=/path/to/data python -m app"
            )

        folder = Path(data_dir)
        if not folder.exists():
            raise RuntimeError(f"Data folder does not exist: {folder}")

        return folder

    @staticmethod
    def get_database_path(data_folder: Path) -> Path:
        """Get database file path."""
        return data_folder / "kanban.db"

    @staticmethod
    def get_epics_folder(data_folder: Path) -> Path:
        """Get epics folder path."""
        return data_folder / "epics"

    @staticmethod
    def get_tasks_folder(data_folder: Path) -> Path:
        """Get tasks folder path."""
        return data_folder / "tasks"

    # Constants
    MAX_FILE_SIZE = 1_000_000  # 1MB
    POLLING_INTERVAL = 5000  # ms
