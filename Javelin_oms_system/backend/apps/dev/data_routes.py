"""
Developer Panel Routes - Phase 2: Data Management
Extended routes for editing, deleting, and adding columns
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..common.db import get_db
from ..common.models import User
from ..common.dependencies import get_current_user


# ============ Request Models ============

class UpdateRowRequest(BaseModel):
    primary_key: str
    primary_value: Any
    updates: Dict[str, Any]


class AddColumnRequest(BaseModel):
    column_name: str
    data_type: str
    nullable: bool = True
    default_value: Optional[str] = None
    max_length: Optional[int] = None


# ============ Helper Functions ============

def validate_table_name(table_name: str) -> bool:
    """Validate table name to prevent SQL injection"""
    if not table_name.replace('_', '').isalnum():
        return False
    if any(keyword in table_name.upper() for keyword in ['DROP', 'ALTER', 'DELETE', 'INSERT', 'UPDATE']):
        return False
    return True


def validate_column_name(column_name: str) -> bool:
    """Validate column name"""
    if not column_name.replace('_', '').isalnum():
        return False
    reserved = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'DROP', 'TABLE', 'DATABASE']
    if column_name.upper() in reserved:
        return False
    return True


def get_sql_type(data_type: str, max_length: Optional[int] = None) -> str:
    """Convert data type to SQL type"""
    type_map = {
        'string': f'VARCHAR({max_length or 255})',
        'text': 'TEXT',
        'int': 'INT',
        'integer': 'INT',
        'float': 'FLOAT',
        'decimal': 'DECIMAL(10,2)',
        'boolean': 'BOOLEAN',
        'date': 'DATE',
        'datetime': 'DATETIME',
        'timestamp': 'TIMESTAMP'
    }
    return type_map.get(data_type.lower(), f'VARCHAR({max_length or 255})')


# ============ Data Manipulation Routes ============

def require_developer(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user is a developer"""
    if not current_user.is_developer:
        raise HTTPException(
            status_code=403,
            detail="Developer access required"
        )
    return current_user


router = APIRouter(prefix="/dev", tags=["Developer Panel - Data Management"])


@router.get("/tables/{table_name}/primary-key")
async def get_table_primary_key(
    table_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Get primary key column(s) for a table"""
    try:
        if not validate_table_name(table_name):
            raise HTTPException(status_code=400, detail="Invalid table name")
        
        inspector = inspect(db.bind)
        pk_constraint = inspector.get_pk_constraint(table_name)
        
        if not pk_constraint or not pk_constraint.get('constrained_columns'):
            # Try to find id column as fallback
            columns = inspector.get_columns(table_name)
            id_cols = [col['name'] for col in columns if 'id' in col['name'].lower()]
            if id_cols:
                return {
                    "success": True,
                    "primary_keys": id_cols,
                    "is_fallback": True
                }
            raise HTTPException(status_code=404, detail="No primary key found")
        
        return {
            "success": True,
            "primary_keys": pk_constraint['constrained_columns'],
            "is_fallback": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get primary key: {str(e)}")


@router.put("/tables/{table_name}/rows")
async def update_table_row(
    table_name: str,
    request: UpdateRowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Update a row in any table"""
    try:
        if not validate_table_name(table_name):
            raise HTTPException(status_code=400, detail="Invalid table name")
        
        if not validate_column_name(request.primary_key):
            raise HTTPException(status_code=400, detail="Invalid primary key column name")
        
        # Build UPDATE statement
        set_clauses = []
        params = {}
        
        for i, (column, value) in enumerate(request.updates.items()):
            if not validate_column_name(column):
                raise HTTPException(status_code=400, detail=f"Invalid column name: {column}")
            set_clauses.append(f"{column} = :val_{i}")
            params[f"val_{i}"] = value
        
        params['pk_value'] = request.primary_value
        
        set_clause = ", ".join(set_clauses)
        query = text(f"""
            UPDATE {table_name}
            SET {set_clause}
            WHERE {request.primary_key} = :pk_value
        """)
        
        result = db.execute(query, params)
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Row not found")
        
        return {
            "success": True,
            "message": f"Updated {result.rowcount} row(s)",
            "rows_affected": result.rowcount
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update row: {str(e)}")


@router.delete("/tables/{table_name}/rows")
async def delete_table_row(
    table_name: str,
    primary_key: str = Query(...),
    primary_value: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Delete a row from any table"""
    try:
        if not validate_table_name(table_name):
            raise HTTPException(status_code=400, detail="Invalid table name")
        
        if not validate_column_name(primary_key):
            raise HTTPException(status_code=400, detail="Invalid primary key column name")
        
        query = text(f"""
            DELETE FROM {table_name}
            WHERE {primary_key} = :pk_value
        """)
        
        result = db.execute(query, {"pk_value": primary_value})
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Row not found")
        
        return {
            "success": True,
            "message": f"Deleted {result.rowcount} row(s)",
            "rows_affected": result.rowcount
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        # Check if it's a foreign key constraint error
        if "foreign key constraint" in str(e).lower() or "cannot delete" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="Cannot delete row due to foreign key constraints. Delete related records first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to delete row: {str(e)}")


@router.post("/tables/{table_name}/columns")
async def add_table_column(
    table_name: str,
    request: AddColumnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Add a new column to any table"""
    try:
        if not validate_table_name(table_name):
            raise HTTPException(status_code=400, detail="Invalid table name")
        
        if not validate_column_name(request.column_name):
            raise HTTPException(status_code=400, detail="Invalid column name")
        
        # Check if column already exists
        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
        if request.column_name in existing_columns:
            raise HTTPException(status_code=409, detail=f"Column '{request.column_name}' already exists")
        
        # Build ALTER TABLE statement
        sql_type = get_sql_type(request.data_type, request.max_length)
        nullable = "NULL" if request.nullable else "NOT NULL"
        
        default_clause = ""
        if request.default_value is not None:
            default_clause = f"DEFAULT '{request.default_value}'"
        
        query = text(f"""
            ALTER TABLE {table_name}
            ADD COLUMN {request.column_name} {sql_type} {nullable} {default_clause}
        """)
        
        db.execute(query)
        db.commit()
        
        return {
            "success": True,
            "message": f"Column '{request.column_name}' added successfully",
            "column_name": request.column_name,
            "sql_type": sql_type,
            "nullable": request.nullable
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add column: {str(e)}")
