"""Unified database models for all platforms"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Text, JSON, Boolean
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
    
    # Dispatch Tracking
    is_dispatched = Column(Boolean, default=False, index=True)
    dispatched_at = Column(DateTime, nullable=True, index=True)
    
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


    platform = relationship("Platform")


class UserCompany(Base):
    """Link table for Users and Companies with roles"""
    __tablename__ = "user_companies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    role = Column(String(50), default="owner") # owner, admin, editor, viewer
    
    user = relationship("User", back_populates="company_memberships")
    company = relationship("Company", back_populates="members")


class Company(Base):
    """Multi-tenant Organization Entity"""
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    
    # Contact & Address
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(200), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India")
    zip_code = Column(String(20), nullable=True)
    
    # Legal & Settings
    tax_id = Column(String(50), nullable=True) # GSTIN/VAT
    currency = Column(String(10), default="INR")
    timezone = Column(String(50), default="Asia/Kolkata")
    industry = Column(String(100), nullable=True) # e.g. Retail, Services
    
    # Advanced Preferences
    fiscal_year = Column(String(50), default="April - March")
    report_basis = Column(String(20), default="Accrual") # Accrual, Cash
    language = Column(String(50), default="English") 
    date_format = Column(String(50), default="dd/MM/yyyy")
    
    logo_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # users = relationship("User", back_populates="company") # Deprecated single link
    members = relationship("UserCompany", back_populates="company")


class User(Base):
    """Users table for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    
    # Acts as "Active Company" or "Default Company"
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", lazy="joined") # Active company context
    company_memberships = relationship("UserCompany", back_populates="user")
    
    is_active = Column(Integer, default=1)
    is_admin = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class Application(Base):
    """Registered Applications in the Suite (e.g. OMS, Mango)"""
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    code = Column(String(50), unique=True, index=True) # oms, mango, reports
    description = Column(String(255))
    is_active = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompanyApp(Base):
    """Apps enabled for a specific company"""
    __tablename__ = "company_apps"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    app_id = Column(Integer, ForeignKey("applications.id"))
    is_active = Column(Integer, default=1) # 1=Enabled, 0=Disabled
    
    company = relationship("Company")
    app = relationship("Application")


class UserAppAccess(Base):
    """RBAC: User access to specific apps within a company"""
    __tablename__ = "user_app_access"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    app_id = Column(Integer, ForeignKey("applications.id"))
    role = Column(String(50), default="viewer") # admin, editor, viewer
    permissions = Column(JSON) # Granular permissions
    
    user = relationship("User")
    company = relationship("Company")
    app = relationship("Application")


class Customer(Base):
    """Enhanced Customer Entity for all apps with Ledger Management"""
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)  # Tenant
    
    # Basic Information
    customer_code = Column(String(50), unique=True, index=True)  # Auto-generated: CUST-0001
    name = Column(String(200), index=True, nullable=False)
    display_name = Column(String(200))  # Optional short name
    customer_type = Column(String(50), default="RETAIL")  # RETAIL, WHOLESALE, DISTRIBUTOR
    
    # Contact Information
    email = Column(String(200), index=True)
    phone = Column(String(50))
    mobile = Column(String(20))
    website = Column(String(200))
    address = Column(Text)  # Legacy field, use CustomerAddress table for new entries
    
    # Tax Information
    gst_number = Column(String(15), index=True)  # GSTIN
    pan_number = Column(String(10))
    tax_id = Column(String(50))  # Legacy field or international tax ID
    tax_registration_number = Column(String(50))
    
    # Financial Settings
    currency = Column(String(10), default="INR")
    payment_terms = Column(String(50), default="NET_30")  # NET_30, NET_60, COD
    credit_limit = Column(Numeric(15, 2), default=0)
    opening_balance = Column(Numeric(15, 2), default=0)
    opening_balance_date = Column(DateTime)
    current_balance = Column(Numeric(15, 2), default=0)  # Calculated from ledger
    
    # Status Flags
    is_active = Column(Boolean, default=True)
    is_credit_hold = Column(Boolean, default=False)
    is_blacklisted = Column(Boolean, default=False)
    
    # Additional Information
    notes = Column(Text)
    tags = Column(JSON)  # Array of tag strings
    app_metadata = Column(JSON)  # Legacy field for app-specific data
    custom_fields = Column(JSON)  # For extensibility
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    company = relationship("Company")
    addresses = relationship("CustomerAddress", back_populates="customer", cascade="all, delete-orphan")
    contacts = relationship("CustomerContact", back_populates="customer", cascade="all, delete-orphan")
    ledger_entries = relationship("CustomerLedger", back_populates="customer", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_user_id])


class Vendor(Base):
    """Supplier/Vendor details for PO management"""
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    name = Column(String(200), index=True)
    code = Column(String(50), unique=True, index=True)
    contact_person = Column(String(100))
    email = Column(String(200)) # e.g. for sending POs
    phone = Column(String(50))
    address = Column(Text)
    tax_id = Column(String(50)) # GSTIN/VAT
    payment_terms = Column(String(100)) # e.g. Net 30
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Warehouse(Base):
    """Physical storage locations"""
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    name = Column(String(100), index=True)
    code = Column(String(50), unique=True, index=True)
    address = Column(Text)
    is_active = Column(Integer, default=1)
    
    # Simple single-level bin logic for now, can expand to WarehouseBin model later
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    """Master SKU Catalog (Internal)"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    sku = Column(String(100), index=True) # Changed from unique to allow multi-tenant same SKU if needed, or keep unique globally? Keeping standard index.
    # Note: Removing unique constraint in code doesn't drop it in DB immediately.
    name = Column(String(500))
    description = Column(Text)
    category = Column(String(100))
    brand = Column(String(100))
    
    # Financials & details
    hsn_sac = Column(String(50))
    purchase_description = Column(Text)
    purchase_rate = Column(Numeric(12, 2), default=0)
    sales_rate = Column(Numeric(12, 2), default=0) # Selling Price
    
    # Tax Info
    intra_state_tax_rate = Column(String(50)) # e.g. "GST18"
    inter_state_tax_rate = Column(String(50)) # e.g. "IGST18"
    
    # Dimensions for shipping
    weight_kg = Column(Numeric(10,3))
    length_cm = Column(Numeric(10,2))
    width_cm = Column(Numeric(10,2))
    height_cm = Column(Numeric(10,2))
    
    # Core Identification
    item_code = Column(String(100), index=True) # Usually same as SKU but explicit
    item_short_name = Column(String(200))
    item_type = Column(String(50)) # Raw Material, WIP, Finished Goods, Service
    item_status = Column(String(50), default='Active') # Active, Inactive, Discontinued
    parent_item_id = Column(Integer, nullable=True) # For variants or kits
    item_level = Column(Integer, default=0)

    # Category & Brand
    subcategory_id = Column(Integer, nullable=True)
    product_group = Column(String(100))
    brand_id = Column(Integer, nullable=True)
    model_no = Column(String(100))
    variant_group = Column(String(100)) # To group sizes/colors

    # Units & Inventory
    base_uom = Column(String(20))
    alternate_uom = Column(String(20))
    uom_conversion_factor = Column(Numeric(10,4), default=1.0)
    inventory_tracking_flag = Column(Boolean, default=True)
    batch_tracking_flag = Column(Boolean, default=False)
    serial_tracking_flag = Column(Boolean, default=False)
    expiry_tracking_flag = Column(Boolean, default=False)

    # Tax & Compliance
    hsn_code = Column(String(20)) # Replaces/augments hsn_sac
    gst_applicable_flag = Column(Boolean, default=True)
    tax_category = Column(String(50)) # Standard, Exempt, Nil
    cess_applicable_flag = Column(Boolean, default=False)
    country_of_origin = Column(String(50))

    # Physical & Technical
    weight_uom = Column(String(20)) # kg, g, lb
    dimension_uom = Column(String(20)) # cm, in, mm
    volume = Column(Numeric(10,4))
    color = Column(String(50))
    size = Column(String(50))
    material = Column(String(100))

    # Quality & Shelf Life
    quality_grade = Column(String(50))
    shelf_life_days = Column(Integer)
    storage_type = Column(String(50)) # Ambient, Cold, Frozen
    temperature_range = Column(String(50))

    # Pricing Reference
    costing_method = Column(String(50), default='Weighted Average') # FIFO, LIFO, W.Avg
    standard_cost = Column(Numeric(12, 2))
    default_margin_percent = Column(Numeric(5, 2))
    price_control_type = Column(String(50)) # Fixed, Dynamic

    # Logistics
    hazardous_flag = Column(Boolean, default=False)
    stackable_flag = Column(Boolean, default=True)
    min_order_qty = Column(Numeric(10,2))
    max_order_qty = Column(Numeric(10,2))
    reorder_level = Column(Numeric(10,2))

    # Analytics
    abc_classification = Column(String(1)) # A, B, C
    demand_velocity = Column(String(20)) # Fast, Slow, Non-Moving
    forecast_enabled_flag = Column(Boolean, default=True)
    lifecycle_stage = Column(String(50)) # Introduction, Growth, Maturity, Decline
    ai_tags = Column(Text) # JSON or CSV
    search_keywords = Column(Text)
    custom_attributes_json = Column(Text) # JSON string

    # Audit & Governance
    # created_at/updated_at already exist
    approved_status = Column(String(50), default='Draft')
    approved_by = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())



class CustomFieldDefinition(Base):
    """Dynamic Custom Fields Definitions"""
    __tablename__ = "custom_field_definitions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    entity_type = Column(String(50), default="product") # product, customer, order
    
    field_key = Column(String(50), index=True) # internal key e.g. cf_warranty
    field_label = Column(String(100)) # Display Label
    field_type = Column(String(50)) # Text, Number, Date, Dropdown, etc.
    
    options = Column(JSON, nullable=True) # For Select/Multi-select: ["Opt1", "Opt2"]
    default_value = Column(String(255), nullable=True)
    is_mandatory = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlatformItemMapping(Base):
    """Platform Item Mappings - Map internal SKUs to platform-specific item codes"""
    __tablename__ = "platform_item_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    
    platform_name = Column(String(50), nullable=False, index=True)  # Amazon, Flipkart, Meesho, etc.
    platform_item_code = Column(String(255), nullable=False)  # Platform SKU/ASIN/Product Code
    platform_variant_code = Column(String(255), nullable=True)  # For variant-level mapping
    platform_listing_url = Column(Text, nullable=True)  # Direct link to listing
    
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", backref="platform_mappings")


class PurchaseOrder(Base):
    """PO Head"""
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    po_number = Column(String(50), unique=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    status = Column(String(50), default="DRAFT", index=True) # DRAFT, SENT, PARTIAL, COMPLETED, CANCELLED
    
    order_date = Column(DateTime)
    expected_delivery_date = Column(DateTime)
    
    total_amount = Column(Numeric(12, 2))
    currency = Column(String(10), default="INR")
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    vendor = relationship("Vendor")
    warehouse = relationship("Warehouse")
    items = relationship("PurchaseOrderItem", back_populates="po")


class PurchaseOrderItem(Base):
    """PO Lines"""
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id")) # Link to Master SKU
    sku = Column(String(100)) # Redundant but useful for fast lookup
    
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0) # Updated by GRNs
    
    unit_price = Column(Numeric(10, 2))
    tax_rate = Column(Numeric(5, 2))
    total_price = Column(Numeric(12, 2))
    
    po = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")


class GRN(Base):
    """Goods Receipt Note Head"""
    __tablename__ = "grns"

    id = Column(Integer, primary_key=True, index=True)
    grn_number = Column(String(50), unique=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), index=True)
    vendor_invoice_no = Column(String(100))
    received_date = Column(DateTime, server_default=func.now())
    status = Column(String(50), default="DRAFT") # DRAFT, QC_PENDING, COMPLETED
    
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    po = relationship("PurchaseOrder")
    items = relationship("GRNItem", back_populates="grn")


class GRNItem(Base):
    """GRN Lines + QC Info"""
    __tablename__ = "grn_items"

    id = Column(Integer, primary_key=True, index=True)
    grn_id = Column(Integer, ForeignKey("grns.id"), index=True)
    po_item_id = Column(Integer, ForeignKey("purchase_order_items.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    
    quantity_received = Column(Integer, default=0)
    quantity_accepted = Column(Integer, default=0) # Passes QC
    quantity_rejected = Column(Integer, default=0) # Fails QC
    
    batch_number = Column(String(100))
    expiry_date = Column(DateTime, nullable=True)
    rejection_reason = Column(String(200))
    
    grn = relationship("GRN", back_populates="items")


class StockLedger(Base):
    """Audit Trail for Inventory Movements"""
    __tablename__ = "stock_ledger"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    
    transaction_type = Column(String(50), index=True) # IN_PO, OUT_ORDER, RETURN_VENDOR, ADJUSTMENT
    quantity = Column(Integer, nullable=False) # Positive for IN, Negative for OUT
    reference_model = Column(String(50)) # 'GRN', 'ORDER', 'ADJUSTMENT'
    reference_id = Column(String(50)) # GRN ID or Order ID
    
    balance_after = Column(Integer) # Snapshot of balance
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StockTransfer(Base):
    """Inter-warehouse Stock Transfer Head"""
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(50), unique=True, index=True)
    source_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    status = Column(String(50), default="DRAFT", index=True) # DRAFT, PENDING_APPROVAL, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED, REJECTED
    
    # Approval Workflow Fields
    approval_status = Column(String(50), default="draft", index=True) # draft, pending_approval, approved, rejected
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    transfer_date = Column(DateTime, server_default=func.now())
    completed_date = Column(DateTime, nullable=True)
    notes = Column(Text)
    
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id])
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id])
    items = relationship("StockTransferItem", back_populates="transfer")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])


class StockTransferItem(Base):
    """Stock Transfer Lines"""
    __tablename__ = "stock_transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("stock_transfers.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    
    quantity_sent = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0) # For partial delivery / discrepancy
    
    transfer = relationship("StockTransfer", back_populates="items")
    product = relationship("Product")


class StockAdjustment(Base):
    """Manual Inventory Corrections"""
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    adjustment_number = Column(String(50), unique=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    
    quantity = Column(Integer, nullable=False) # Positive = Add, Negative = Remove
    reason = Column(String(200)) # e.g. "Damage", "Theft", "Found Stock"
    status = Column(String(50), default="DRAFT") # DRAFT, APPROVED
    
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    warehouse = relationship("Warehouse")
    product = relationship("Product")


class StockAudit(Base):
    """Periodic Stock Count Events"""
    __tablename__ = "stock_audits"

    id = Column(Integer, primary_key=True, index=True)
    audit_number = Column(String(50), unique=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    
    scheduled_date = Column(DateTime)
    performed_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="SCHEDULED") # SCHEDULED, IN_PROGRESS, COMPLETED
    
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    warehouse = relationship("Warehouse")
    items = relationship("StockAuditItem", back_populates="audit")


class StockAuditItem(Base):
    """Stock Audit Lines"""
    __tablename__ = "stock_audit_items"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("stock_audits.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    
    system_quantity_snapshot = Column(Integer) # Qty in system when audit started
    counted_quantity = Column(Integer, nullable=True)
    discrepancy = Column(Integer, nullable=True) # counted - system
    
    audit = relationship("StockAudit", back_populates="items")
    product = relationship("Product")


class CustomerReturn(Base):
    """Inbound Returns from Customers (RTO/DTO)"""
    __tablename__ = "customer_returns"

    id = Column(Integer, primary_key=True, index=True)
    return_number = Column(String(50), unique=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True) # Link to Unified Order
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), index=True)
    
    status = Column(String(50), default="REQUESTED") # REQUESTED, RECEIVED, QC_PASS, QC_FAIL, REFUNDED
    return_type = Column(String(50)) # RTO (Courier Return), DTO (Customer Return)
    carrier_tracking_ref = Column(String(100))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    order = relationship("Order")
    warehouse = relationship("Warehouse")
    items = relationship("CustomerReturnItem", back_populates="return_obj")


class CustomerReturnItem(Base):
    """Return Line Items"""
    __tablename__ = "customer_return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("customer_returns.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id")) # Link to Product ID if known, or parsed from OrderItem
    
    quantity = Column(Integer, default=1)
    condition = Column(String(50)) # GOOD, DAMAGED, OPEN_BOX
    action = Column(String(50)) # RESTOCK, SCRAP, LIQUIDATE
    reason = Column(String(200))
    
    return_obj = relationship("CustomerReturn", back_populates="items")
    product = relationship("Product")


# ============================================================
# CUSTOMER SUPPORTING MODELS (Address, Contact, Ledger)
# ============================================================



class CustomerAddress(Base):
    """Customer shipping/billing addresses"""
    __tablename__ = "customer_addresses"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True, nullable=False)
    
    # Address Type
    address_type = Column(String(20), default="BOTH")  # BILLING, SHIPPING, BOTH
    is_default = Column(Boolean, default=False)
    
    # Address Details
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255))
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="India", nullable=False)
    postal_code = Column(String(20), nullable=False)
    
    # Additional Info
    landmark = Column(String(200))
    contact_person = Column(String(100))
    phone = Column(String(20))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="addresses")


class CustomerContact(Base):
    """Contact persons for customers"""
    __tablename__ = "customer_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True, nullable=False)
    
    # Contact Information
    name = Column(String(200), nullable=False)
    email = Column(String(200))
    phone = Column(String(20))
    mobile = Column(String(20))
    
    # Role Information
    designation = Column(String(100))  # Manager, Director, Accountant, etc.
    department = Column(String(100))  # Sales, Accounts, Purchase, etc.
    role = Column(String(50))  # PRIMARY, ACCOUNTS, SALES, LOGISTICS
    is_primary = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="contacts")


class CustomerLedger(Base):
    """Customer ledger for double-entry accounting"""
    __tablename__ = "customer_ledger"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    
    # Transaction Details
    transaction_date = Column(DateTime, nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False, index=True)  
    # OPENING, INVOICE, PAYMENT, CREDIT_NOTE, DEBIT_NOTE, ADJUSTMENT
    
    # Reference Information
    reference_number = Column(String(100), index=True)  # Invoice #, Payment #, etc.
    reference_type = Column(String(50))  # sale_invoice, payment_received, etc.
    reference_id = Column(Integer)  # FK to the actual transaction table
    
    # Amounts (Double Entry)
    debit_amount = Column(Numeric(15, 2), default=0)  # Money customer owes us
    credit_amount = Column(Numeric(15, 2), default=0)  # Money we owe customer/customer paid
    balance = Column(Numeric(15, 2), default=0)  # Running balance after this entry
    
    # Description & Notes
    description = Column(String(500))
    notes = Column(Text)
    
    # Due Date (for invoices)
    due_date = Column(DateTime)
    
    # Reconciliation
    is_reconciled = Column(Boolean, default=False)
    reconciled_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    customer = relationship("Customer", back_populates="ledger_entries")
    company = relationship("Company")
    created_by = relationship("User")

# ============================================================
# DISPATCH SCANNING MODELS
# ============================================================

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
    scan_action = Column(String(20), default="dispatch")  # 'dispatch' or 'cancel'
    
    manifest_id = Column(Integer, nullable=True)  # Link to courier manifest if applicable
    
    # Metadata
    notes = Column(Text)
    scan_metadata = Column(JSON)  # Additional channel-specific data
    
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


class ChannelFieldDefinition(Base):
    """Store channel-specific field definitions"""
    __tablename__ = "channel_field_definitions"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    platform = Column(String(50), nullable=False)
    
    field_name = Column(String(100), nullable=False)
    field_key = Column(String(100), nullable=False)
    field_type = Column(String(50), nullable=False)
    is_required = Column(Boolean, default=False)
    default_value = Column(String(255))
    
    display_order = Column(Integer, default=0)
    validation_rules = Column(JSON)
    help_text = Column(String(500))
    
    created_from_upload = Column(Boolean, default=False)
    sample_value = Column(String(255))
    column_name = Column(String(100))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    company = relationship("Company")
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class ChannelDispatchMapping(Base):
    """Map channel fields to dispatch scan fields"""
    __tablename__ = "channel_dispatch_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    platform = Column(String(50), nullable=False)
    
    channel_field_key = Column(String(100), nullable=False)
    scan_field_key = Column(String(100), nullable=False)
    
    transform_type = Column(String(50), default='direct')
    is_bidirectional = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    company = relationship("Company")
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class OMSSyncConfig(Base):
    """Configuration for OMS platform sync per channel"""
    __tablename__ = "oms_sync_config"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)  # 'amazon', 'flipkart', etc.
    is_oms_connected = Column(Boolean, default=False)
    sync_enabled = Column(Boolean, default=False)
    last_sync_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class MangoChannelOrder(Base):
    """Orders imported via Excel uploads (Mango system)"""
    __tablename__ = "mango_channel_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)
    platform_order_id = Column(String(100), index=True)
    customer_name = Column(String(200))
    customer_email = Column(String(200))
    order_status = Column(String(50), default='pending', index=True)
    order_total = Column(Numeric(10, 2))
    channel_data = Column(JSON)  # All custom fields from Excel
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )
