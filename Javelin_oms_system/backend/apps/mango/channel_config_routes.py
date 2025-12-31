"""
Channel Configuration Routes
Handles channel field definitions, mappings, and Excel uploads
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
import pandas as pd
import io
import re
from datetime import datetime

from ..common.db import get_db
from ..common.models import (
    User, 
    ChannelFieldDefinition, 
    ChannelDispatchMapping,
    Order
)
from ..common.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/channel", tags=["Channel Configuration"])


# Pydantic Models
class FieldDefinitionCreate(BaseModel):
    field_name: str
    field_type: str
    is_required: bool = False
    default_value: Optional[str] = None
    column_name: Optional[str] = None


class BulkFieldsCreate(BaseModel):
    fields: List[FieldDefinitionCreate]


class MappingCreate(BaseModel):
    channel_field_key: str
    scan_field_key: str
    is_bidirectional: bool = False


class MappingsCreate(BaseModel):
    mappings: List[MappingCreate]


class DetectedField(BaseModel):
    column_name: str
    suggested_field_name: str
    field_key: str
    detected_type: str
    is_required_suggestion: bool
    sample_values: List[str]


# Utility Functions
def to_snake_case(text: str) -> str:
    """Convert text to snake_case"""
    # Remove special characters except spaces and underscores
    text = re.sub(r'[^\w\s]', '', text)
    # Replace spaces with underscores
    text = re.sub(r'\s+', '_', text)
    # Convert to lowercase
    text = text.lower()
    # Remove duplicate underscores
    text = re.sub(r'_+', '_', text)
    # Remove leading/trailing underscores
    text = text.strip('_')
    return text


def detect_field_type(values: pd.Series) -> str:
    """Intelligently detect field type from sample data"""
    # Remove nulls
    values = values.dropna()
    
    if len(values) == 0:
        return 'text'
    
    # Check for dates
    try:
        pd.to_datetime(values, errors='raise')
        return 'date'
    except:
        pass
    
    # Check for numbers
    try:
        pd.to_numeric(values, errors='raise')
        return 'number'
    except:
        pass
    
    # Check for boolean
    unique_values = set(str(v).lower() for v in values.unique())
    if unique_values.issubset({'yes', 'no', 'true', 'false', '0', '1', 'y', 'n'}):
        return 'boolean'
    
    # Default to text
    return 'text'


def to_title_case(text: str) -> str:
    """Convert snake_case or kebab-case to Title Case"""
    # Replace underscores and hyphens with spaces
    text = text.replace('_', ' ').replace('-', ' ')
    # Title case
    return text.title()


# API Endpoints

@router.post("/upload-schema")
async def upload_schema(
    file: UploadFile = File(...),
    platform: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Excel/CSV file and auto-detect field definitions
    """
    try:
        # Read file content
        content = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Detect fields
        detected_fields = []
        
        for column in df.columns:
            # Get sample values (first 10 non-null)
            sample_values = df[column].dropna().head(10).astype(str).tolist()
            
            # Detect type
            detected_type = detect_field_type(df[column])
            
            # Generate field name and key
            field_name = to_title_case(column)
            field_key = to_snake_case(column)
            
            # Suggest if required (if less than 10% null values)
            null_percentage = df[column].isnull().sum() / len(df)
            is_required_suggestion = bool(null_percentage < 0.1)  # Convert to Python bool
            
            detected_fields.append({
                "column_name": str(column),
                "suggested_field_name": field_name,
                "field_key": field_key,
                "detected_type": detected_type,
                "is_required_suggestion": is_required_suggestion,
                "sample_values": [str(v) for v in sample_values[:3]]  # Only first 3, convert to str
            })
        
        return {
            "detected_fields": detected_fields,
            "total_columns": int(len(detected_fields)),  # Convert to Python int
            "total_rows": int(len(df))  # Convert to Python int
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")


@router.post("/{platform}/fields/bulk")
async def create_bulk_fields(
    platform: str,
    data: BulkFieldsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create multiple field definitions at once
    """
    created_fields = []
    
    for field_data in data.fields:
        # Generate field key if not provided
        field_key = to_snake_case(field_data.field_name)
        
        # Check for duplicates
        existing = db.query(ChannelFieldDefinition).filter(
            and_(
                ChannelFieldDefinition.company_id == current_user.company_id,
                ChannelFieldDefinition.platform == platform,
                ChannelFieldDefinition.field_key == field_key
            )
        ).first()
        
        if existing:
            continue  # Skip duplicates
        
        # Create field definition
        field_def = ChannelFieldDefinition(
            company_id=current_user.company_id,
            platform=platform,
            field_name=field_data.field_name,
            field_key=field_key,
            field_type=field_data.field_type,
            is_required=field_data.is_required,
            default_value=field_data.default_value,
            column_name=field_data.column_name,
            created_from_upload=bool(field_data.column_name)
        )
        
        db.add(field_def)
        created_fields.append(field_def)
    
    db.commit()
    
    return {
        "success": True,
        "created_count": len(created_fields),
        "message": f"Created {len(created_fields)} field definitions"
    }


@router.get("/fields")
async def get_channel_fields(
    platform: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all field definitions for a platform
    """
    fields = db.query(ChannelFieldDefinition).filter(
        and_(
            ChannelFieldDefinition.company_id == current_user.company_id,
            ChannelFieldDefinition.platform == platform
        )
    ).order_by(ChannelFieldDefinition.display_order, ChannelFieldDefinition.created_at).all()
    
    # Get mappings
    mappings = db.query(ChannelDispatchMapping).filter(
        and_(
            ChannelDispatchMapping.company_id == current_user.company_id,
            ChannelDispatchMapping.platform == platform
        )
    ).all()
    
    return {
        "fields": [
            {
                "id": f.id,
                "field_name": f.field_name,
                "field_key": f.field_key,
                "field_type": f.field_type,
                "is_required": f.is_required,
                "default_value": f.default_value,
                "created_from_upload": f.created_from_upload
            }
            for f in fields
        ],
        "mappings": [
            {
                "id": m.id,
                "channel_field_key": m.channel_field_key,
                "scan_field_key": m.scan_field_key,
                "is_bidirectional": m.is_bidirectional
            }
            for m in mappings
        ]
    }


@router.delete("/fields/{field_id}")
async def delete_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a field definition
    """
    field = db.query(ChannelFieldDefinition).filter(
        and_(
            ChannelFieldDefinition.id == field_id,
            ChannelFieldDefinition.company_id == current_user.company_id
        )
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    db.delete(field)
    db.commit()
    
    return {"success": True, "message": "Field deleted"}


@router.post("/{platform}/mappings")
async def save_mappings(
    platform: str,
    data: MappingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save dispatch field mappings
    """
    # Delete existing mappings for this platform
    db.query(ChannelDispatchMapping).filter(
        and_(
            ChannelDispatchMapping.company_id == current_user.company_id,
            ChannelDispatchMapping.platform == platform
        )
    ).delete()
    
    # Create new mappings
    for mapping_data in data.mappings:
        mapping = ChannelDispatchMapping(
            company_id=current_user.company_id,
            platform=platform,
            channel_field_key=mapping_data.channel_field_key,
            scan_field_key=mapping_data.scan_field_key,
            is_bidirectional=mapping_data.is_bidirectional
        )
        db.add(mapping)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Saved {len(data.mappings)} mappings"
    }


@router.get("/{platform}/mappings")
async def get_mappings(
    platform: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dispatch field mappings for a platform
    """
    mappings = db.query(ChannelDispatchMapping).filter(
        and_(
            ChannelDispatchMapping.company_id == current_user.company_id,
            ChannelDispatchMapping.platform == platform
        )
    ).all()
    
    return {
        "mappings": [
            {
                "channel_field_key": m.channel_field_key,
                "scan_field_key": m.scan_field_key,
                "is_bidirectional": m.is_bidirectional
            }
            for m in mappings
        ]
    }

# Update field definition with schema constraints
@router.put("/config/fields/{field_id}")
async def update_field_constraints(
    field_id: int,
    field_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update field definition including schema management constraints"""
    field = db.query(ChannelFieldDefinition).filter(
        ChannelFieldDefinition.id == field_id,
        ChannelFieldDefinition.company_id == current_user.company_id
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Update basic fields
    if "field_name" in field_data:
        field.field_name = field_data["field_name"]
    if "field_key" in field_data:
        field.field_key = field_data["field_key"]
    if "field_type" in field_data:
        field.field_type = field_data["field_type"]
    if "is_required" in field_data:
        field.is_required = field_data["is_required"]
    
    # Update schema management fields
    if "is_primary_key" in field_data:
        field.is_primary_key = field_data["is_primary_key"]
    if "is_unique" in field_data:
        field.is_unique = field_data["is_unique"]
    if "is_indexed" in field_data:
        field.is_indexed = field_data["is_indexed"]
    if "foreign_key_table" in field_data:
        field.foreign_key_table = field_data["foreign_key_table"]
    if "foreign_key_field" in field_data:
        field.foreign_key_field = field_data["foreign_key_field"]
    if "on_duplicate" in field_data:
        field.on_duplicate = field_data["on_duplicate"]
    
    db.commit()
    db.refresh(field)
    
    return {
        "success": True,
        "field": {
            "id": field.id,
            "field_name": field.field_name,
            "field_key": field.field_key,
            "field_type": field.field_type,
            "is_required": field.is_required,
            "is_primary_key": field.is_primary_key,
            "is_unique": field.is_unique,
            "is_indexed": field.is_indexed,
            "foreign_key_table": field.foreign_key_table,
            "foreign_key_field": field.foreign_key_field,
            "on_duplicate": field.on_duplicate
        }
    }

# Add Schema Validation Endpoint
@router.get("/validate-schema")
async def validate_schema(
    platform: str = Query(..., description="Platform name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate schema configuration for a platform"""
    from .schema_validator import SchemaValidator
    
    validator = SchemaValidator(db)
    result = validator.validate_schema(platform, current_user.company_id)
    
    return result


# Get Available Foreign Key Tables
@router.get("/foreign-key-tables")
async def get_foreign_key_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of available tables for foreign key relationships"""
    # Define available reference tables
    tables = [
        {"name": "customers", "label": "Customers", "pk": "id"},
        {"name": "products", "label": "Products", "pk": "sku"},
        {"name": "warehouses", "label": "Warehouses", "pk": "id"},
        {"name": "users", "label": "Users", "pk": "id"}
    ]
    
    return {"tables": tables}
