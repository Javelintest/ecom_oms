"""
Migration script to create platform_item_mappings table
"""

from backend.apps.common.db import DB_URL
from sqlalchemy import create_engine, text


def run_migration():
    engine = create_engine(DB_URL)
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS platform_item_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        product_id INT NOT NULL,
        platform_name VARCHAR(50) NOT NULL,
        platform_item_code VARCHAR(255) NOT NULL,
        platform_variant_code VARCHAR(255),
        platform_listing_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_platform_mapping (product_id, platform_name, platform_item_code),
        INDEX idx_company_id (company_id),
        INDEX idx_product_id (product_id),
        INDEX idx_platform_name (platform_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
   
    with engine.connect() as conn:
        conn.execute(text(create_table_sql))
        conn.commit()
        print("✅ Successfully created platform_item_mappings table")

if __name__ == "__main__":
    run_migration()
