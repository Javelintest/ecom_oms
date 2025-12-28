"""Sync logs router for viewing connection and sync history"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.apps.common import get_db, models

router = APIRouter(prefix="/sync-logs", tags=["Sync Logs"])


@router.get("/", response_model=List[dict])
def get_sync_logs(
    platform_id: Optional[int] = Query(None, description="Filter by platform ID"),
    job_type: Optional[str] = Query(None, description="Filter by job type (orders, inventory)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get sync logs with optional filters"""
    query = db.query(models.SyncLog)
    
    if platform_id:
        query = query.filter(models.SyncLog.platform_id == platform_id)
    if job_type:
        query = query.filter(models.SyncLog.job_type == job_type)
    if status:
        query = query.filter(models.SyncLog.status == status)
    
    logs = query.order_by(models.SyncLog.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "platform": log.platform.display_name if log.platform else "All Platforms",
            "platform_id": log.platform_id,
            "job_type": log.job_type,
            "status": log.status,
            "message": log.message,
            "records_processed": log.records_processed,
            "error_details": log.error_details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

