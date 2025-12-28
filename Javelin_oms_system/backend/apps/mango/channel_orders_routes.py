"""
Channel Orders List Routes
Fetch and filter orders
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional
from datetime import datetime

from ..common.db import get_db
from ..common.models import User, Order
from ..common.dependencies import get_current_user

router = APIRouter(prefix="/channel", tags=["Channel Orders List"])


@router.get("/orders")
async def get_orders(
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all orders with optional filters
    """
    from ..common.models import OMSSyncConfig, MangoChannelOrder, Platform
    
    # Get OMS config to determine data source
    oms_configs = db.query(OMSSyncConfig).filter(
        OMSSyncConfig.company_id == current_user.company_id
    ).all()
    
    # If filtering by channel, check if OMS is enabled for that channel
    if channel:
        channel_config = next((c for c in oms_configs if c.platform == channel), None)
        use_oms = channel_config and channel_config.sync_enabled
    else:
        # If no channel filter, default to showing Mango orders
        use_oms = False
    
    if use_oms:
        # Query from OMS orders table
        query = db.query(Order)
        
        if channel:
            platform_obj = db.query(Platform).filter(Platform.name.ilike(f"%{channel}%")).first()
            if platform_obj:
                query = query.filter(Order.platform_id == platform_obj.id)
        
        if status:
            query = query.filter(Order.order_status == status)
        
        if from_date:
            query = query.filter(Order.created_at >= datetime.fromisoformat(from_date))
        
        if to_date:
            query = query.filter(Order.created_at <= datetime.fromisoformat(to_date))
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Order.platform_order_id.like(search_term),
                    Order.customer_name.like(search_term)
                )
            )
        
        orders = query.order_by(Order.created_at.desc()).all()
        
        return {
            "orders": [
                {
                    "id": o.id,
                    "platform_order_id": o.platform_order_id,
                    "source_platform": o.platform.name.lower() if o.platform else "unknown",
                    "customer_name": o.customer_name,
                    "order_status": o.order_status,
                    "channel_data": o.platform_metadata,
                    "data_source": "oms",
                    "created_at": o.created_at.isoformat() if o.created_at else None
                }
                for o in orders
            ],
            "total": len(orders),
            "data_source": "oms"
        }
    
    else:
        # Query from Mango orders table
        query = db.query(MangoChannelOrder).filter(
            MangoChannelOrder.company_id == current_user.company_id
        )
        
        if channel:
            query = query.filter(MangoChannelOrder.platform == channel)
        
        if status:
            query = query.filter(MangoChannelOrder.order_status == status)
        
        if from_date:
            query = query.filter(MangoChannelOrder.created_at >= datetime.fromisoformat(from_date))
        
        if to_date:
            query = query.filter(MangoChannelOrder.created_at <= datetime.fromisoformat(to_date))
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    MangoChannelOrder.platform_order_id.like(search_term),
                    MangoChannelOrder.customer_name.like(search_term)
                )
            )
        
        orders = query.order_by(MangoChannelOrder.created_at.desc()).all()
        
        return {
            "orders": [
                {
                    "id": o.id,
                    "platform_order_id": o.platform_order_id,
                    "source_platform": o.platform,
                    "customer_name": o.customer_name,
                    "order_status": o.order_status,
                    "channel_data": o.channel_data,
                    "data_source": "mango",
                    "created_at": o.created_at.isoformat() if o.created_at else None
                }
                for o in orders
            ],
            "total": len(orders),
            "data_source": "mango"
        }
