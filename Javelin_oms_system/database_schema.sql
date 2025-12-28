-- ============================================================================
-- Amazon Orders API - Complete Database Schema
-- ============================================================================
-- This schema stores ALL data from Amazon SP-API Orders endpoints
-- Compatible with MySQL 5.7+ and SQLite
-- ============================================================================

-- ============================================================================
-- TABLE: platforms
-- Stores e-commerce platform configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    is_active TINYINT DEFAULT 1,
    api_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_platform_name (name),
    INDEX idx_platform_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: orders
-- Main orders table with comprehensive Amazon order data
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    platform_id INTEGER NOT NULL,
    platform_order_id VARCHAR(100) NOT NULL,
    seller_id INTEGER DEFAULT 1,
    
    -- Order Status & Type
    order_status VARCHAR(50),
    order_type VARCHAR(50),
    
    -- Dates
    purchase_date DATETIME,
    last_update_date DATETIME,
    earliest_ship_date DATETIME,
    latest_ship_date DATETIME,
    earliest_delivery_date DATETIME,
    latest_delivery_date DATETIME,
    
    -- Financial Information
    order_total DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    
    -- Fulfillment
    fulfillment_channel VARCHAR(50),
    sales_channel VARCHAR(100),
    shipment_service_level_category VARCHAR(50),
    
    -- Item Counts
    number_of_items_shipped INTEGER DEFAULT 0,
    number_of_items_unshipped INTEGER DEFAULT 0,
    
    -- Customer Information
    customer_name VARCHAR(200),
    customer_email VARCHAR(200),
    shipping_address TEXT,
    
    -- Marketplace
    marketplace_id VARCHAR(50),
    
    -- Order Flags (Boolean fields)
    is_business_order BOOLEAN DEFAULT FALSE,
    is_prime BOOLEAN DEFAULT FALSE,
    is_premium_order BOOLEAN DEFAULT FALSE,
    is_global_express_enabled BOOLEAN DEFAULT FALSE,
    is_replacement_order BOOLEAN DEFAULT FALSE,
    is_sold_by_ab BOOLEAN DEFAULT FALSE,
    is_iba BOOLEAN DEFAULT FALSE,
    is_ispu BOOLEAN DEFAULT FALSE,
    is_access_point_order BOOLEAN DEFAULT FALSE,
    has_regulated_items BOOLEAN DEFAULT FALSE,
    
    -- Complete API Response (stores ALL fields from Amazon)
    platform_metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    
    -- Indexes for Performance
    INDEX idx_platform_order (platform_id, platform_order_id),
    INDEX idx_order_status (order_status),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_marketplace (marketplace_id),
    INDEX idx_fulfillment (fulfillment_channel),
    INDEX idx_prime (is_prime),
    INDEX idx_business (is_business_order),
    
    -- Unique Constraint
    UNIQUE KEY unique_platform_order (platform_id, platform_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: order_items
-- Order line items with complete Amazon item data
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL,
    platform_order_id VARCHAR(100),
    
    -- Product Information
    product_id VARCHAR(100),
    sku VARCHAR(100),
    product_name VARCHAR(500),
    asin VARCHAR(20),
    
    -- Quantity & Pricing
    quantity INTEGER,
    quantity_shipped INTEGER DEFAULT 0,
    quantity_ordered INTEGER,
    item_price DECIMAL(12, 2),
    item_tax DECIMAL(12, 2),
    shipping_price DECIMAL(12, 2),
    shipping_tax DECIMAL(12, 2),
    gift_wrap_price DECIMAL(12, 2),
    gift_wrap_tax DECIMAL(12, 2),
    item_promotion_discount DECIMAL(12, 2),
    ship_promotion_discount DECIMAL(12, 2),
    
    -- Gift Information
    is_gift BOOLEAN DEFAULT FALSE,
    gift_message_text TEXT,
    gift_wrap_level VARCHAR(50),
    
    -- Condition
    condition_id VARCHAR(50),
    condition_subtype_id VARCHAR(50),
    condition_note TEXT,
    
    -- Buyer Customization
    buyer_customized_url VARCHAR(500),
    
    -- Complete API Response
    platform_metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_order_items (order_id),
    INDEX idx_platform_order_items (platform_order_id),
    INDEX idx_sku (sku),
    INDEX idx_product_id (product_id),
    INDEX idx_asin (asin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: order_buyer_info
-- Buyer PII data (separate table for security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_buyer_info (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    platform_order_id VARCHAR(100),
    
    -- Buyer Information
    buyer_email VARCHAR(255),
    buyer_name VARCHAR(200),
    buyer_county VARCHAR(100),
    purchase_order_number VARCHAR(100),
    
    -- Tax Information
    buyer_tax_company_legal_name VARCHAR(255),
    buyer_tax_taxing_region VARCHAR(100),
    buyer_tax_classifications JSON,
    
    -- Complete API Response
    platform_metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_buyer_platform_order (platform_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: order_addresses
-- Shipping addresses (separate table for normalization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_addresses (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    platform_order_id VARCHAR(100),
    
    -- Address Fields
    name VARCHAR(200),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    address_line3 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    district VARCHAR(100),
    state_or_region VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(10),
    phone VARCHAR(50),
    address_type VARCHAR(50),
    
    -- Complete API Response
    platform_metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_address_platform_order (platform_order_id),
    INDEX idx_postal_code (postal_code),
    INDEX idx_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: order_shipments
-- Shipment tracking information
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_shipments (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL,
    platform_order_id VARCHAR(100),
    
    -- Shipment Details
    package_reference_id VARCHAR(100),
    carrier_code VARCHAR(50),
    carrier_name VARCHAR(100),
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),
    ship_date DATETIME,
    
    -- Shipment Status
    shipment_status VARCHAR(50),
    
    -- Complete API Response
    platform_metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_shipment_order (order_id),
    INDEX idx_tracking_number (tracking_number),
    INDEX idx_carrier (carrier_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: order_regulated_info
-- Regulated product information (alcohol, supplements, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_regulated_info (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    platform_order_id VARCHAR(100),
    
    -- Regulated Information
    requires_dosage_label BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50),
    requires_merchant_action BOOLEAN DEFAULT FALSE,
    rejection_reason VARCHAR(255),
    review_date DATETIME,
    external_reviewer_id VARCHAR(100),
    
    -- Regulated Fields (JSON array)
    regulated_fields JSON,
    
    -- Complete API Response
    platform_metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_regulated_platform_order (platform_order_id),
    INDEX idx_verification_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: inventory
-- Product inventory across platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    platform_id INTEGER NOT NULL,
    sku VARCHAR(100),
    product_id VARCHAR(100),
    product_name VARCHAR(500),
    
    -- Quantity Information
    total_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    inbound_quantity INTEGER DEFAULT 0,
    
    -- Complete API Response
    platform_metadata JSON,
    
    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_inventory_platform (platform_id),
    INDEX idx_inventory_sku (sku),
    INDEX idx_inventory_product (product_id),
    
    -- Unique Constraint
    UNIQUE KEY unique_platform_sku (platform_id, sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: sync_logs
-- Track API sync operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    platform_id INTEGER,
    job_type VARCHAR(50),
    status VARCHAR(20),
    message VARCHAR(500),
    records_processed INTEGER DEFAULT 0,
    error_details TEXT,
    next_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_sync_platform (platform_id),
    INDEX idx_sync_type (job_type),
    INDEX idx_sync_status (status),
    INDEX idx_sync_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VIEWS: Useful queries for reporting
-- ============================================================================

-- View: Complete order details with all related data
CREATE OR REPLACE VIEW vw_order_details AS
SELECT 
    o.*,
    p.name as platform_name,
    p.display_name as platform_display_name,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity,
    oa.address_line1,
    oa.city,
    oa.state_or_region,
    oa.postal_code,
    oa.country_code
FROM orders o
LEFT JOIN platforms p ON o.platform_id = p.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_addresses oa ON o.id = oa.order_id
GROUP BY o.id;

-- View: Orders with shipment tracking
CREATE OR REPLACE VIEW vw_orders_with_tracking AS
SELECT 
    o.id,
    o.platform_order_id,
    o.order_status,
    o.purchase_date,
    os.tracking_number,
    os.carrier_name,
    os.shipment_status,
    os.ship_date
FROM orders o
LEFT JOIN order_shipments os ON o.id = os.order_id;

-- ============================================================================
-- INDEXES: Additional performance indexes
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_orders_platform_status_date ON orders(platform_id, order_status, purchase_date);
CREATE INDEX idx_orders_date_range ON orders(purchase_date, last_update_date);
CREATE INDEX idx_items_order_sku ON order_items(order_id, sku);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

DELIMITER $$

CREATE TRIGGER before_order_update
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

CREATE TRIGGER before_platform_update
BEFORE UPDATE ON platforms
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

DELIMITER ;

-- ============================================================================
-- SAMPLE DATA: Insert default platforms
-- ============================================================================

INSERT INTO platforms (name, display_name, is_active, api_config) VALUES
('amazon', 'Amazon', 1, '{}'),
('flipkart', 'Flipkart', 1, '{}'),
('meesho', 'Meesho', 1, '{}'),
('myntra', 'Myntra', 1, '{}')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
