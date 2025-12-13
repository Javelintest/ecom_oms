"""Platform management router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..common import get_db, models

router = APIRouter(prefix="/platforms", tags=["Platforms"])


@router.get("/", response_model=List[dict])
def list_platforms(db: Session = Depends(get_db)):
    """List all configured platforms"""
    platforms = db.query(models.Platform).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "display_name": p.display_name,
            "is_active": bool(p.is_active),
            "created_at": p.created_at,
        }
        for p in platforms
    ]


@router.post("/", response_model=dict)
def create_platform(
    name: str,
    display_name: str,
    api_config: Optional[dict] = None,
    db: Session = Depends(get_db)
):
    """Create a new platform configuration"""
    existing = db.query(models.Platform).filter_by(name=name.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Platform '{name}' already exists")
    
    platform = models.Platform(
        name=name.lower(),
        display_name=display_name,
        api_config=api_config or {},
        is_active=1
    )
    db.add(platform)
    db.commit()
    db.refresh(platform)
    
    return {
        "id": platform.id,
        "name": platform.name,
        "display_name": platform.display_name,
        "status": "created"
    }


@router.get("/{platform_id}", response_model=dict)
def get_platform(platform_id: int, db: Session = Depends(get_db)):
    """Get platform details"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    return {
        "id": platform.id,
        "name": platform.name,
        "display_name": platform.display_name,
        "is_active": bool(platform.is_active),
        "api_config": platform.api_config,
        "created_at": platform.created_at,
    }


@router.put("/{platform_id}/toggle", response_model=dict)
def toggle_platform(platform_id: int, db: Session = Depends(get_db)):
    """Toggle platform active status"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    platform.is_active = 1 if platform.is_active == 0 else 0
    db.commit()
    
    return {
        "id": platform.id,
        "name": platform.name,
        "is_active": bool(platform.is_active),
        "status": "updated"
    }

