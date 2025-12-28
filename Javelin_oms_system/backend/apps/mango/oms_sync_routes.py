"""
OMS Sync Configuration Routes
Toggle between Excel uploads and OMS platform sync
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from ..common.db import get_db
from ..common.models import User, OMSSyncConfig
from ..common.dependencies import get_current_user

router = APIRouter(prefix="/channel", tags=["OMS Sync"])


class OMSConfigToggle(BaseModel):
    platform: str
    enable_sync: bool


class OMSConfigResponse(BaseModel):
    platform: str
    is_oms_connected: bool
    sync_enabled: bool
    last_sync_at: str = None


@router.get("/oms-config")
async def get_oms_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get OMS sync configuration for all platforms"""
    platforms = ['amazon', 'flipkart', 'meesho', 'myntra', 'shopify']
    
    configs = []
    for platform in platforms:
        config = db.query(OMSSyncConfig).filter(
            OMSSyncConfig.company_id == current_user.company_id,
            OMSSyncConfig.platform == platform
        ).first()
        
        if not config:
            # Create default config
            config = OMSSyncConfig(
                company_id=current_user.company_id,
                platform=platform,
                is_oms_connected=False,
                sync_enabled=False
            )
            db.add(config)
        
        configs.append({
            "platform": platform,
            "is_oms_connected": config.is_oms_connected,
            "sync_enabled": config.sync_enabled,
            "last_sync_at": config.last_sync_at.isoformat() if config.last_sync_at else None
        })
    
    db.commit()
    return {"configs": configs}


@router.post("/oms-config/toggle")
async def toggle_oms_sync(
    data: OMSConfigToggle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle OMS sync for a platform"""
    config = db.query(OMSSyncConfig).filter(
        OMSSyncConfig.company_id == current_user.company_id,
        OMSSyncConfig.platform == data.platform
    ).first()
    
    if not config:
        config = OMSSyncConfig(
            company_id=current_user.company_id,
            platform=data.platform
        )
        db.add(config)
    
    config.sync_enabled = data.enable_sync
    config.is_oms_connected = data.enable_sync
    
    db.commit()
    
    return {
        "success": True,
        "platform": data.platform,
        "sync_enabled": config.sync_enabled,
        "message": f"OMS sync {'enabled' if data.enable_sync else 'disabled'} for {data.platform}"
    }
