"""
Multi-Channel Master System - Excel Upload & Field Mapping
Phase 3 & 4: Upload orders, detect schema, map fields, sync to master
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import re
import json

from ..common.db import get_db
from ..common.models import User
from ..common.dependencies import get_current_user
from .channel_master_models import Channel, ChannelFieldMapping, ChannelTableSchema, MasterOrderSheet


# ============ Request/Response Models ============

class FieldMappingSuggestion(BaseModel):
    channel_field: str
    suggested_master_field: Optional[str]
    confidence: float  # 0.0 to 1.0
    data_type: str
    sample_values: List[str]


class SchemaDetectionResponse(BaseModel):
    detected_columns: List[Dict[str, Any]]
    total_rows: int
    mapping_suggestions: List[FieldMappingSuggestion]


class FieldMappingRequest(BaseModel):
    channel_field: str
    master_field: str
    transformation_type: str = "direct"  # direct, concat, date_format, etc.
    transformation_config: Optional[Dict] = None


class SyncToMasterRequest(BaseModel):
    batch_size: int = 100


# ============ Helper Functions ============

def sanitize_column_name(name: str) -> str:
    """Sanitize column name for SQL"""
    # Replace spaces and special chars with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', str(name))
    # Remove consecutive underscores
    sanitized = re.sub(r'_+', '_', sanitized)
    # Remove leading/trailing underscores
    sanitized = sanitized.strip('_')
    # Ensure it starts with a letter
    if sanitized and sanitized[0].isdigit():
        sanitized = 'col_' + sanitized
    return sanitized.lower()


def infer_sql_type(series: pd.Series) -> str:
    """Infer SQL data type from pandas series"""
    # Remove nulls for type detection
    series = series.dropna()
    
    if len(series) == 0:
        return "VARCHAR(255)"
    
    # Try to infer type
    dtype = series.dtype
    
    if pd.api.types.is_integer_dtype(dtype):
        return "INT"
    elif pd.api.types.is_float_dtype(dtype):
        return "DECIMAL(12,2)"
    elif pd.api.types.is_bool_dtype(dtype):
        return "BOOLEAN"
    elif pd.api.types.is_datetime64_any_dtype(dtype):
        return "DATETIME"
    else:
        # String type - determine length
        max_length = series.astype(str).str.len().max()
        if max_length > 500:
            return "TEXT"
        elif max_length > 255:
            return f"VARCHAR({min(max_length + 50, 1000)})"
        else:
            return "VARCHAR(255)"


def suggest_master_field_mapping(column_name: str) -> tuple[Optional[str], float]:
    """Suggest master field mapping based on column name"""
    column_lower = column_name.lower()
    
    # Strong matches (confidence >= 0.9)
    strong_patterns = {
        'order_number': ['order_id', 'order_no', 'orderno', 'order_number', 'order_num'],
        'order_date': ['order_date', 'date', 'purchase_date', 'ordered_on'],
        'customer_name': ['customer', 'name', 'buyer', 'customer_name', 'buyer_name'],
        'customer_email': ['email', 'customer_email', 'buyer_email', 'mail'],
        'customer_phone': ['phone', 'mobile', 'contact', 'phone_number', 'customer_phone'],
        'shipping_address': ['address', 'shipping_address', 'delivery_address'],
        'shipping_city': ['city', 'shipping_city'],
        'shipping_state': ['state', 'shipping_state', 'province'],
        'shipping_pincode': ['pincode', 'zip', 'postal', 'zipcode', 'postal_code'],
        'order_amount': ['amount', 'total', 'order_total', 'order_amount', 'price'],
        'payment_method': ['payment_method', 'payment_type', 'pay_method'],
        'payment_status': ['payment_status', 'paid_status'],
        'order_status': ['status', 'order_status'],
    }
    
    # Check strong patterns
    for master_field, patterns in strong_patterns.items():
        for pattern in patterns:
            if pattern in column_lower:
                return master_field, 0.9
    
    # Weak matches (confidence 0.5-0.7)
    weak_patterns = {
        'customer_name': ['cust', 'buyer'],
        'order_amount': ['amt', 'value'],
        'customer_phone': ['tel', 'mob'],
    }
    
    for master_field, patterns in weak_patterns.items():
        for pattern in patterns:
            if pattern in column_lower:
                return master_field, 0.6
    
    return None, 0.0


def column_exists(table_name: str, column_name: str, db: Session) -> bool:
    """Check if column exists in table"""
    inspector = inspect(db.bind)
    columns = inspector.get_columns(table_name)
    return any(col['name'] == column_name for col in columns)


def add_column_to_table(table_name: str, column_name: str, sql_type: str, db: Session):
    """Add column to existing table"""
    sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {sql_type}"
    db.execute(text(sql))
    db.commit()


# ============ API Routes ============

router = APIRouter(prefix="/mango/channels", tags=["Multi-Channel Upload & Sync"])


@router.post("/{channel_id}/upload", response_model=SchemaDetectionResponse)
async def upload_channel_orders(
    channel_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload Excel file with automatic schema detection and data insertion"""
    
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be Excel (.xlsx, .xls) or CSV (.csv)"
        )
    
    # Get channel
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    try:
        # Read Excel file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_excel(file.file)
        
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file is empty"
            )
        
        # Sanitize column names
        df.columns = [sanitize_column_name(col) for col in df.columns]
        
        # Detect schema
        detected_columns = []
        mapping_suggestions = []
        
        for column in df.columns:
            # Skip system columns
            if column in ['id', 'company_id', 'uploaded_by_user_id', 'raw_data', 
                          'is_synced_to_master', 'master_order_id', 'created_at', 'updated_at']:
                continue
            
            sql_type = infer_sql_type(df[column])
            sample_values = df[column].dropna().head(3).astype(str).tolist()
            
            detected_columns.append({
                "column_name": column,
                "sql_type": sql_type,
                "sample_values": sample_values
            })
            
            # Suggest master field mapping
            suggested_field, confidence = suggest_master_field_mapping(column)
            
            mapping_suggestions.append(FieldMappingSuggestion(
                channel_field=column,
                suggested_master_field=suggested_field,
                confidence=confidence,
                data_type=sql_type,
                sample_values=sample_values
            ))
            
            # Add column to table if it doesn't exist
            if not column_exists(channel.table_name, column, db):
                add_column_to_table(channel.table_name, column, sql_type, db)
                
                # Save to schema registry
                schema_entry = ChannelTableSchema(
                    channel_id=channel.id,
                    column_name=column,
                    column_type=sql_type,
                    is_nullable=True,
                    column_order=len(detected_columns)
                )
                db.add(schema_entry)
        
        db.commit()
        
        # Insert data into channel table
        records_inserted = 0
        for idx, row in df.iterrows():
            # Prepare data dict
            data_dict = {}
            for column in df.columns:
                value = row[column]
                # Convert NaN to None
                if pd.isna(value):
                    data_dict[column] = None
                else:
                    data_dict[column] = value
            
            # Build INSERT query
            columns_list = list(data_dict.keys())
            columns_list.extend(['company_id', 'uploaded_by_user_id', 'uploaded_at', 'raw_data'])
            
            placeholders = [f":{col}" for col in data_dict.keys()]
            placeholders.extend([':company_id', ':uploaded_by_user_id', ':uploaded_at', ':raw_data'])
            
            sql = f"""
                INSERT INTO {channel.table_name} 
                ({', '.join(columns_list)})
                VALUES ({', '.join(placeholders)})
            """
            
            params = {**data_dict}
            params['company_id'] = current_user.company_id
            params['uploaded_by_user_id'] = current_user.id
            params['uploaded_at'] = datetime.utcnow()
            params['raw_data'] = json.dumps(data_dict, default=str)
            
            db.execute(text(sql), params)
            records_inserted += 1
        
        db.commit()
        
        return SchemaDetectionResponse(
            detected_columns=detected_columns,
            total_rows=records_inserted,
            mapping_suggestions=mapping_suggestions
        )
        
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel file is empty or corrupt"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Excel file: {str(e)}"
        )


@router.get("/{channel_id}/field-mappings")
async def get_field_mappings(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current field mappings for a channel"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    mappings = db.query(ChannelFieldMapping).filter_by(channel_id=channel_id).order_by(
        ChannelFieldMapping.display_order
    ).all()
    
    return {"channel_id": channel_id, "mappings": mappings}


@router.post("/{channel_id}/field-mappings")
async def create_field_mapping(
    channel_id: int,
    request: FieldMappingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update field mapping"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if mapping exists
    existing = db.query(ChannelFieldMapping).filter_by(
        channel_id=channel_id,
        channel_field_name=request.channel_field
    ).first()
    
    if existing:
        # Update
        existing.master_field_name = request.master_field
        existing.transformation_rule = {
            "type": request.transformation_type,
            **(request.transformation_config or {})
        }
    else:
        # Create new
        mapping = ChannelFieldMapping(
            channel_id=channel_id,
            channel_field_name=request.channel_field,
            channel_field_type="VARCHAR(255)",  #  Will be updated from schema
            master_field_name=request.master_field,
            transformation_rule={
                "type": request.transformation_type,
                **(request.transformation_config or {})
            }
        )
        db.add(mapping)
    
    db.commit()
    
    return {"success": True, "message": "Field mapping created"}


@router.post("/{channel_id}/sync-to-master")
async def sync_to_master_sheet(
    channel_id: int,
    request: SyncToMasterRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync channel orders to master_order_sheet"""
    
    channel = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == current_user.company_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Get field mappings
    mappings = db.query(ChannelFieldMapping).filter_by(channel_id=channel_id).all()
    
    if not mappings:
        raise HTTPException(
            status_code=400,
            detail="No field mappings configured. Please configure field mappings first."
        )
    
    # Get unsynced records
    sql = f"""
        SELECT * FROM {channel.table_name}
        WHERE is_synced_to_master = FALSE OR is_synced_to_master IS NULL
        LIMIT :batch_size
    """
    
    batch_size = request.batch_size if request else 100
    result = db.execute(text(sql), {"batch_size": batch_size})
    rows = result.fetchall()
    
    synced_count = 0
    
    for row in rows:
        row_dict = dict(row._mapping)
        
        # Apply field mappings
        master_data = {}
        for mapping in mappings:
            channel_value = row_dict.get(mapping.channel_field_name)
            
            #  Apply transformation (for now, just direct mapping)
            if channel_value is not None:
                master_data[mapping.master_field_name] = channel_value
        
        # Create master order entry
        master_order = MasterOrderSheet(
            channel_id=channel_id,
            channel_order_id=row_dict.get('channel_record_id', str(row_dict['id'])),
            source_table_name=channel.table_name,
            source_record_id=row_dict['id'],
            raw_data=row_dict.get('raw_data'),
            synced_at=datetime.utcnow(),
            **master_data
        )
        
        db.add(master_order)
        db.flush()
        
        # Update channel table
        update_sql = f"""
            UPDATE {channel.table_name}
            SET is_synced_to_master = TRUE,
                master_order_id = :master_id,
                synced_at = :synced_at
            WHERE id = :record_id
        """
        
        db.execute(text(update_sql), {
            "master_id": master_order.master_order_id,
            "synced_at": datetime.utcnow(),
            "record_id": row_dict['id']
        })
        
        synced_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "synced_count": synced_count,
        "channel": channel.channel_name
    }
