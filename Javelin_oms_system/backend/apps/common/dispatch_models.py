"""Dispatch Scanning Models"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Text, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base


class DispatchScan(Base):
    """Records of scanned dispatches for channel orders"""
    __tablename__ = "dispatch_scans"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True, nullable=True)
    
    # Channel Information
    platform_id = Column(Integer, ForeignKey("platforms.id"), index=True, nullable=True)
    platform_name = Column(String(50), index=True)  # Amazon, Flipkart, Meesho, Myntra
    platform_order_id = Column(String(100), index=True)  # Channel's order ID
    
    # Scan Data
    barcode_data = Column(Text)  # Raw barcode data scanned
    qr_code_data = Column(Text)  # Raw QR code data scanned
    label_image_url = Column(String(500))  # Optional: photo of label
    
    # Dispatch Details
    scanned_at = Column(DateTime, nullable=False, index=True, server_default=func.now())
    scanned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    
    # Tracking Information
    awb_number = Column(String(100), index=True)  # Airway bill number
    courier_partner = Column(String(100))  # Delhivery, BlueDart, etc.
    
    # Status
    dispatch_status = Column(String(50), default="scanned", index=True)  
    # scanned, packed, shipped, in_transit, delivered
    
    manifest_id = Column(Integer, nullable=True)  # Link to courier manifest if applicable
    
    # Metadata
    notes = Column(Text)
    metadata = Column(JSON)  # Additional channel-specific data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company")
    order = relationship("Order")
    platform = relationship("Platform")
    scanned_by = relationship("User", foreign_keys=[scanned_by_user_id])
    warehouse = relationship("Warehouse")
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )
