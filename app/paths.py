from pathlib import Path
from typing import Tuple
from collections import OrderedDict
from threading import Lock
import re


# Cache for excerpts: key = (content_path, mtime), value = excerpt
# Limited to 1000 entries with LRU eviction policy
# Thread-safe access via _cache_lock
_excerpt_cache: OrderedDict[Tuple[str, float], str] = OrderedDict()
_cache_lock: Lock = Lock()
_MAX_CACHE_SIZE: int = 1000


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


def get_excerpt(content: str, max_length: int = 150) -> str:
    """Extract first paragraph from markdown content, truncated to max_length chars.
    
    Args:
        content: Markdown content as string
        max_length: Maximum length of excerpt (default 150)
    
    Returns:
        Excerpt string, at most max_length characters
    """
    if not content or not content.strip():
        return ""
    
    # Split into paragraphs by double newline
    paragraphs = re.split(r'\n\s*\n', content.strip())
    
    # Process each paragraph until we find content
    for paragraph in paragraphs:
        if not paragraph.strip():
            continue
        
        # Split paragraph into lines
        lines = [line.strip() for line in paragraph.split('\n') if line.strip()]
        
        if not lines:
            continue
        
        # Remove markdown heading markers from each line
        processed_lines = []
        for line in lines:
            # Remove heading markers
            if line.startswith('#'):
                text = re.sub(r'^#+\s*', '', line)
                if text:
                    processed_lines.append(text)
            else:
                processed_lines.append(line)
        
        if not processed_lines:
            continue
        
        # Join lines and use as first paragraph
        first_paragraph = ' '.join(processed_lines).strip()
        break
    else:
        # No content found
        return ""
    
    # Truncate to max_length, accounting for ellipsis
    if len(first_paragraph) > max_length:
        # Leave room for ellipsis
        truncate_at = max_length - 1
        excerpt = first_paragraph[:truncate_at].rstrip()
        
        # Try to cut at a word boundary if possible
        if ' ' in excerpt and len(excerpt) > max_length - 4:
            excerpt = excerpt.rsplit(' ', 1)[0]
        
        excerpt = excerpt + '…'
        return excerpt[:max_length]  # Ensure we don't exceed max_length
    
    return first_paragraph


def get_excerpt_cached(content_path: str, data_folder: Path, max_length: int = 150) -> str:
    """Get excerpt from file content with caching based on mtime.
    
    Cache is thread-safe and limited to 1000 entries with LRU eviction.
    
    Args:
        content_path: Relative path to file
        data_folder: Root data folder
        max_length: Maximum excerpt length
    
    Returns:
        Excerpt string, cached based on file mtime
    """
    try:
        if not validate_content_path(content_path, data_folder):
            return ""
        
        file_path = data_folder / content_path
        if not file_path.exists():
            return ""
        
        # Get file mtime
        mtime = file_path.stat().st_mtime
        cache_key = (content_path, mtime)
        
        # Thread-safe cache access
        with _cache_lock:
            # Check cache
            if cache_key in _excerpt_cache:
                # Move to end (mark as recently used)
                _excerpt_cache.move_to_end(cache_key)
                return _excerpt_cache[cache_key]
        
        # Read and extract excerpt (outside lock to avoid blocking)
        content = file_path.read_text()
        excerpt = get_excerpt(content, max_length)
        
        # Store in cache with thread-safe LRU eviction
        with _cache_lock:
            # If cache is at limit, evict oldest (first) entry
            if len(_excerpt_cache) >= _MAX_CACHE_SIZE:
                # Remove the oldest entry (first in OrderedDict)
                _excerpt_cache.popitem(last=False)
            
            # Add new entry at end
            _excerpt_cache[cache_key] = excerpt
        
        return excerpt
    except Exception:
        return ""
