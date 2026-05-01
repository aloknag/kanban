"""Pydantic models for API responses."""

from pydantic import BaseModel, ConfigDict


class ColumnResponse(BaseModel):
    """Response model for column operations."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    position: int
    task_count: int
