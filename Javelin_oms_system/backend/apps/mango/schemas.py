from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# --- Vendor Schemas ---
class VendorBase(BaseModel):
    name: str
    code: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: int
    is_active: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Warehouse Schemas ---
class WarehouseBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseResponse(WarehouseBase):
    id: int
    is_active: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    
    # Financials
    purchase_description: Optional[str] = None
    purchase_rate: Optional[float] = 0.0
    sales_rate: Optional[float] = 0.0
    sales_rate: Optional[float] = 0.0
    hsn_sac: Optional[str] = None
    
    # Tax Info
    intra_state_tax_rate: Optional[str] = None
    inter_state_tax_rate: Optional[str] = None
    
    weight_kg: Optional[float] = 0.0
    length_cm: Optional[float] = 0.0
    width_cm: Optional[float] = 0.0
    height_cm: Optional[float] = 0.0

    # Advanced Item Master Fields
    item_code: Optional[str] = None
    item_short_name: Optional[str] = None
    item_type: Optional[str] = None
    item_status: Optional[str] = 'Active'
    parent_item_id: Optional[int] = None
    item_level: Optional[int] = 0

    subcategory_id: Optional[int] = None
    product_group: Optional[str] = None
    brand_id: Optional[int] = None
    model_no: Optional[str] = None
    variant_group: Optional[str] = None

    base_uom: Optional[str] = None
    alternate_uom: Optional[str] = None
    uom_conversion_factor: Optional[float] = 1.0
    inventory_tracking_flag: Optional[bool] = True
    batch_tracking_flag: Optional[bool] = False
    serial_tracking_flag: Optional[bool] = False
    expiry_tracking_flag: Optional[bool] = False

    hsn_code: Optional[str] = None
    gst_applicable_flag: Optional[bool] = True
    tax_category: Optional[str] = None
    cess_applicable_flag: Optional[bool] = False
    country_of_origin: Optional[str] = None

    weight_uom: Optional[str] = None
    dimension_uom: Optional[str] = None
    volume: Optional[float] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None

    quality_grade: Optional[str] = None
    shelf_life_days: Optional[int] = None
    storage_type: Optional[str] = None
    temperature_range: Optional[str] = None

    costing_method: Optional[str] = 'Weighted Average'
    standard_cost: Optional[float] = None
    default_margin_percent: Optional[float] = None
    price_control_type: Optional[str] = None

    hazardous_flag: Optional[bool] = False
    stackable_flag: Optional[bool] = True
    min_order_qty: Optional[float] = None
    max_order_qty: Optional[float] = None
    reorder_level: Optional[float] = None

    abc_classification: Optional[str] = None
    demand_velocity: Optional[str] = None
    forecast_enabled_flag: Optional[bool] = True
    lifecycle_stage: Optional[str] = None
    ai_tags: Optional[str] = None
    search_keywords: Optional[str] = None
    custom_attributes_json: Optional[str] = None

    approved_status: Optional[str] = 'Draft'
    approved_by: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    """Schema for updating an existing product - all fields optional"""
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    
    # Financials
    purchase_description: Optional[str] = None
    purchase_rate: Optional[float] = None
    sales_rate: Optional[float] = None
    hsn_sac: Optional[str] = None
    
    # Tax Info
    intra_state_tax_rate: Optional[str] = None
    inter_state_tax_rate: Optional[str] = None
    
    weight_kg: Optional[float] = None
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None

    # Advanced Item Master Fields
    item_code: Optional[str] = None
    item_short_name: Optional[str] = None
    item_type: Optional[str] = None
    item_status: Optional[str] = None
    parent_item_id: Optional[int] = None
    item_level: Optional[int] = None

    subcategory_id: Optional[int] = None
    product_group: Optional[str] = None
    brand_id: Optional[int] = None
    model_no: Optional[str] = None
    variant_group: Optional[str] = None

    base_uom: Optional[str] = None
    alternate_uom: Optional[str] = None
    uom_conversion_factor: Optional[float] = None
    inventory_tracking_flag: Optional[bool] = None
    batch_tracking_flag: Optional[bool] = None
    serial_tracking_flag: Optional[bool] = None
    expiry_tracking_flag: Optional[bool] = None

    hsn_code: Optional[str] = None
    gst_applicable_flag: Optional[bool] = None
    tax_category: Optional[str] = None
    cess_applicable_flag: Optional[bool] = None
    country_of_origin: Optional[str] = None

    weight_uom: Optional[str] = None
    dimension_uom: Optional[str] = None
    volume: Optional[float] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None

    quality_grade: Optional[str] = None
    shelf_life_days: Optional[int] = None
    storage_type: Optional[str] = None
    temperature_range: Optional[str] = None

    costing_method: Optional[str] = None
    standard_cost: Optional[float] = None
    default_margin_percent: Optional[float] = None
    price_control_type: Optional[str] = None

    hazardous_flag: Optional[bool] = None
    stackable_flag: Optional[bool] = None
    min_order_qty: Optional[float] = None
    max_order_qty: Optional[float] = None
    reorder_level: Optional[float] = None

    abc_classification: Optional[str] = None
    demand_velocity: Optional[str] = None
    forecast_enabled_flag: Optional[bool] = None
    lifecycle_stage: Optional[str] = None
    ai_tags: Optional[str] = None
    search_keywords: Optional[str] = None
    custom_attributes_json: Optional[str] = None

    approved_status: Optional[str] = None
    approved_by: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- PO Schemas ---
class POItemCreate(BaseModel):
    product_id: int
    quantity_ordered: int
    unit_price: float
    tax_rate: Optional[float] = 0.0

class POCreate(BaseModel):
    vendor_id: int
    warehouse_id: int
    po_number: str
    order_date: datetime
    expected_delivery_date: datetime
    notes: Optional[str] = None
    items: List[POItemCreate]

class POItemResponse(POItemCreate):
    id: int
    sku: Optional[str] # Fetched from Product linkage usually
    quantity_received: int
    total_price: float
    
    class Config:
        orm_mode = True

class POResponse(BaseModel):
    id: int
    po_number: str
    vendor_id: int
    warehouse_id: int
    status: str
    total_amount: float
    created_at: datetime
    items: List[POItemResponse] = []
    
    class Config:
        orm_mode = True

# --- GRN Schemas ---
class GRNItemCreate(BaseModel):
    po_item_id: int
    product_id: int
    quantity_received: int
    quantity_accepted: int
    quantity_rejected: int
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None

class GRNCreate(BaseModel):
    po_id: int
    grn_number: str
    vendor_invoice_no: Optional[str] = None
    items: List[GRNItemCreate]

class GRNItemResponse(GRNItemCreate):
    id: int
    class Config:
        orm_mode = True

class GRNResponse(BaseModel):
    id: int
    grn_number: str
    status: str
    received_date: datetime
    items: List[GRNItemResponse]
    
    class Config:
        orm_mode = True

# --- Stock Transfer Schemas ---
class StockTransferItemCreate(BaseModel):
    product_id: int
    quantity_sent: int

class StockTransferCreate(BaseModel):
    transfer_number: str
    source_warehouse_id: int
    destination_warehouse_id: int
    notes: Optional[str] = None
    is_draft: Optional[bool] = True
    items: Optional[List[StockTransferItemCreate]] = []

class StockTransferItemResponse(StockTransferItemCreate):
    id: int
    quantity_received: int
    
    class Config:
        orm_mode = True

class StockTransferUpdate(BaseModel):
    """Schema for updating draft transfers"""
    source_warehouse_id: Optional[int] = None
    destination_warehouse_id: Optional[int] = None
    notes: Optional[str] = None
    items: Optional[List[StockTransferItemCreate]] = None

class TransferApprovalRequest(BaseModel):
    """Schema for approval/rejection actions"""
    rejection_reason: Optional[str] = None

class StockTransferResponse(BaseModel):
    id: int
    transfer_number: str
    source_warehouse_id: int
    destination_warehouse_id: int
    status: str
    approval_status: Optional[str] = None
    transfer_date: datetime
    completed_date: Optional[datetime]
    notes: Optional[str] = None
    
    # Approval fields
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Additional display fields
    created_by_user_id: Optional[int] = None
    source_warehouse_name: Optional[str] = None
    destination_warehouse_name: Optional[str] = None
    created_by_user_name: Optional[str] = None
    approved_by_user_name: Optional[str] = None
    
    items: List[StockTransferItemResponse]
    
    class Config:
        orm_mode = True

# --- Stock Adjustment Schemas ---
class StockAdjustmentCreate(BaseModel):
    adjustment_number: str
    warehouse_id: int
    product_id: int
    quantity: int # Positive or Negative
    reason: str

class StockAdjustmentResponse(StockAdjustmentCreate):
    id: int
    status: str
    created_at: datetime
    
    class Config:
        orm_mode = True

# --- Stock Audit Schemas ---
class StockAuditItemResponse(BaseModel):
    id: int
    product_id: int
    system_quantity_snapshot: int
    counted_quantity: Optional[int]
    discrepancy: Optional[int]
    
    class Config:
        orm_mode = True

class StockAuditCreate(BaseModel):
    audit_number: str
    warehouse_id: int
    scheduled_date: datetime
    notes: Optional[str] = None

class StockAuditResponse(BaseModel):
    id: int
    audit_number: str
    status: str
    scheduled_date: datetime
    performed_date: Optional[datetime]
    items: List[StockAuditItemResponse] = []
    
    class Config:
        orm_mode = True

# --- Return Schemas ---
class CustomerReturnItemCreate(BaseModel):
    product_id: int
    quantity: int
    condition: str
    reason: Optional[str] = None

class CustomerReturnCreate(BaseModel):
    return_number: str
    order_id: int
    warehouse_id: int
    return_type: str # RTO or DTO
    carrier_tracking_ref: Optional[str] = None
    items: List[CustomerReturnItemCreate]

class CustomerReturnItemResponse(CustomerReturnItemCreate):
    id: int
    action: Optional[str]
    
    class Config:
        orm_mode = True

class CustomerReturnResponse(BaseModel):
    id: int
    return_number: str
    status: str
    return_type: str
    items: List[CustomerReturnItemResponse]
    created_at: datetime
    
    class Config:
        orm_mode = True


# --- Platform Item Mapping Schemas ---
class PlatformMappingBase(BaseModel):
    platform_name: str = Field(..., description="Platform name (Amazon, Flipkart, Meesho, etc.)")
    platform_item_code: str = Field(..., description="Platform-specific SKU/ASIN/Product Code")
    platform_variant_code: Optional[str] = Field(None, description="Platform variant code (optional)")
    platform_listing_url: Optional[str] = Field(None, description="Direct link to platform listing")
    is_active: bool = Field(True, description="Whether mapping is active")
    notes: Optional[str] = Field(None, description="Additional notes")

class PlatformMappingCreate(PlatformMappingBase):
    product_id: int = Field(..., description="Internal product ID")

class PlatformMappingUpdate(BaseModel):
    platform_item_code: Optional[str] = None
    platform_variant_code: Optional[str] = None
    platform_listing_url: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class PlatformMappingResponse(PlatformMappingBase):
    id: int
    product_id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class PlatformMappingWithProduct(PlatformMappingResponse):
    product_sku: Optional[str] = None
    product_name: Optional[str] = None


# ============================================================
# CUSTOMER MANAGEMENT SCHEMAS
# ============================================================

# --- Customer Address Schemas ---
class CustomerAddressBase(BaseModel):
    address_type: str = Field("BOTH", description="BILLING, SHIPPING, or BOTH")
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    country: str = "India"
    postal_code: str
    landmark: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    is_default: bool = False

class CustomerAddressCreate(CustomerAddressBase):
    pass

class CustomerAddressResponse(CustomerAddressBase):
    id: int
    customer_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True


# --- Customer Contact Schemas ---
class CustomerContactBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool = False

class CustomerContactCreate(CustomerContactBase):
    pass

class CustomerContactResponse(CustomerContactBase):
    id: int
    customer_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True


# --- Customer Ledger Schemas ---
class CustomerLedgerBase(BaseModel):
    transaction_date: datetime
    transaction_type: str = Field(..., description="OPENING, INVOICE, PAYMENT, CREDIT_NOTE, DEBIT_NOTE, ADJUSTMENT")
    reference_number: Optional[str] = None
    reference_type: Optional[str] = None
    debit_amount: float = 0
    credit_amount: float = 0
    description: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None

class CustomerLedgerCreate(CustomerLedgerBase):
    customer_id: int

class CustomerLedgerResponse(CustomerLedgerBase):
    id: int
    customer_id: int
    balance: float
    is_reconciled: bool
    created_at: datetime
    
    class Config:
        orm_mode = True


# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    display_name: Optional[str] = None
    customer_type: str = Field("RETAIL", description="RETAIL, WHOLESALE, DISTRIBUTOR")
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=15)
    pan_number: Optional[str] = Field(None, max_length=10)
    tax_registration_number: Optional[str] = None
    currency: str = "INR"
    payment_terms: str = "NET_30"
    credit_limit: float = 0
    opening_balance: float = 0
    opening_balance_date: Optional[datetime] = None
    is_active: bool = True
    is_credit_hold: bool = False
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CustomerCreate(CustomerBase):
    addresses: Optional[List[CustomerAddressCreate]] = []
    contacts: Optional[List[CustomerContactCreate]] = []

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    customer_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    is_active: Optional[bool] = None
    is_credit_hold: Optional[bool] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CustomerResponse(CustomerBase):
    id: int
    customer_code: str
    current_balance: float
    is_blacklisted: bool
    created_at: datetime
    updated_at: datetime
    addresses: List[CustomerAddressResponse] = []
    contacts: List[CustomerContactResponse] = []
    
    class Config:
        orm_mode = True

class CustomerListResponse(BaseModel):
    id: int
    customer_code: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    customer_type: str
    current_balance: float
    credit_limit: float
    is_active: bool
    is_credit_hold: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class CustomerBalanceResponse(BaseModel):
    customer_id: int
    customer_name: str
    current_balance: float
    credit_limit: float
    available_credit: float
    aging_current: float = 0  # 0-30 days
    aging_30: float = 0       # 31-60 days
    aging_60: float = 0       # 61-90 days
    aging_90_plus: float = 0  # 90+ days
    
class CustomerStatementResponse(BaseModel):
    customer: CustomerListResponse
    opening_balance: float
    transactions: List[CustomerLedgerResponse]
    closing_balance: float
    total_debit: float
    total_credit: float
