"""Common utility functions"""
from datetime import datetime
from typing import Any, Dict


def parse_datetime(date_string: str) -> datetime:
    """Parse ISO format datetime string to datetime object"""
    if not date_string:
        return datetime.utcnow()
    
    try:
        # Handle ISO format with or without timezone
        date_string = date_string.replace("Z", "+00:00")
        return datetime.fromisoformat(date_string)
    except (ValueError, AttributeError):
        return datetime.utcnow()


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert value to float"""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to int"""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default

