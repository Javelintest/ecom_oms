"""
Multi-Channel Master System - Channel Management Routes
Phase 2: Channel creation, listing, editing, deletion
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import csv
import io
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import re
import pandas as pd

from ..common.db import get_db
from ..common.models import User, Company
from ..common.dependencies import get_current_user
from .channel_master_models import Channel, ChannelFieldMapping, ChannelTableSchema


# ============ Request/Response Models ============

class FieldConfigRequest(BaseModel):
    """Advanced field configuration"""
    name: str
    type: str = "VARCHAR(255)"
    required: bool = False
    unique: bool = False
    primary_key: bool = False
    auto_increment: bool = False
    indexed: bool = False
    validation: str = "none"  # none, email, phone, url, regex, range, length
    validation_pattern: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    default_value: Optional[str] = None
    description: Optional[str] = None
    foreign_key_table: Optional[str] = None
    foreign_key_column: Optional[str] = None


class CompositeConstraintRequest(BaseModel):
    """Composite unique constraint"""
    type: str = "unique"  # unique or index
    fields: List[str]

class ChannelSchemaResponse(BaseModel):
    """Full channel schema with fields and constraints"""
    id: int
    channel_name: str
    channel_type: str
    table_name: str
    description: Optional[str]
    fields: List[FieldConfigRequest]
    composite_constraints: List[CompositeConstraintRequest]


class ChannelCreateRequest(BaseModel):
    channel_name: str
    channel_type: str = "marketplace"
    description: Optional[str] = None
    fields: Optional[List[FieldConfigRequest]] = None
    composite_constraints: Optional[List[CompositeConstraintRequest]] = None


class ChannelUpdateRequest(BaseModel):
    channel_name: Optional[str] = None
    channel_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ChannelResponse(BaseModel):
    id: int
    company_id: int
    channel_name: str
    channel_code: str
    channel_type: str
    table_name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Helper Functions ============

def sanitize_name(name: str) -> str:
    """Sanitize channel name for use in table names"""
    # Remove special characters, keep only alphanumeric and underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', name)
    # Remove consecutive underscores
    sanitized = re.sub(r'_+', '_', sanitized)
    # Remove leading/trailing underscores
    sanitized = sanitized.strip('_')
    return sanitized.lower()


def generate_table_name(channel_name: str, company_id: int, db: Session) -> str:
    """Generate unique table name for channel"""
    base_name = f"{sanitize_name(channel_name)}_orders"
    
    # Check if table exists
    inspector = inspect(db.bind)
    existing_tables = inspector.get_table_names()
    
    if base_name not in existing_tables:
        return base_name
    
    # If exists, append company ID
    table_name = f"{base_name}_{company_id}"
    
    # If still exists, append counter
    counter = 1
    while table_name in existing_tables:
        table_name = f"{base_name}_{company_id}_{counter}"
        counter += 1
    
    return table_name


def create_channel_table(table_name: str, channel_id: int, company_id: int, db: Session):
    """Create a new database table for the channel (SQLite compatible)"""
    sql = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_record_id VARCHAR(100) UNIQUE,
        
        -- System fields (always present)
        company_id INT NOT NULL,
        uploaded_by_user_id INT,
        uploaded_at DATETIME,
        raw_data TEXT,
        
        -- Sync tracking
        is_synced_to_master BOOLEAN DEFAULT 0,
        master_order_id INT,
        synced_at DATETIME,
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    db.execute(text(sql))
    
    # Create indexes separately (SQLite compatible)
    try:
        db.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_company ON {table_name} (company_id)"))
        db.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_sync ON {table_name} (is_synced_to_master)"))
        db.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_master ON {table_name} (master_order_id)"))
    except Exception:
        pass  # Indexes might already exist
    
    db.commit()


def create_default_field_mappings(channel_id: int, db: Session):
    """Create default field mappings for common fields"""
    default_mappings = [
        {"channel_field": "order_id", "master_field": "order_number", "type": "VARCHAR(100)", "required": True},
        {"channel_field": "order_date", "master_field": "order_date", "type": "DATETIME", "required": False},
        {"channel_field": "customer_name", "master_field": "customer_name", "type": "VARCHAR(200)", "required": False},
        {"channel_field": "customer_email", "master_field": "customer_email", "type": "VARCHAR(200)", "required": False},
        {"channel_field": "customer_phone", "master_field": "customer_phone", "type": "VARCHAR(50)", "required": False},
        {"channel_field": "order_amount", "master_field": "order_amount", "type": "DECIMAL(12,2)", "required": False},
        {"channel_field": "order_status", "master_field": "order_status", "type": "VARCHAR(50)", "required": False},
    ]
    
    for idx, mapping in enumerate(default_mappings):
        field_mapping = ChannelFieldMapping(
            channel_id=channel_id,
            channel_field_name=mapping["channel_field"],
            channel_field_type=mapping["type"],
            master_field_name=mapping["master_field"],
            is_required=mapping["required"],
            display_order=idx,
            transformation_rule={"type": "direct"}
        )
        db.add(field_mapping)
    
    db.commit()


# ============ API Routes ============

router = APIRouter(prefix="/mango/channels", tags=["Multi-Channel Management"])


@router.post("/create", response_model=ChannelResponse)
async def create_channel(
    request: ChannelCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new channel with automatic table generation and advanced field configurations"""
    
    # Get user's company
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a company"
        )
    
    company_id = current_user.company_id
    
    try:
        # Generate unique channel code and table name
        channel_code = f"{sanitize_name(request.channel_name)}_{company_id}"
        table_name = generate_table_name(request.channel_name, company_id, db)
        
        # Check if channel code already exists
        existing = db.query(Channel).filter_by(channel_code=channel_code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Channel '{request.channel_name}' already exists for your company"
            )
        
        # Create channel record
        channel = Channel(
            company_id=company_id,
            channel_name=request.channel_name,
            channel_code=channel_code,
            channel_type=request.channel_type,
            table_name=table_name,
            description=request.description,
            is_active=True,
            created_by_user_id=current_user.id
        )
        
        db.add(channel)
        db.flush()  # Get channel ID
        
        # Import advanced helpers
        from .channel_advanced_helpers import (
            create_advanced_channel_table,
            store_field_configurations,
            create_composite_constraints
        )
        
        # Create physical database table with advanced fields
        if request.fields and len(request.fields) > 0:
            # Advanced mode: use custom field configurations
            create_advanced_channel_table(
                table_name=table_name,
                channel_id=channel.id,
                company_id=company_id,
                field_configs=request.fields,
                db=db
            )
            
            # Store field configurations in channel_table_schema
            store_field_configurations(
                channel_id=channel.id,
                field_configs=request.fields,
                db=db
            )
            
            # Apply composite constraints if specified
            if request.composite_constraints and len(request.composite_constraints) > 0:
                create_composite_constraints(
                    channel_id=channel.id,
                    table_name=table_name,
                    constraints=request.composite_constraints,
                    db=db
                )
        else:
            # Standard mode: use default table structure
            create_channel_table(table_name, channel.id, company_id, db)
            # Create default field mappings for backward compatibility
            create_default_field_mappings(channel.id, db)
        
        db.commit()
        db.refresh(channel)
        
        return channel
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create channel: {str(e)}"
        )


@router.get("/list", response_model=List[ChannelResponse])
async def list_channels(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all channels for the current user's company"""
    
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a company"
        )
    
    query = db.query(Channel).filter(Channel.company_id == current_user.company_id)
    
    if not include_inactive:
        query = query.filter(Channel.is_active == True)
    
    channels = query.order_by(Channel.created_at.desc()).all()
    
    return channels


@router.get("/foreign-key-tables")
async def get_foreign_key_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tables available for foreign key references"""
    try:
        # 1. Get standard tables
        tables = [
            {"name": "customers", "label": "Customers"},
            {"name": "products", "label": "Products"},
            {"name": "users", "label": "Users"},
            {"name": "warehouses", "label": "Warehouses"},
            {"name": "vendors", "label": "Vendors"}
        ]
        
        # 2. Get channel tables (only if user has a company)
        if current_user and current_user.company_id:
            channels = db.query(Channel).filter(
                Channel.company_id == current_user.company_id
            ).all()
            
            for c in channels:
                tables.append({
                    "name": c.table_name,
                    "label": f"Channel: {c.channel_name}"
                })
                
        return {"tables": tables}
    except Exception as e:
        # Return empty list on error to prevent frontend breakage
        return {"tables": [], "error": str(e)}


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific channel by ID"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    return channel


@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: int,
    request: ChannelUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update channel details"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Update fields
    if request.channel_name is not None:
        channel.channel_name = request.channel_name
    if request.channel_type is not None:
        channel.channel_type = request.channel_type
    if request.description is not None:
        channel.description = request.description
    if request.is_active is not None:
        channel.is_active = request.is_active
    
    try:
        db.commit()
        db.refresh(channel)
        return channel
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update channel: {str(e)}"
        )


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a channel (requires confirmation)"""
    
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion requires confirmation (set confirm=true)"
        )
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    table_name = channel.table_name
    
    try:
        # Drop the channel table (CASCADE will handle related records)
        db.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
        
        # Delete channel record (CASCADE will delete mappings)
        db.delete(channel)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Channel '{channel.channel_name}' and table '{table_name}' deleted successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete channel: {str(e)}"
        )


@router.post("/{channel_id}/activate")
async def toggle_channel_status(
    channel_id: int,
    activate: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate or deactivate a channel"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    channel.is_active = activate
    
    try:
        db.commit()
        return {
            "success": True,
            "channel_id": channel_id,
            "is_active": activate,
            "message": f"Channel {'activated' if activate else 'deactivated'} successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update channel status: {str(e)}"
        )


@router.get("/{channel_id}/stats")
async def get_channel_stats(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a channel"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get record count from channel table
    result = db.execute(text(f"SELECT COUNT(*) as count FROM {channel.table_name}"))
    total_orders = result.fetchone()[0]
    
    # Get synced count
    result = db.execute(text(
        f"SELECT COUNT(*) as count FROM {channel.table_name} WHERE is_synced_to_master = TRUE"
    ))
    synced_orders = result.fetchone()[0]
    
    return {
        "channel_id": channel.id,
        "channel_name": channel.channel_name,
        "table_name": channel.table_name,
        "total_orders": total_orders,
        "synced_orders": synced_orders,
        "unsynced_orders": total_orders - synced_orders,
        "sync_percentage": round((synced_orders / total_orders * 100) if total_orders > 0 else 0, 2)
    }


@router.get("/{channel_id}/fields")
async def get_channel_fields(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get fields configuration for a specific channel"""
    
    # Verify channel exists and belongs to user's company
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )

    # Fetch fields from ChannelTableSchema
    schema_entries = db.query(ChannelTableSchema).filter(
        ChannelTableSchema.channel_id == channel_id
    ).order_by(ChannelTableSchema.column_order, ChannelTableSchema.id).all()
    
    fields = []
    for entry in schema_entries:
        fields.append({
            "id": entry.id,
            "field_name": entry.field_name or entry.column_name,  # Display name or fall back to column_name
            "field_key": entry.column_name,  # Technical field key
            "field_type": entry.column_type,
            "is_required": entry.is_required or not entry.is_nullable,
            "is_unique": entry.is_unique or False,
            "is_primary_key": entry.is_primary_key or False,
            "is_indexed": entry.is_indexed or False,
            "on_duplicate": entry.on_duplicate_action or "skip",
            "foreign_key_table": None, 
            "foreign_key_field": None
        })
        
    # Also fetch mappings
    mappings_entries = db.query(ChannelFieldMapping).filter(
        ChannelFieldMapping.channel_id == channel_id
    ).all()
    
    mappings = []
    for m in mappings_entries:
        mappings.append({
            "id": m.id,
            "channel_field_key": m.channel_field_name,
            "scan_field_key": m.transformation_rule.get("scan_field") if m.transformation_rule else None,
            "is_bidirectional": m.transformation_rule.get("bidirectional", False) if m.transformation_rule else False
        })

    return {
        "channel_id": channel.id,
        "channel_name": channel.channel_name,
        "fields": fields,
        "mappings": mappings
    }


class ChannelFieldCreateRequest(BaseModel):
    """Request model for creating a new field
    
    Accepts both naming conventions:
    - Simple: name, type, required, unique, primary_key, indexed
    - Enhanced: field_name, field_type, is_required, is_unique, is_primary_key, is_indexed
    """
    # Simple naming (from basic modal)
    name: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    unique: Optional[bool] = None
    primary_key: Optional[bool] = None
    indexed: Optional[bool] = None
    
    # Enhanced naming (from enhanced modal)
    field_name: Optional[str] = None
    field_key: Optional[str] = None
    field_type: Optional[str] = None
    is_required: Optional[bool] = None
    is_unique: Optional[bool] = None
    is_primary_key: Optional[bool] = None
    is_indexed: Optional[bool] = None
    foreign_key_table: Optional[str] = None
    foreign_key_field: Optional[str] = None
    
    # Common
    validation: str = "none"
    on_duplicate: str = "skip"
    
    def get_name(self) -> str:
        return self.name or self.field_name or ""
    
    def get_type(self) -> str:
        return self.type or self.field_type or "VARCHAR(255)"
    
    def get_required(self) -> bool:
        if self.required is not None:
            return self.required
        if self.is_required is not None:
            return self.is_required
        return False
    
    def get_unique(self) -> bool:
        if self.unique is not None:
            return self.unique
        if self.is_unique is not None:
            return self.is_unique
        return False
    
    def get_primary_key(self) -> bool:
        if self.primary_key is not None:
            return self.primary_key
        if self.is_primary_key is not None:
            return self.is_primary_key
        return False
    
    def get_indexed(self) -> bool:
        if self.indexed is not None:
            return self.indexed
        if self.is_indexed is not None:
            return self.is_indexed
        return False


@router.post("/{channel_id}/fields")
async def create_channel_field(
    channel_id: int,
    field: ChannelFieldCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new field for a channel"""
    
    # Verify channel exists and belongs to user's company
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get normalized values using helper methods
    field_name = field.get_name()
    field_type = field.get_type()
    is_required = field.get_required()
    is_unique = field.get_unique()
    is_primary_key = field.get_primary_key()
    is_indexed = field.get_indexed()
    
    if not field_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field name is required"
        )
    
    # Generate field key from name (or use provided field_key)
    field_key = field.field_key if field.field_key else field_name.lower().replace(" ", "_").replace("-", "_")
    
    # System columns that cannot be created by user
    system_columns = {
        'id', 'channel_record_id', 'company_id', 'uploaded_by_user_id', 
        'uploaded_at', 'raw_data', 'is_synced_to_master', 'master_order_id',
        'synced_at', 'created_at', 'updated_at'
    }
    
    if field_key.lower() in system_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{field_key}' is a reserved system column and cannot be created"
        )
    
    # Check if field already exists - use correct column name
    existing_field = db.query(ChannelTableSchema).filter(
        ChannelTableSchema.channel_id == channel_id,
        ChannelTableSchema.column_name == field_key
    ).first()
    
    if existing_field:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Field '{field_key}' already exists"
        )
    
    # Map frontend types to SQL types (support both friendly names and SQL types)
    type_mapping = {
        # Friendly names
        "Text": "VARCHAR(255)",
        "Number": "INT",
        "Decimal": "DECIMAL(10,2)",
        "Date": "DATETIME",
        "Select": "VARCHAR(100)",
        "Boolean": "BOOLEAN",
        "LongText": "TEXT",
        # SQL types (from modal dropdown)
        "VARCHAR(255)": "VARCHAR(255)",
        "INT": "INT",
        "DECIMAL(10,2)": "DECIMAL(10,2)",
        "DATETIME": "DATETIME",
        "BOOLEAN": "BOOLEAN",
        "TEXT": "TEXT",
    }
    
    sql_type_base = type_mapping.get(field_type, field_type if '(' in str(field_type) else "VARCHAR(255)")
    
    # Determine column_length from type
    column_length = None
    if "VARCHAR" in sql_type_base:
        import re
        match = re.search(r'\((\d+)\)', sql_type_base)
        if match:
            column_length = int(match.group(1))
    
    # Create schema entry using correct model attributes
    schema_entry = ChannelTableSchema(
        channel_id=channel_id,
        column_name=field_key,
        field_name=field_name,  # Display name
        column_type=sql_type_base,
        column_length=column_length,
        is_nullable=not is_required,
        is_required=is_required,
        is_unique=is_unique,
        is_primary_key=is_primary_key,
        is_indexed=is_indexed,
        on_duplicate_action=field.on_duplicate,
        column_order=999  # Will be at the end
    )
    
    db.add(schema_entry)
    
    # Add column to physical database table
    try:
        # Build ALTER TABLE statement (SQLite compatible - no backticks)
        full_type = sql_type_base
            
        alter_sql = f"ALTER TABLE {channel.table_name} ADD COLUMN {field_key} {full_type}"
        
        # Note: SQLite doesn't support NOT NULL, UNIQUE constraints in ALTER TABLE ADD COLUMN
        # So we just add the column and store constraints in metadata
            
        db.execute(text(alter_sql))
        
        # Create index if requested (SQLite compatible)
        if is_indexed and not is_primary_key:
            index_sql = f"CREATE INDEX IF NOT EXISTS idx_{channel.table_name}_{field_key} ON {channel.table_name} ({field_key})"
            try:
                db.execute(text(index_sql))
            except Exception:
                pass  # Index might already exist
        
        db.commit()
        
        return {
            "success": True,
            "field_id": schema_entry.id,
            "field_key": field_key,
            "message": f"Field '{field_name}' created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add column: {str(e)}"
        )


# ---------------------------------------------------------
# Update Field Endpoint
# ---------------------------------------------------------

class ChannelFieldUpdateRequest(BaseModel):
    """Request model for updating a field - accepts both naming conventions"""
    # Simple naming
    name: Optional[str] = None
    required: Optional[bool] = None
    on_duplicate: Optional[str] = None
    
    # Enhanced naming (from frontend modal)
    field_name: Optional[str] = None
    field_key: Optional[str] = None
    field_type: Optional[str] = None
    is_required: Optional[bool] = None
    is_unique: Optional[bool] = None
    is_primary_key: Optional[bool] = None
    is_indexed: Optional[bool] = None
    foreign_key_table: Optional[str] = None
    foreign_key_field: Optional[str] = None


@router.put("/{channel_id}/fields/{field_id}")
async def update_channel_field(
    channel_id: int,
    field_id: int,
    field: ChannelFieldUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update field metadata (name, required status, etc.) - metadata only, no schema changes"""
    
    # Verify channel exists and belongs to user's company
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Find the field
    schema_entry = db.query(ChannelTableSchema).filter(
        ChannelTableSchema.id == field_id,
        ChannelTableSchema.channel_id == channel_id
    ).first()
    
    if not schema_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )
    
    # Update allowed fields (metadata only - no physical table changes)
    # Handle both naming conventions
    display_name = field.name or field.field_name
    if display_name is not None:
        schema_entry.field_name = display_name
    
    # Required status
    is_req = field.required if field.required is not None else field.is_required
    if is_req is not None:
        schema_entry.is_required = is_req
        schema_entry.is_nullable = not is_req
    
    # On duplicate action
    if field.on_duplicate is not None:
        schema_entry.on_duplicate_action = field.on_duplicate
    
    # Note: We don't update field_type, is_unique, is_primary_key, is_indexed
    # as these would require ALTER TABLE which is complex/dangerous for existing data
    # These are stored in metadata but won't affect the physical table
    
    try:
        db.commit()
        db.refresh(schema_entry)
        
        return {
            "success": True,
            "field_id": schema_entry.id,
            "message": "Field updated successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update field: {str(e)}"
        )


# ---------------------------------------------------------
# Delete Field Endpoint
# ---------------------------------------------------------

@router.delete("/{channel_id}/fields/{field_id}")
async def delete_channel_field(
    channel_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a field from a channel"""
    
    # Verify channel exists and belongs to user's company
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Find the field
    schema_entry = db.query(ChannelTableSchema).filter(
        ChannelTableSchema.id == field_id,
        ChannelTableSchema.channel_id == channel_id
    ).first()
    
    if not schema_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )
    
    column_name = schema_entry.column_name
    
    try:
        # Delete from schema table
        db.delete(schema_entry)
        
        # Note: SQLite doesn't support DROP COLUMN easily
        # The column will remain in the physical table but be unused
        # For production MySQL, you could add: ALTER TABLE DROP COLUMN
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Field '{column_name}' deleted successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete field: {str(e)}"
        )


# ---------------------------------------------------------
# Bulk Field Save Endpoint
# ---------------------------------------------------------

class BulkFieldRequest(BaseModel):
    """Request model for bulk field save"""
    field_name: str
    field_key: str
    field_type: str
    is_required: bool = False
    is_unique: bool = False
    is_primary_key: bool = False
    is_indexed: bool = False
    on_duplicate: str = "skip"


class BulkFieldsRequest(BaseModel):
    """Request model for bulk fields save"""
    fields: List[BulkFieldRequest]


@router.post("/{channel_id}/fields/bulk")
async def save_bulk_fields(
    channel_id: int,
    request: BulkFieldsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save multiple fields at once (from file/SQL import)"""
    
    # Verify channel exists and belongs to user's company
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Map frontend types to SQL types
    type_mapping = {
        "Text": "VARCHAR(255)",
        "Number": "INT",
        "Decimal": "DECIMAL(10,2)",
        "Date": "DATETIME",
        "Select": "VARCHAR(100)",
        "Boolean": "TINYINT(1)",
        "LongText": "TEXT"
    }
    
    saved_fields = []
    errors = []
    
    # System columns that cannot be created by user
    system_columns = {
        'id', 'channel_record_id', 'company_id', 'uploaded_by_user_id', 
        'uploaded_at', 'raw_data', 'is_synced_to_master', 'master_order_id',
        'synced_at', 'created_at', 'updated_at'
    }
    
    for idx, field in enumerate(request.fields):
        try:
            field_key = field.field_key.lower().replace(" ", "_").replace("-", "_")
            
            # Skip system columns
            if field_key in system_columns:
                errors.append(f"Field '{field_key}' is a system column, skipped")
                continue
            
            # Check if field already exists
            existing = db.query(ChannelTableSchema).filter(
                ChannelTableSchema.channel_id == channel_id,
                ChannelTableSchema.column_name == field_key
            ).first()
            
            if existing:
                errors.append(f"Field '{field_key}' already exists, skipped")
                continue
            
            # Get SQL type
            sql_type = type_mapping.get(field.field_type, "VARCHAR(255)")
            
            # Create schema entry
            schema_entry = ChannelTableSchema(
                channel_id=channel_id,
                column_name=field_key,
                field_name=field.field_name,
                column_type=sql_type,
                is_nullable=not field.is_required,
                is_required=field.is_required,
                is_unique=field.is_unique,
                is_primary_key=field.is_primary_key,
                is_indexed=field.is_indexed,
                on_duplicate_action=field.on_duplicate,
                column_order=idx
            )
            db.add(schema_entry)
            db.flush()
            
            saved_fields.append({
                "id": schema_entry.id,
                "field_name": field.field_name,
                "field_key": field_key
            })
            
        except Exception as e:
            errors.append(f"Failed to save field '{field.field_name}': {str(e)}")
    
    try:
        db.commit()
        return {
            "success": True,
            "saved_count": len(saved_fields),
            "saved_fields": saved_fields,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save fields: {str(e)}"
        )


# ---------------------------------------------------------
# Bulk Schema Inference Routes
# ---------------------------------------------------------

class SQLInferenceRequest(BaseModel):
    sql_text: str

# System columns that should not be created/modified by user
SYSTEM_COLUMNS = {
    'id', 'channel_record_id', 'company_id', 'uploaded_by_user_id', 
    'uploaded_at', 'raw_data', 'is_synced_to_master', 'master_order_id',
    'synced_at', 'created_at', 'updated_at'
}


@router.post("/{channel_id}/schema/infer-sql")
async def infer_schema_from_sql(
    channel_id: int,
    request: SQLInferenceRequest,
    current_user: User = Depends(get_current_user)
):
    """Infer fields from a CREATE TABLE SQL statement"""
    sql = request.sql_text
    fields = []
    
    # 1. Extract content between first ( and last )
    match = re.search(r'\((.*)\)', sql, re.DOTALL)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid CREATE TABLE syntax: Could not find column definitions.")
    
    columns_str = match.group(1)
    
    # 2. Split by comma, but respect parentheses (for DECIMAL(10,2))
    columns_str_clean = re.sub(r'\(([^)]+),([^)]+)\)', r'(\1|\2)', columns_str)
    
    lines = [line.strip() for line in columns_str_clean.split(',')]
    
    possible_types = {
        'INT': 'Number', 'INTEGER': 'Number', 'BIGINT': 'Number', 'SMALLINT': 'Number', 'TINYINT': 'Number',
        'DECIMAL': 'Number', 'NUMERIC': 'Number', 'FLOAT': 'Number', 'DOUBLE': 'Number',
        'VARCHAR': 'Text', 'CHAR': 'Text', 'TEXT': 'Text', 'STRING': 'Text',
        'BOOLEAN': 'Select', 'BOOL': 'Select', 'BIT': 'Select',
        'DATE': 'Date', 'DATETIME': 'Date', 'TIMESTAMP': 'Date',
        'JSON': 'Text'
    }

    for line in lines:
        if not line or line.upper().startswith(('PRIMARY', 'KEY', 'CONSTRAINT', 'UNIQUE', 'INDEX', 'FOREIGN')):
            continue
            
        parts = line.split()
        if len(parts) >= 2:
            field_name = parts[0].strip('`"[]')
            field_key = field_name.lower()
            
            # Skip system columns
            if field_key in SYSTEM_COLUMNS:
                continue
            
            # Skip IDENTITY columns (auto-increment primary keys)
            if 'IDENTITY' in line.upper() or 'AUTO_INCREMENT' in line.upper() or 'AUTOINCREMENT' in line.upper():
                continue
            
            sql_type = parts[1].split('(')[0].upper() # Remove length e.g. VARCHAR(255) -> VARCHAR
            
            # Map SQL type to Mango type
            mongo_type = 'Text' # Default
            for key, val in possible_types.items():
                if key in sql_type:
                    mongo_type = val
                    break
            
            # Check constraints
            is_req = 'NOT NULL' in line.upper()
            is_pk = 'PRIMARY KEY' in line.upper()
            
            # Skip primary key columns (they're usually auto-increment IDs)
            if is_pk:
                continue
            
            fields.append({
                "field_name": field_name,
                "field_key": field_key,
                "field_type": mongo_type,
                "is_required": is_req,
                "is_primary_key": False,
                "is_unique": False,
                "is_indexed": False
            })

    return {"fields": fields}


@router.post("/{channel_id}/schema/infer-file")
async def infer_schema_from_file(
    channel_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Infer fields from CSV or Excel file headers"""
    try:
        headers = []
        sample_data = None
        
        if file.filename.endswith('.csv'):
            content = await file.read()
            decoded = content.decode('utf-8')
            try:
                f = io.StringIO(decoded)
                reader = csv.reader(f)
                headers = next(reader)
                try:
                    sample_data = next(reader)
                except StopIteration:
                    pass
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
                 
        elif file.filename.endswith(('.xlsx', '.xls')):
            try:
                contents = await file.read()
                df = pd.read_excel(io.BytesIO(contents), nrows=5)
                headers = df.columns.tolist()
                if not df.empty:
                    sample_data = df.iloc[0].tolist()
                    # Convert numpy types to native python types for JSON serialization
                    sample_data = [
                        x.item() if hasattr(x, 'item') else x 
                        for x in sample_data
                    ]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")
                
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")
             
        fields = []
        for i, header in enumerate(headers):
            field_name = str(header).strip() if header else f"column_{i}"
            field_type = "Text"
            
            # Infer type from sample data if available
            if sample_data and len(sample_data) > i:
                val = sample_data[i]
                # Handle None values and pandas NaT
                if val is None or (hasattr(val, '__class__') and 'NaT' in str(type(val))):
                    field_type = "Text"
                elif isinstance(val, bool):
                    field_type = "Select"
                elif isinstance(val, (int, float)):
                    # Check for NaN
                    try:
                        if pd.isna(val):
                            field_type = "Text"
                        else:
                            field_type = "Number"
                    except:
                        field_type = "Number"
                elif isinstance(val, str):
                    val_str = val.strip()
                    # Try to detect number strings
                    try:
                        float(val_str.replace(',', ''))
                        field_type = "Number"
                    except (ValueError, AttributeError):
                        pass
                    # Check for boolean strings
                    if val_str.lower() in ['true', 'false', 'yes', 'no', '0', '1']:
                        field_type = "Select"
                # Basic date check
                elif hasattr(val, 'strftime'):
                    field_type = "Date"
                
            fields.append({
                "field_name": field_name,
                "field_key": field_name.lower().replace(" ", "_").replace("-", "_"),
                "field_type": field_type,
                "is_required": False,
                "is_primary_key": False, 
                "is_unique": False,
                "is_indexed": False
            })
            
        return {"fields": fields}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )


# Endpoint moved to before /{channel_id} routes
