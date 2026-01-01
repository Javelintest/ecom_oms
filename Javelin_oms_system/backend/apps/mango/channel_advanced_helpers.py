"""
Channel Advanced Helpers - Functions for advanced channel table creation
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from .channel_master_models import ChannelTableSchema


def get_sql_type(field_config) -> str:
    """Convert field type to SQL type"""
    field_type = field_config.type.upper() if hasattr(field_config, 'type') else 'VARCHAR(255)'
    
    # Handle common type mappings
    type_mappings = {
        'TEXT': 'TEXT',
        'STRING': 'VARCHAR(255)',
        'VARCHAR': 'VARCHAR(255)',
        'NUMBER': 'DECIMAL(12,2)',
        'INTEGER': 'INT',
        'INT': 'INT',
        'FLOAT': 'DECIMAL(12,2)',
        'DECIMAL': 'DECIMAL(12,2)',
        'BOOLEAN': 'BOOLEAN',
        'BOOL': 'BOOLEAN',
        'DATE': 'DATE',
        'DATETIME': 'DATETIME',
        'TIMESTAMP': 'TIMESTAMP',
        'JSON': 'JSON',
        'SELECT': 'VARCHAR(100)',
    }
    
    # Check if it's already a full SQL type (e.g., VARCHAR(100))
    if '(' in field_type:
        return field_type
    
    return type_mappings.get(field_type, 'VARCHAR(255)')


def create_advanced_channel_table(
    table_name: str,
    channel_id: int,
    company_id: int,
    field_configs: List,
    db: Session
):
    """Create a database table with custom field configurations"""
    
    # Build column definitions
    columns = []
    
    # Always include system columns first
    columns.append("id INTEGER PRIMARY KEY AUTOINCREMENT")
    columns.append("channel_record_id VARCHAR(100)")
    columns.append("company_id INT NOT NULL")
    columns.append("uploaded_by_user_id INT")
    columns.append("uploaded_at DATETIME")
    columns.append("raw_data TEXT")  # JSON for SQLite compatibility
    columns.append("is_synced_to_master BOOLEAN DEFAULT 0")
    columns.append("master_order_id INT")
    columns.append("synced_at DATETIME")
    columns.append("created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
    columns.append("updated_at DATETIME DEFAULT CURRENT_TIMESTAMP")
    
    # Add custom fields from configuration
    for field in field_configs:
        field_name = field.name if hasattr(field, 'name') else field.get('name', '')
        if not field_name:
            continue
            
        # Sanitize field name
        safe_name = sanitize_column_name(field_name)
        
        # Skip if it conflicts with system columns
        system_columns = ['id', 'channel_record_id', 'company_id', 'uploaded_by_user_id', 
                         'uploaded_at', 'raw_data', 'is_synced_to_master', 'master_order_id',
                         'synced_at', 'created_at', 'updated_at']
        if safe_name.lower() in system_columns:
            continue
        
        sql_type = get_sql_type(field)
        
        # Build column definition
        col_def = f"{safe_name} {sql_type}"
        
        # Handle NOT NULL
        is_required = field.required if hasattr(field, 'required') else field.get('required', False)
        if is_required:
            col_def += " NOT NULL"
        
        # Handle UNIQUE
        is_unique = field.unique if hasattr(field, 'unique') else field.get('unique', False)
        if is_unique:
            col_def += " UNIQUE"
        
        # Handle DEFAULT
        default_value = field.default_value if hasattr(field, 'default_value') else field.get('default_value')
        if default_value is not None:
            col_def += f" DEFAULT '{default_value}'"
        
        columns.append(col_def)
    
    # Create table SQL (SQLite compatible)
    sql = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
        {', '.join(columns)}
    )
    """
    
    try:
        db.execute(text(sql))
        db.commit()
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to create table: {str(e)}")


def store_field_configurations(
    channel_id: int,
    field_configs: List,
    db: Session,
    channel_table_id: int = None  # New: link to specific ChannelTable
):
    """Store field configurations in channel_table_schema table"""
    
    for idx, field in enumerate(field_configs):
        field_name = field.name if hasattr(field, 'name') else field.get('name', '')
        if not field_name:
            continue
        
        safe_name = sanitize_column_name(field_name)
        sql_type = get_sql_type(field)
        
        # Get field properties
        is_required = field.required if hasattr(field, 'required') else field.get('required', False)
        is_unique = field.unique if hasattr(field, 'unique') else field.get('unique', False)
        is_primary_key = field.primary_key if hasattr(field, 'primary_key') else field.get('primary_key', False)
        is_indexed = field.indexed if hasattr(field, 'indexed') else field.get('indexed', False)
        default_value = field.default_value if hasattr(field, 'default_value') else field.get('default_value')
        
        schema_entry = ChannelTableSchema(
            channel_id=channel_id,
            channel_table_id=channel_table_id,  # New field
            column_name=safe_name,
            field_name=field_name,
            column_type=sql_type,
            is_nullable=not is_required,
            is_required=is_required,
            is_unique=is_unique,
            is_primary_key=is_primary_key,
            is_indexed=is_indexed,
            default_value=str(default_value) if default_value else None,
            column_order=idx
        )
        db.add(schema_entry)

    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to store field configurations: {str(e)}")


def create_composite_constraints(
    channel_id: int,
    table_name: str,
    constraints: List,
    db: Session
):
    """Create composite unique constraints on the table"""
    
    for idx, constraint in enumerate(constraints):
        constraint_type = constraint.type if hasattr(constraint, 'type') else constraint.get('type', 'unique')
        fields = constraint.fields if hasattr(constraint, 'fields') else constraint.get('fields', [])
        
        if not fields:
            continue
        
        # Sanitize field names
        safe_fields = [sanitize_column_name(f) for f in fields]
        fields_str = ', '.join(safe_fields)
        
        if constraint_type == 'unique':
            constraint_name = f"uq_{table_name}_{idx}"
            sql = f"CREATE UNIQUE INDEX IF NOT EXISTS {constraint_name} ON {table_name} ({fields_str})"
        else:
            # Index
            index_name = f"idx_{table_name}_{idx}"
            sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({fields_str})"
        
        try:
            db.execute(text(sql))
        except Exception as e:
            # Log but don't fail - constraint might already exist
            print(f"Warning: Could not create constraint: {str(e)}")
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to create constraints: {str(e)}")


def sanitize_column_name(name: str) -> str:
    """Sanitize a column name for SQL"""
    import re
    # Remove special characters, keep alphanumeric and underscore
    safe = re.sub(r'[^a-zA-Z0-9_]', '_', name.strip())
    # Ensure it doesn't start with a number
    if safe and safe[0].isdigit():
        safe = 'col_' + safe
    # Ensure it's not empty
    if not safe:
        safe = 'unnamed_column'
    return safe.lower()

