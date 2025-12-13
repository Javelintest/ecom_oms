from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta, date
from ..common import get_db, models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=dict)
def get_summary(
    platform_id: Optional[int] = Query(None, description="Filter by platform ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Get aggregated dashboard summary across all platforms or filtered by platform and date range"""
    # Base query
    order_query = db.query(models.Order)
    if platform_id:
        order_query = order_query.filter(models.Order.platform_id == platform_id)
    
    # Date filtering
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            order_query = order_query.filter(models.Order.purchase_date >= start_dt)
        except ValueError:
            pass  # Invalid date format, ignore
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            # Add one day to include the entire end date
            end_dt = end_dt + timedelta(days=1)
            order_query = order_query.filter(models.Order.purchase_date < end_dt)
        except ValueError:
            pass  # Invalid date format, ignore
    
    # Total orders (with date filter applied)
    total_orders = order_query.count()
    
    # Total revenue (with date filter applied)
    total_revenue = order_query.with_entities(func.sum(models.Order.order_total)).scalar() or 0
    
    # Orders by status
    pending_orders = order_query.filter(models.Order.order_status.in_(["Pending", "Confirmed", "Processing"])).count()
    shipped_orders = order_query.filter(models.Order.order_status.in_(["Shipped", "Dispatched", "Out for Delivery"])).count()
    delivered_orders = order_query.filter(models.Order.order_status.in_(["Delivered", "Completed"])).count()
    cancelled_orders = order_query.filter(models.Order.order_status.in_(["Cancelled", "Returned"])).count()
    
    # Platform breakdown (with date filter)
    try:
        platform_query = db.query(
            models.Platform.id,
            models.Platform.display_name,
            func.count(models.Order.id).label('order_count'),
            func.sum(models.Order.order_total).label('revenue')
        ).outerjoin(
            models.Order, models.Platform.id == models.Order.platform_id
        )
        
        # Apply date filters to platform breakdown
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                platform_query = platform_query.filter(models.Order.purchase_date >= start_dt)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                end_dt = end_dt + timedelta(days=1)
                platform_query = platform_query.filter(models.Order.purchase_date < end_dt)
            except ValueError:
                pass
        
        if platform_id:
            platform_query = platform_query.filter(models.Platform.id == platform_id)
        
        platform_stats = platform_query.group_by(
            models.Platform.id, models.Platform.display_name
        ).all()
        
        platform_breakdown = [
            {
                "platform_id": p.id,
                "platform_name": p.display_name,
                "order_count": int(count or 0),
                "revenue": float(revenue or 0)
            }
            for p, count, revenue in platform_stats
        ]
    except Exception as e:
        # Fallback if join fails
        platforms = db.query(models.Platform).all()
        platform_breakdown = [
            {
                "platform_id": p.id,
                "platform_name": p.display_name,
                "order_count": 0,
                "revenue": 0.0
            }
            for p in platforms
        ]
    
    # Total inventory
    inv_query = db.query(models.Inventory)
    if platform_id:
        inv_query = inv_query.filter(models.Inventory.platform_id == platform_id)
    
    total_skus = inv_query.count()
    total_inventory_qty = inv_query.with_entities(func.sum(models.Inventory.total_quantity)).scalar() or 0
    available_inventory_qty = inv_query.with_entities(func.sum(models.Inventory.available_quantity)).scalar() or 0
    reserved_inventory_qty = inv_query.with_entities(func.sum(models.Inventory.reserved_quantity)).scalar() or 0
    
    # Order status distribution for charts
    order_status_distribution = {
        "Pending": pending_orders,
        "Shipped": shipped_orders,
        "Delivered": delivered_orders,
        "Cancelled": cancelled_orders
    }
    
    # Recent orders (last 10)
    recent_orders = order_query.order_by(models.Order.purchase_date.desc()).limit(10).all()
    recent_orders_data = [
        {
            "id": o.id,
            "platform": o.platform.display_name if o.platform else "Unknown",
            "platform_order_id": o.platform_order_id,
            "status": o.order_status,
            "total": float(o.order_total or 0),
            "currency": o.currency,
            "purchase_date": o.purchase_date.isoformat() if o.purchase_date else None,
        }
        for o in recent_orders
    ]
    
    # Calculate average order value
    avg_order_value = float(total_revenue / total_orders) if total_orders > 0 else 0.0
    
    # Calculate conversion metrics
    total_status_orders = pending_orders + shipped_orders + delivered_orders + cancelled_orders
    delivery_rate = (delivered_orders / total_status_orders * 100) if total_status_orders > 0 else 0.0
    
    return {
        "total_orders": int(total_orders),
        "total_revenue": float(total_revenue),
        "avg_order_value": round(avg_order_value, 2),
        "pending_orders": int(pending_orders),
        "shipped_orders": int(shipped_orders),
        "delivered_orders": int(delivered_orders),
        "cancelled_orders": int(cancelled_orders),
        "delivery_rate": round(delivery_rate, 2),
        "order_status_distribution": order_status_distribution,
        "platform_breakdown": platform_breakdown,
        "inventory": {
            "total_skus": int(total_skus),
            "total_quantity": int(total_inventory_qty),
            "available_quantity": int(available_inventory_qty),
            "reserved_quantity": int(reserved_inventory_qty),
        },
        "recent_orders": recent_orders_data
    }
