"""Unified database models for all platforms"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base


class Platform(Base):
    """Supported e-commerce platforms"""
    __tablename__ = "platforms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)  # amazon, flipkart, meesho, myntra, etc.
    display_name = Column(String(100))
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    api_config = Column(JSON)  # Store platform-specific API credentials/config
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Order(Base):
    """Unified orders table for all platforms"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"), index=True)
    platform_order_id = Column(String(100), index=True)  # Platform-specific order ID
    seller_id = Column(Integer, index=True, default=1)
    order_status = Column(String(50), index=True)  # Pending, Shipped, Delivered, Cancelled, etc.
    purchase_date = Column(DateTime, index=True)
    last_update_date = Column(DateTime)
    order_total = Column(Numeric(10, 2))
    currency = Column(String(10), default="INR")
    marketplace_id = Column(String(50))  # Platform-specific marketplace identifier
    customer_name = Column(String(200))
    customer_email = Column(String(200))
    shipping_address = Column(Text)
    platform_metadata = Column(JSON)  # Store platform-specific fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    platform = relationship("Platform")
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class OrderItem(Base):
    """Unified order items table for all platforms"""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    platform_order_id = Column(String(100), index=True)  # For quick lookup
    product_id = Column(String(100))  # ASIN, FSN, Product ID, etc. (platform-agnostic)
    sku = Column(String(100), index=True)
    product_name = Column(String(500))
    quantity = Column(Integer)
    item_price = Column(Numeric(10, 2))
    platform_metadata = Column(JSON)  # Store platform-specific item fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order = relationship("Order")


class Inventory(Base):
    """Unified inventory table for all platforms"""
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"), index=True)
    sku = Column(String(100), index=True)
    product_id = Column(String(100))  # ASIN, FSN, etc.
    product_name = Column(String(500))
    total_quantity = Column(Integer, default=0)
    available_quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    platform_metadata = Column(JSON)  # Store platform-specific inventory fields
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    platform = relationship("Platform")
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class SyncLog(Base):
    """Sync logs for all platforms"""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"), index=True, nullable=True)
    job_type = Column(String(50), index=True)  # 'orders', 'inventory'
    status = Column(String(20), index=True)  # 'success', 'failed', 'in_progress'
    message = Column(String(500))
    records_processed = Column(Integer, default=0)
    error_details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    platform = relationship("Platform")

