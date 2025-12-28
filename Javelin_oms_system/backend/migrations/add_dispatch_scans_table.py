"""
Migration: Add dispatch_scans table and Order dispatch tracking fields
Run with: python backend/migrations/add_dispatch_scans_table.py
"""

from sqlalchemy import create_engine, text
from backend.apps.common.db import SQLALCHEMY_DATABASE_URL


def run_migration():
    """Create dispatch_scans table and add dispatch fields to orders table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        print("Creating dispatch_scans table...")
        
        # Create dispatch_scans table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dispatch_scans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                platform_id INT,
                platform_name VARCHAR(100),
                platform_order_id VARCHAR(255),
                barcode_data VARCHAR(500),
                qr_code_data TEXT,
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scanned_by_user_id INT,
                warehouse_id INT,
                awb_number VARCHAR(255),
                courier_partner VARCHAR(255),
                dispatch_status VARCHAR(50) DEFAULT 'pending',
                manifest_id VARCHAR(255),
                notes TEXT,
                scan_metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_order_id (order_id),
                INDEX idx_platform_order_id (platform_order_id),
                INDEX idx_scanned_at (scanned_at),
                INDEX idx_warehouse_id (warehouse_id),
                INDEX idx_dispatch_status (dispatch_status),
                
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                FOREIGN KEY (scanned_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        
        print("✓ dispatch_scans table created")
        
        print("Adding dispatch tracking fields to orders table...")
        
        # Add is_dispatched field to orders
        try:
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN is_dispatched BOOLEAN DEFAULT FALSE
            """))
            print("✓ Added is_dispatched column to orders table")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("  ℹ is_dispatched column already exists")
            else:
                raise e
        
        # Add dispatched_at field to orders
        try:
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN dispatched_at TIMESTAMP NULL
            """))
            print("✓ Added dispatched_at column to orders table")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("  ℹ dispatched_at column already exists")
            else:
                raise e
        
        conn.commit()
        print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("DISPATCH SCANS TABLE MIGRATION")
    print("=" * 60)
    run_migration()
