from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..common import get_db
from ..services import InventoryService, SyncService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/", response_model=List[dict])
def list_inventory(
    platform_id: Optional[int] = Query(None, description="Filter by platform ID"),
    sku: Optional[str] = Query(None, description="Filter by SKU"),
    db: Session = Depends(get_db)
):
    """List inventory across all platforms or filtered by platform/SKU"""
    return InventoryService.list_inventory(db, platform_id, sku)


@router.post("/sync", response_model=dict)
def sync_inventory(
    platform_name: Optional[str] = Query(None, description="Sync specific platform, or all if not specified"),
    db: Session = Depends(get_db)
):
    """Sync inventory from one or all platforms"""
    return SyncService.sync_inventory(db, platform_name)
