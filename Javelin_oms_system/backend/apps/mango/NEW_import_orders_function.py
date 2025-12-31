"""
Channel Order Import Routes - COMPLETE VERSION WITH DUPLICATE DETECTION
Replace the entire import_orders function with this
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime

from ..common.db import get_db
from ..common.models import User, Order, ChannelFieldDefinition
from ..common.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/channel", tags=["Channel Import"])


class OrderImportResult(BaseModel):
    success: bool
    imported_count: int
    failed_count: int
    errors: List[str]
    message: str


@router.post("/import-orders")
async def import_orders(
    file: UploadFile = File(...),
    platform: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import orders from uploaded file with duplicate detection
    Uses field definitions and handles duplicates based on primary key configuration
    """
    try:
        # Read file
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Get field definitions for this platform
        field_defs = db.query(ChannelFieldDefinition).filter(
            ChannelFieldDefinition.company_id == current_user.company_id,
            ChannelFieldDefinition.platform == platform
        ).all()
        
        if not field_defs:
            raise HTTPException(
                status_code=400, 
                detail=f"No field definitions found for {platform}. Please configure headers first."
            )
        
        # Create mapping of column_name -> field_key
        column_mapping = {
            fd.column_name: fd.field_key 
            for fd in field_defs 
            if fd.column_name
        }
        
        # Initialize duplicate detector
        from .duplicate_detector import DuplicateDetector
        detector = DuplicateDetector(db, current_user.company_id, platform)
        
        # Track statistics
        stats = {
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'error': 0
        }
        errors = []
        
        # Process each row
        for index, row in df.iterrows():
            try:
                # Build channel_data JSON from mapped columns
                channel_data = {}
                
                for csv_col, field_key in column_mapping.items():
                    if csv_col in row:
                        value = row[csv_col]
                        if pd.isna(value):
                            value = None
                        else:
                            value = str(value)
                        channel_data[field_key] = value
                
                # Also include unmapped columns
                for col in df.columns:
                    if col not in column_mapping:
                        value = row[col]
                        if not pd.isna(value):
                            channel_data[col] = str(value)
                
                # Handle with duplicate detection
                action, error_msg = detector.handle_row(channel_data, index)
                stats[action] += 1
                
                if error_msg:
                    errors.append(f"Row {index + 2}: {error_msg}")
                    
            except Exception as e:
                stats['error'] += 1
                errors.append(f"Row {index + 2}: {str(e)}")
        
        # Commit all changes
        db.commit()
        
        # Build message
        parts = []
        if stats['created'] > 0:
            parts.append(f"{stats['created']} created")
        if stats['updated'] > 0:
            parts.append(f"{stats['updated']} updated")
        if stats['skipped'] > 0:
            parts.append(f"{stats['skipped']} skipped")
        if stats['error'] > 0:
            parts.append(f"{stats['error']} errors")
        
        message = "Import: " + ", ".join(parts) if parts else "No orders"
        
        return {
            "success": True,
            "message": message,
            "stats": stats,
            "total_rows": len(df),
            "errors": errors[:10] if errors else None,
            "has_more_errors": len(errors) > 10,
            # Legacy compatibility
            "imported_count": stats['created'],
            "failed_count": stats['error']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
