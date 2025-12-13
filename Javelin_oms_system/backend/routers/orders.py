from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..common import get_db
from ..services import OrderService, SyncService

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/", response_model=List[dict])
def list_orders(
    platform_id: Optional[int] = Query(None, description="Filter by platform ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """List orders across all platforms or filtered by platform"""
    return OrderService.list_orders(db, platform_id, status, limit)


@router.post("/sync", response_model=dict)
def sync_orders(
    platform_name: Optional[str] = Query(None, description="Sync specific platform, or all if not specified"),
    db: Session = Depends(get_db)
):
    """Sync orders from one or all platforms"""
    return SyncService.sync_orders(db, platform_name)
