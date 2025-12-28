from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.apps.common import get_db, models
from ..services import OrderService, SyncService
from ..platforms import get_adapter

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


@router.get("/{order_id}", response_model=dict)
def get_order(
    order_id: str,
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Get details for a specific order by platform order ID.
    First checks database, then fetches from platform API if needed.
    """
    # Try to get from database first
    order = OrderService.get_order_by_id(db, order_id, platform_name)
    if order:
        return order
    
    # If not in database, fetch from platform API
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        # Fetch order from Amazon API
        order_data = adapter._spapi_client.get_order(order_id)
        
        # Optionally save to database
        OrderService.save_order(db, platform.id, order_data)
        db.commit()
        
        return order_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching order: {str(e)}")


@router.get("/{order_id}/buyer-info", response_model=dict)
def get_order_buyer_info(
    order_id: str,
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Get buyer information for a specific order (PII data).
    Requires appropriate permissions in Amazon SP-API.
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        buyer_info = adapter._spapi_client.get_order_buyer_info(order_id)
        return buyer_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching buyer info: {str(e)}")


@router.get("/{order_id}/address", response_model=dict)
def get_order_address(
    order_id: str,
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Get shipping address for a specific order.
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        address = adapter._spapi_client.get_order_address(order_id)
        return address
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching address: {str(e)}")


@router.post("/{order_id}/shipment-status", response_model=dict)
def update_shipment_status(
    order_id: str,
    shipment_data: Dict[str, Any] = Body(...),
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Update shipment status for an order.
    
    Request body should contain:
    - shipment_status: Status (e.g., 'ReadyForPickup', 'PickedUp', 'RefusedPickup')
    - order_items: List of order items with quantities
    - shipment_date: Optional shipment date (ISO format)
    - marketplace_id: Optional marketplace ID
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        result = adapter._spapi_client.update_shipment_status(order_id, shipment_data)
        
        # Update order status in database
        order = db.query(models.Order).filter_by(
            platform_id=platform.id,
            platform_order_id=order_id
        ).first()
        if order:
            order.order_status = shipment_data.get("shipment_status", order.order_status)
            db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating shipment status: {str(e)}")


@router.post("/{order_id}/confirm-shipment", response_model=dict)
def confirm_shipment(
    order_id: str,
    confirmation_data: Dict[str, Any] = Body(...),
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Confirm shipment for a Seller Fulfilled Prime order.
    
    Request body should contain:
    - package_detail: Package tracking details
        - package_reference_id: Package reference ID
        - carrier_code: Shipping carrier code
        - carrier_name: Shipping carrier name (if carrier_code is 'Other')
        - shipping_method: Shipping method
        - tracking_number: Tracking number
        - ship_date: Ship date (ISO format)
        - order_items: List of items in package
    - marketplace_id: Optional marketplace ID
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        result = adapter._spapi_client.confirm_shipment(order_id, confirmation_data)
        
        # Update order status in database
        order = db.query(models.Order).filter_by(
            platform_id=platform.id,
            platform_order_id=order_id
        ).first()
        if order:
            order.order_status = "Shipped"
            # Store tracking info in metadata
            if not order.platform_metadata:
                order.platform_metadata = {}
            order.platform_metadata["tracking"] = confirmation_data.get("package_detail", {})
            db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error confirming shipment: {str(e)}")


@router.get("/{order_id}/items/buyer-info", response_model=List[dict])
def get_order_items_buyer_info(
    order_id: str,
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Get buyer information for order items (PII data).
    Includes gift wrap, customization, and other buyer-specific details.
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        items_buyer_info = adapter._spapi_client.get_order_items_buyer_info(order_id)
        return items_buyer_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching order items buyer info: {str(e)}")


@router.get("/{order_id}/regulated-info", response_model=dict)
def get_order_regulated_info(
    order_id: str,
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Get regulated information for an order (for regulated products like alcohol, supplements, etc.).
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        regulated_info = adapter._spapi_client.get_order_regulated_info(order_id)
        return regulated_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching regulated info: {str(e)}")


@router.post("/{order_id}/verification-status", response_model=dict)
def update_verification_status(
    order_id: str,
    verification_data: Dict[str, Any] = Body(...),
    platform_name: str = Query("amazon", description="Platform name"),
    db: Session = Depends(get_db)
):
    """
    Update verification status for a regulated order.
    
    Request body should contain:
    - status: Verification status (e.g., 'Approved', 'Rejected', 'Pending')
    - external_reviewer_id: ID of external reviewer
    - rejection_reason_id: Reason ID if rejected
    """
    try:
        platform = db.query(models.Platform).filter_by(name=platform_name).first()
        if not platform:
            raise HTTPException(status_code=404, detail=f"Platform {platform_name} not found")
        
        adapter = get_adapter(platform_name, platform.api_config)
        if not hasattr(adapter, '_spapi_client') or not adapter._spapi_client:
            raise HTTPException(status_code=400, detail="Amazon SP-API not configured")
        
        result = adapter._spapi_client.update_verification_status(order_id, verification_data)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating verification status: {str(e)}")

