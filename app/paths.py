from pathlib import Path


def validate_content_path(content_path: str, data_folder: Path) -> bool:
    """Validate that content_path is safe and inside data folder."""
    try:
        # Reject absolute paths outright
        if Path(content_path).is_absolute():
            return False

        # Resolve relative to data folder and normalize
        resolved = (data_folder / content_path).resolve()
        data_folder_resolved = data_folder.resolve()

        # Check that resolved path is inside data folder
        return resolved.is_relative_to(data_folder_resolved)
    except (ValueError, OSError):
        return False


def read_content(content_path: str, data_folder: Path) -> tuple[str, str | None]:
    """Read file content. Returns (content, error) tuple."""
    try:
        if not validate_content_path(content_path, data_folder):
            return "", "invalid_path"

        file_path = data_folder / content_path
        if not file_path.exists():
            return "", "file_missing"

        return file_path.read_text(), None
    except Exception:
        return "", "read_error"
