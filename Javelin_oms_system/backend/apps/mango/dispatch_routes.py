"""Dispatch Scanning API Routes"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta

from ..common.db import get_db
from ..common.models import DispatchScan, Order, Platform, User, Warehouse
from .dispatch_schemas import (
    DispatchScanCreate,
    DispatchScanUpdate,
    DispatchScanResponse,
    DispatchScanFilter,
    DispatchReport,
    DispatchReportItem,
    DispatchSummary,
    ValidationResponse
)
from ..common.dependencies import get_current_user

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


@router.post("/scan", response_model=DispatchScanResponse)
async def record_dispatch_scan(
    scan_data: DispatchScanCreate,
    validation_mode: str = Query(default="strict", enum=["strict", "loose"]),
    scan_action: str = Query(default="dispatch", enum=["dispatch", "cancel"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record a new dispatch scan or update existing to cancelled
    
    Validation Modes:
    - strict: Requires order to exist in database before recording (default)
    - loose: Records scan immediately, maps to order later if found
    
    Scan Actions:
    - dispatch: Mark order as dispatched (default)
    - cancel: Cancel existing dispatch record
    """
    
    order_id = None
    platform_id = None
    platform_name_resolved = scan_data.platform_name
    
    # Check if already scanned
    existing_scan = db.query(DispatchScan).filter(
        and_(
            DispatchScan.platform_order_id == scan_data.platform_order_id,
            DispatchScan.company_id == current_user.company_id
        )
    ).first()
    
    # If CANCEL mode and scan exists, update it to cancelled
    if scan_action == "cancel" and existing_scan:
        existing_scan.scan_action = "cancel"
        existing_scan.dispatch_status = "cancelled"
        existing_scan.notes = (existing_scan.notes or "") + f"\nCancelled at {datetime.now()}"
        
        # Update order status if linked
        if existing_scan.order_id:
            order = db.query(Order).filter(Order.id == existing_scan.order_id).first()
            if order:
                order.is_dispatched = False
                order.dispatched_at = None
        
        db.commit()
        db.refresh(existing_scan)
        return existing_scan
    
    # If DISPATCH mode and already exists, error
    if scan_action == "dispatch" and existing_scan:
        raise HTTPException(
            status_code=400,
            detail=f"Order '{scan_data.platform_order_id}' has already been scanned on {existing_scan.scanned_at}"
        )
    
    if validation_mode == "strict":
        # METHOD 1: STRICT - Order must exist first
        order = db.query(Order).filter(
            Order.platform_order_id == scan_data.platform_order_id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=404,
                detail=f"Order with ID '{scan_data.platform_order_id}' not found. Enable 'Loose Validation' mode to scan without order data."
            )
        
        order_id = order.id
        platform_id = order.platform_id
        platform_name_resolved = scan_data.platform_name or (order.platform.name if order.platform else None)
        
        # Update order dispatch status
        order.is_dispatched = True
        order.dispatched_at = datetime.now()
        
    else:  # loose mode
        # METHOD 2: LOOSE - Try to find order, but proceed anyway
        order = db.query(Order).filter(
            Order.platform_order_id == scan_data.platform_order_id
        ).first()
        
        if order:
            order_id = order.id
            platform_id = order.platform_id
            platform_name_resolved = scan_data.platform_name or (order.platform.name if order.platform else None)
            
            # Update order dispatch status if order exists
            order.is_dispatched = True
            order.dispatched_at = datetime.now()
        # If order not found, we still proceed with null order_id
    
    # Create dispatch scan record
    dispatch_scan = DispatchScan(
        company_id=current_user.company_id,
        order_id=order_id,  # May be None in loose mode
        platform_id=platform_id,  # May be None in loose mode
        platform_name=platform_name_resolved,
        platform_order_id=scan_data.platform_order_id,
        barcode_data=scan_data.barcode_data,
        qr_code_data=scan_data.qr_code_data,
        scanned_by_user_id=current_user.id,
        warehouse_id=scan_data.warehouse_id,
        awb_number=scan_data.awb_number,
        courier_partner=scan_data.courier_partner,
        notes=scan_data.notes,
        scan_metadata=scan_data.metadata,
        scan_action=scan_action
    )
    
    db.add(dispatch_scan)
    db.commit()
    db.refresh(dispatch_scan)
    
    return dispatch_scan


@router.get("/scans", response_model=List[DispatchScanResponse])
async def list_dispatch_scans(
    platform_id: Optional[int] = None,
    platform_name: Optional[str] = None,
    dispatch_status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    scanned_by_user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    awb_number: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List dispatch scans with optional filters"""
    
    query = db.query(DispatchScan).filter(
        DispatchScan.company_id == current_user.company_id
    )
    
    # Apply filters
    if platform_id:
        query = query.filter(DispatchScan.platform_id == platform_id)
    
    if platform_name:
        query = query.filter(DispatchScan.platform_name == platform_name)
    
    if dispatch_status:
        query = query.filter(DispatchScan.dispatch_status == dispatch_status)
    
    if date_from:
        query = query.filter(DispatchScan.scanned_at >= date_from)
    
    if date_to:
        # Add 1 day to include the entire end date
        date_to_inclusive = date_to + timedelta(days=1)
        query = query.filter(DispatchScan.scanned_at < date_to_inclusive)
    
    if scanned_by_user_id:
        query = query.filter(DispatchScan.scanned_by_user_id == scanned_by_user_id)
    
    if warehouse_id:
        query = query.filter(DispatchScan.warehouse_id == warehouse_id)
    
    if awb_number:
        query = query.filter(DispatchScan.awb_number.like(f"%{awb_number}%"))
    
    # Order by most recent first
    query = query.order_by(DispatchScan.scanned_at.desc())
    
    # Pagination
    scans = query.offset(offset).limit(limit).all()
    
    return scans


@router.get("/scans/{scan_id}", response_model=DispatchScanResponse)
async def get_dispatch_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single dispatch scan by ID"""
    
    scan = db.query(DispatchScan).filter(
        and_(
            DispatchScan.id == scan_id,
            DispatchScan.company_id == current_user.company_id
        )
    ).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Dispatch scan not found")
    
    return scan


@router.put("/scans/{scan_id}", response_model=DispatchScanResponse)
async def update_dispatch_scan(
    scan_id: int,
    update_data: DispatchScanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update dispatch scan status and details"""
    
    scan = db.query(DispatchScan).filter(
        and_(
            DispatchScan.id == scan_id,
            DispatchScan.company_id == current_user.company_id
        )
    ).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Dispatch scan not found")
    
    # Update fields
    if update_data.dispatch_status:
        scan.dispatch_status = update_data.dispatch_status
    
    if update_data.awb_number:
        scan.awb_number = update_data.awb_number
    
    if update_data.courier_partner:
        scan.courier_partner = update_data.courier_partner
    
    if update_data.manifest_id:
        scan.manifest_id = update_data.manifest_id
    
    if update_data.notes:
        scan.notes = update_data.notes
    
    db.commit()
    db.refresh(scan)
    
    return scan


@router.get("/summary", response_model=DispatchSummary)
async def get_dispatch_summary(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dispatch summary statistics"""
    
    query = db.query(DispatchScan).filter(
        DispatchScan.company_id == current_user.company_id
    )
    
    # Apply date filters
    if date_from:
        query = query.filter(DispatchScan.scanned_at >= date_from)
    
    if date_to:
        date_to_inclusive = date_to + timedelta(days=1)
        query = query.filter(DispatchScan.scanned_at < date_to_inclusive)
    
    total_scans = query.count()
    
    # Count scans today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    scanned_today = db.query(DispatchScan).filter(
        and_(
            DispatchScan.company_id == current_user.company_id,
            DispatchScan.scanned_at >= today_start
        )
    ).count()
    
    # Group by platform
    by_platform_raw = db.query(
        DispatchScan.platform_name,
        func.count(DispatchScan.id).label('count')
    ).filter(
        DispatchScan.company_id == current_user.company_id
    ).group_by(DispatchScan.platform_name).all()
    
    by_platform = {platform or "Unknown": count for platform, count in by_platform_raw}
    
    # Group by status
    by_status_raw = db.query(
        DispatchScan.dispatch_status,
        func.count(DispatchScan.id).label('count')
    ).filter(
        DispatchScan.company_id == current_user.company_id
    ).group_by(DispatchScan.dispatch_status).all()
    
    by_status = {status: count for status, count in by_status_raw}
    
    # Group by courier
    by_courier_raw = db.query(
        DispatchScan.courier_partner,
        func.count(DispatchScan.id).label('count')
    ).filter(
        and_(
            DispatchScan.company_id == current_user.company_id,
            DispatchScan.courier_partner.isnot(None)
        )
    ).group_by(DispatchScan.courier_partner).all()
    
    by_courier = {courier or "Unknown": count for courier, count in by_courier_raw}
    
    return DispatchSummary(
        total_scans=total_scans,
        scanned_today=scanned_today,
        by_platform=by_platform,
        by_status=by_status,
        by_courier=by_courier
    )


@router.get("/report", response_model=DispatchReport)
async def generate_dispatch_report(
    date_from: datetime = Query(..., description="Report start date"),
    date_to: datetime = Query(..., description="Report end date"),
    platform_id: Optional[int] = None,
    platform_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate detailed dispatch report"""
    
    # Build query
    query = db.query(
        DispatchScan,
        User.full_name.label("scanned_by_name"),
        Warehouse.name.label("warehouse_name"),
        Order.order_total,
        Order.customer_name
    ).join(
        User, DispatchScan.scanned_by_user_id == User.id
    ).outerjoin(
        Warehouse, DispatchScan.warehouse_id == Warehouse.id
    ).outerjoin(
        Order, DispatchScan.order_id == Order.id
    ).filter(
        DispatchScan.company_id == current_user.company_id
    )
    
    # Apply date filter
    query = query.filter(DispatchScan.scanned_at >= date_from)
    date_to_inclusive = date_to + timedelta(days=1)
    query = query.filter(DispatchScan.scanned_at < date_to_inclusive)
    
    # Apply platform filters
    if platform_id:
        query = query.filter(DispatchScan.platform_id == platform_id)
    
    if platform_name:
        query = query.filter(DispatchScan.platform_name == platform_name)
    
    # Execute query
    results = query.all()
    
    # Build report items
    items = []
    for scan, scanned_by_name, warehouse_name, order_total, customer_name in results:
        items.append(DispatchReportItem(
            scan_id=scan.id,
            platform_order_id=scan.platform_order_id,
            platform_name=scan.platform_name,
            scanned_at=scan.scanned_at,
            scanned_by=scanned_by_name or "Unknown",
            warehouse_name=warehouse_name,
            awb_number=scan.awb_number,
            courier_partner=scan.courier_partner,
            dispatch_status=scan.dispatch_status,
            order_total=float(order_total) if order_total else None,
            customer_name=customer_name
        ))
    
    # Get summary for report period
    summary = await get_dispatch_summary(date_from, date_to, db, current_user)
    
    return DispatchReport(
        date_from=date_from,
        date_to=date_to,
        total_records=len(items),
        items=items,
        summary=summary
    )


@router.post("/validate", response_model=ValidationResponse)
async def validate_barcode(
    barcode_data: str = Query(..., description="Barcode or platform order ID to validate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate a barcode before scanning"""
    
    # Try to find order by platform_order_id
    order = db.query(Order).filter(
        Order.platform_order_id == barcode_data
    ).first()
    
    if not order:
        return ValidationResponse(
            is_valid=False,
            message=f"Order not found with ID: {barcode_data}",
            already_dispatched=False
        )
    
    # Check if already dispatched
    existing_scan = db.query(DispatchScan).filter(
        and_(
            DispatchScan.platform_order_id == barcode_data,
            DispatchScan.company_id == current_user.company_id
        )
    ).first()
    
    if existing_scan:
        return ValidationResponse(
            is_valid=False,
            message=f"Order already dispatched on {existing_scan.scanned_at.strftime('%Y-%m-%d %H:%M')}",
            order_id=order.id,
            platform_order_id=order.platform_order_id,
            already_dispatched=True,
            order_details={
                "scanned_at": existing_scan.scanned_at.isoformat(),
                "awb_number": existing_scan.awb_number,
                "dispatch_status": existing_scan.dispatch_status
            }
        )
    
    # Valid and not dispatched
    return ValidationResponse(
        is_valid=True,
        message="Order found and ready for dispatch",
        order_id=order.id,
        platform_order_id=order.platform_order_id,
        platform_name=order.platform.name if order.platform else None,
        already_dispatched=False,
        order_details={
            "customer_name": order.customer_name,
            "order_total": float(order.order_total) if order.order_total else 0,
            "order_status": order.order_status
        }
    )
