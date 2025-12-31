"""
Developer Panel Routes
Admin routes for developers to manage database, users, and system
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from typing import List, Dict, Any, Optional
import json

from ..common.db import get_db
from ..common.models import User, Company
from ..common.dependencies import get_current_user

router = APIRouter(prefix="/dev", tags=["Developer Panel"])


def require_developer(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user is a developer"""
    if not current_user.is_developer:
        raise HTTPException(
            status_code=403,
            detail="Developer access required. This action requires developer privileges."
        )
    return current_user


# ============ Database Management ============

@router.get("/tables")
async def list_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """List all database tables with metadata"""
    try:
        # Get all table names
        inspector = inspect(db.bind)
        table_names = inspector.get_table_names()
        
        tables = []
        for table_name in table_names:
            # Get row count
            result = db.execute(text(f"SELECT COUNT(*) as count FROM {table_name}"))
            row_count = result.fetchone()[0]
            
            # Get table size
            result = db.execute(text(f"""
                SELECT 
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
                FROM information_schema.TABLES 
                WHERE table_schema = DATABASE()
                AND table_name = '{table_name}'
            """))
            size_result = result.fetchone()
            size_mb = size_result[0] if size_result else 0
            
            tables.append({
                "name": table_name,
                "rows": row_count,
                "size_mb": float(size_mb) if size_mb else 0,
                "size_display": f"{size_mb}MB" if size_mb else "0MB"
            })
        
        return {
            "success": True,
            "tables": sorted(tables, key=lambda x: x['name']),
            "total_tables": len(tables)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tables: {str(e)}")


@router.get("/tables/{table_name}/schema")
async def get_table_schema(
    table_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Get schema information for a specific table"""
    try:
        inspector = inspect(db.bind)
        
        # Get columns
        columns = inspector.get_columns(table_name)
        
        # Get primary keys
        pk_constraint = inspector.get_pk_constraint(table_name)
        
        # Get foreign keys
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        # Get indexes
        indexes = inspector.get_indexes(table_name)
        
        return {
            "success": True,
            "table": table_name,
            "columns": columns,
            "primary_keys": pk_constraint,
            "foreign_keys": foreign_keys,
            "indexes": indexes
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema: {str(e)}")


@router.get("/tables/{table_name}/data")
async def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Get data from a specific table with pagination"""
    try:
        offset = (page - 1) * limit
        
        # Build query
        where_clause = ""
        if company_id and "company_id" in [col['name'] for col in inspect(db.bind).get_columns(table_name)]:
            where_clause = f"WHERE company_id = {company_id}"
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM {table_name} {where_clause}"
        result = db.execute(text(count_query))
        total = result.fetchone()[0]
        
        # Get data
        data_query = f"SELECT * FROM {table_name} {where_clause} LIMIT {limit} OFFSET {offset}"
        result = db.execute(text(data_query))
        
        # Convert to list of dicts
        columns = result.keys()
        data = [dict(zip(columns, row)) for row in result.fetchall()]
        
        return {
            "success": True,
            "table": table_name,
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get table data: {str(e)}")


# ============ User Management ============

@router.get("/users")
async def list_users(
    company_id: Optional[int] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """List all users with filters"""
    query = db.query(User)
    
    if company_id:
        query = query.filter(User.company_id == company_id)
    
    if role == "admin":
        query = query.filter(User.is_admin == 1)
    elif role == "developer":
        query = query.filter(User.is_developer == True)
    
    if status == "active":
        query = query.filter(User.is_active == 1)
    elif status == "inactive":
        query = query.filter(User.is_active == 0)
    
    users = query.all()
    
    return {
        "success": True,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "company_id": u.company_id,
                "company_name": u.company.name if u.company else None,
                "is_active": bool(u.is_active),
                "is_admin": bool(u.is_admin),
                "is_developer": bool(u.is_developer),
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "created_at": u.created_at.isoformat()
            }
            for u in users
        ],
        "total": len(users)
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    company_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    is_developer: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Update user information"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if email is not None:
        user.email = email
    if full_name is not None:
        user.full_name = full_name
    if company_id is not None:
        user.company_id = company_id
    if is_active is not None:
        user.is_active = 1 if is_active else 0
    if is_admin is not None:
        user.is_admin = 1 if is_admin else 0
    if is_developer is not None:
        user.is_developer = is_developer
    
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    }


# ============ Company Management ============

@router.get("/companies")
async def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """List all companies"""
    companies = db.query(Company).all()
    
    company_stats = []
    for company in companies:
        # Get user count
        user_count = db.query(User).filter(User.company_id == company.id).count()
        
        company_stats.append({
            "id": company.id,
            "name": company.name,
            "address": company.address,
            "contact_email": company.contact_email,
            "contact_phone": company.contact_phone,
            "user_count": user_count,
            "is_active": bool(company.is_active),
            "created_at": company.created_at.isoformat()
        })
    
    return {
        "success": True,
        "companies": company_stats,
        "total": len(companies)
    }


# ============ System Stats ============

@router.get("/stats")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Get overall system statistics"""
    stats = {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active == 1).count(),
        "total_companies": db.query(Company).count(),
        "active_companies": db.query(Company).filter(Company.is_active == 1).count(),
    }
    
    # Get database size
    result = db.execute(text("""
        SELECT 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
        FROM information_schema.TABLES 
        WHERE table_schema = DATABASE()
    """))
    size_result = result.fetchone()
    stats["database_size_mb"] = float(size_result[0]) if size_result and size_result[0] else 0
    
    return {
        "success": True,
        "stats": stats
    }
