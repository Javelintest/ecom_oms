"""
Channel Order Import Routes
Handles importing orders from channel files using configured mappings
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

router = APIRouter(prefix="/channel", tags=["Channel Orders"])


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
    Import orders from uploaded file using configured field mappings
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
                detail=f"No field definitions found for {platform}. Please configure headers first in Channel Settings."
            )
        
        # Create mapping of column_name -> field_key
        column_mapping = {
            fd.column_name: fd.field_key 
            for fd in field_defs 
            if fd.column_name
        }
        
        imported_count = 0
        failed_count = 0
        errors = []
        
        # Process each row
        for index, row in df.iterrows():
            try:
                # Build channel_data JSON from mapped columns
                channel_data = {}
                order_id = None
                customer_name = None
                
                for csv_col, field_key in column_mapping.items():
                    if csv_col in row:
                        value = row[csv_col]
                        # Convert NaN to None
                        if pd.isna(value):
                            value = None
                        else:
                            value = str(value)
                        
                        channel_data[field_key] = value
                        
                        # Try to identify order_id and customer_name
                        if 'order' in field_key.lower() and 'id' in field_key.lower():
                            order_id = value
                        if 'customer' in field_key.lower() or 'buyer' in field_key.lower() or 'name' in field_key.lower():
                            customer_name = value
                
                # Create Mango order (Excel upload)
                from ..common.models import MangoChannelOrder
                
                new_order = MangoChannelOrder(
                    company_id=current_user.company_id,
                    platform=platform,
                    platform_order_id=order_id or f"{platform}_{index}",
                    customer_name=customer_name or "Unknown",
                    order_status="pending",
                    channel_data=channel_data
                )
                
                db.add(new_order)
                imported_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Row {index + 1}: {str(e)}")
                continue
        
        db.commit()
        
        return {
            "success": True,
            "imported_count": imported_count,
            "failed_count": failed_count,
            "errors": errors[:10],  # Return first 10 errors
            "message": f"Successfully imported {imported_count} orders to Mango system. {failed_count} failed."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/preview-import")
async def preview_import(
    file: UploadFile = File(...),
    platform: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview how the file will be imported (first 10 rows)
    """
    try:
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Get field definitions
        field_defs = db.query(ChannelFieldDefinition).filter(
            ChannelFieldDefinition.company_id == current_user.company_id,
            ChannelFieldDefinition.platform == platform
        ).all()
        
        column_mapping = {
            fd.column_name: fd.field_name 
            for fd in field_defs 
            if fd.column_name
        }
        
        # Preview first 10 rows
        preview_data = []
        for index, row in df.head(10).iterrows():
            mapped_row = {}
            for csv_col, field_name in column_mapping.items():
                if csv_col in row:
                    value = row[csv_col]
                    mapped_row[field_name] = None if pd.isna(value) else str(value)
            preview_data.append(mapped_row)
        
        return {
            "total_rows": len(df),
            "preview_rows": preview_data,
            "mapped_columns": list(column_mapping.values())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
