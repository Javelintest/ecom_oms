"""
Multi-Channel Master System - SQLAlchemy Models
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime
from ..common.db import Base


class Channel(Base):
    """Channel Registry - stores all created channels"""
    __tablename__ = "channels"
    
    id =Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    channel_name = Column(String(100), nullable=False)
    channel_code = Column(String(50), unique=True, nullable=False, index=True)
    channel_type = Column(String(50), default="marketplace")
    table_name = Column(String(100), unique=True, nullable=False)  # Legacy - default table
    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    company = relationship("Company", foreign_keys=[company_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    field_mappings = relationship("ChannelFieldMapping", back_populates="channel", cascade="all, delete-orphan")
    master_orders = relationship("MasterOrderSheet", back_populates="channel")
    channel_tables = relationship("ChannelTable", back_populates="channel", cascade="all, delete-orphan")


class ChannelTable(Base):
    """Multiple tables per channel - allows custom table names and types"""
    __tablename__ = "channel_tables"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False, index=True)
    table_name = Column(String(100), unique=True, nullable=False)  # Custom table name
    table_type = Column(String(50), default="orders")  # orders, returns, inventory, custom
    display_name = Column(String(100))  # User-friendly name
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System tables cannot be deleted
    record_count = Column(Integer, default=0)  # Cache for quick stats
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    channel = relationship("Channel", back_populates="channel_tables")
    table_schema = relationship("ChannelTableSchema", back_populates="channel_table", cascade="all, delete-orphan")



class ChannelFieldMapping(Base):
    """Field Mapping between Channel and Master Order Sheet"""
    __tablename__ = "channel_field_mapping"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    channel_field_name = Column(String(100), nullable=False)
    channel_field_type = Column(String(50), nullable=False)
    master_field_name = Column(String(100), nullable=False, index=True)
    transformation_rule = Column(JSON)
    is_required = Column(Boolean, default=False)
    default_value = Column(String(255))
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    channel = relationship("Channel", back_populates="field_mappings")


class MasterOrderSheet(Base):
    """Unified Master Order Sheet - consolidates all channel orders"""
    __tablename__ = "master_order_sheet"
    
    master_order_id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False, index=True)
    channel_order_id = Column(String(100), nullable=False, index=True)
    
    # Common standardized fields
    order_number = Column(String(100), index=True)
    order_date = Column(DateTime, index=True)
    customer_name = Column(String(200))
    customer_email = Column(String(200), index=True)
    customer_phone = Column(String(50))
    
    shipping_address = Column(Text)
    shipping_city = Column(String(100))
    shipping_state = Column(String(100))
    shipping_pincode = Column(String(20))
    shipping_country = Column(String(100))
    
    order_amount = Column(DECIMAL(12, 2))
    payment_method = Column(String(50))
    payment_status = Column(String(50))
    order_status = Column(String(50), index=True)
    
    # Products as JSON
    items = Column(JSON)
    
    # Metadata
    source_table_name = Column(String(100), index=True)
    source_record_id = Column(Integer, index=True)
    raw_data = Column(JSON)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    synced_at = Column(DateTime)
    
    # Relationships
    channel = relationship("Channel", back_populates="master_orders")
    dispatch_mappings = relationship("DispatchChannelMapping", back_populates="master_order")


class ChannelTableSchema(Base):
    """Schema definition for dynamically created channel tables"""
    __tablename__ = "channel_table_schema"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False, index=True)  # Legacy support
    channel_table_id = Column(Integer, ForeignKey("channel_tables.id"), nullable=True, index=True)  # New - link to specific table
    column_name = Column(String(100), nullable=False)  # field_key (technical name)
    field_name = Column(String(100))  # Display name
    column_type = Column(String(50), nullable=False)
    column_length = Column(Integer)
    is_nullable = Column(Boolean, default=True)
    is_required = Column(Boolean, default=False)
    is_unique = Column(Boolean, default=False)
    is_primary_key = Column(Boolean, default=False)
    is_indexed = Column(Boolean, default=False)
    on_duplicate_action = Column(String(50), default="skip")  # skip, update, error
    default_value = Column(String(255))
    column_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    channel = relationship("Channel")
    channel_table = relationship("ChannelTable", back_populates="table_schema")


class DispatchChannelMapping(Base):
    """Maps dispatch scans to channel-specific orders"""
    __tablename__ = "dispatch_channel_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("dispatch_scans.id"), nullable=False, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False, index=True)
    channel_order_id = Column(String(100))
    master_order_id = Column(Integer, ForeignKey("master_order_sheet.master_order_id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scan = relationship("DispatchScan")
    channel = relationship("Channel")
    master_order = relationship("MasterOrderSheet", back_populates="dispatch_mappings")
