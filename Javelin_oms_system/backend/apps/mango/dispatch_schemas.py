"""Pydantic schemas for Dispatch Scanning"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# ============================================================
# DISPATCH SCAN SCHEMAS
# ============================================================

class DispatchScanCreate(BaseModel):
    """Schema for creating a new dispatch scan"""
    platform_order_id: str = Field(..., description="Platform's order ID (e.g., Amazon order number)")
    barcode_data: Optional[str] = Field(None, description="Raw barcode data scanned")
    qr_code_data: Optional[str] = Field(None, description="Raw QR code data scanned")
    warehouse_id: Optional[int] = Field(None, description="Warehouse ID where scan occurred")
    awb_number: Optional[str] = Field(None, description="Airway bill number")
    courier_partner: Optional[str] = Field(None, description="Courier partner name")
    platform_name: Optional[str] = Field(None, description="Platform name (Amazon, Flipkart, etc.)")
    notes: Optional[str] = Field(None, description="Additional notes")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class DispatchScanUpdate(BaseModel):
    """Schema for updating dispatch scan status"""
    dispatch_status: Optional[str] = Field(None, description="New dispatch status")
    awb_number: Optional[str] = Field(None, description="Airway bill number")
    courier_partner: Optional[str] = Field(None, description="Courier partner")
    manifest_id: Optional[int] = Field(None, description="Courier manifest ID")
    notes: Optional[str] = Field(None, description="Additional notes")


class DispatchScanResponse(BaseModel):
    """Schema for dispatch scan response"""
    id: int
    company_id: int
    order_id: Optional[int]
    platform_id: Optional[int]
    platform_name: Optional[str]
    platform_order_id: str
    barcode_data: Optional[str]
    qr_code_data: Optional[str]
    scanned_at: datetime
    scanned_by_user_id: int
    warehouse_id: Optional[int]
    awb_number: Optional[str]
    courier_partner: Optional[str]
    dispatch_status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DispatchScanFilter(BaseModel):
    """Schema for filtering dispatch scans"""
    platform_id: Optional[int] = None
    platform_name: Optional[str] = None
    dispatch_status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    scanned_by_user_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    awb_number: Optional[str] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)


class DispatchSummary(BaseModel):
    """Schema for dispatch summary statistics"""
    total_scans: int
    scanned_today: int
    by_platform: Dict[str, int]
    by_status: Dict[str, int]
    by_courier: Dict[str, int]


class DispatchReportItem(BaseModel):
    """Schema for individual report item"""
    scan_id: int
    platform_order_id: str
    platform_name: Optional[str]
    scanned_at: datetime
    scanned_by: str  # User name
    warehouse_name: Optional[str]
    awb_number: Optional[str]
    courier_partner: Optional[str]
    dispatch_status: str
    order_total: Optional[float]
    customer_name: Optional[str]
    
    class Config:
        from_attributes = True


class DispatchReport(BaseModel):
    """Schema for dispatch report response"""
    date_from: datetime
    date_to: datetime
    total_records: int
    items: list[DispatchReportItem]
    summary: DispatchSummary


class ValidationResponse(BaseModel):
    """Schema for barcode validation response"""
    is_valid: bool
    message: str
    order_id: Optional[int] = None
    platform_order_id: Optional[str] = None
    platform_name: Optional[str] = None
    already_dispatched: bool = False
    order_details: Optional[Dict[str, Any]] = None
