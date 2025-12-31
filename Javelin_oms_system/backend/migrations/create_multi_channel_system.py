"""
Multi-Channel Master System - Database Migration
Creates core tables for advanced multi-channel order management
"""

import pymysql
from datetime import datetime

# Database connection
def get_connection():
    return pymysql.connect(
        host='localhost',
        user='root',
        password='',
        database='javelin_oms',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def run_migration():
    conn = get_connection()
    cursor = conn.cursor()
    
    print("🚀 Starting Multi-Channel Master System Migration...")
    
    try:
        # 1. Create channels table
        print("Creating 'channels' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channels (
                id INT PRIMARY KEY AUTO_INCREMENT,
                company_id INT NOT NULL,
                channel_name VARCHAR(100) NOT NULL,
                channel_code VARCHAR(50) UNIQUE NOT NULL,
                channel_type VARCHAR(50) DEFAULT 'marketplace',
                table_name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by_user_id INT,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_company (company_id),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("✓ 'channels' table created")
        
        # 2. Create channel_field_mapping table
        print("Creating 'channel_field_mapping' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_field_mapping (
                id INT PRIMARY KEY AUTO_INCREMENT,
                channel_id INT NOT NULL,
                channel_field_name VARCHAR(100) NOT NULL,
                channel_field_type VARCHAR(50) NOT NULL,
                master_field_name VARCHAR(100) NOT NULL,
                transformation_rule JSON,
                is_required BOOLEAN DEFAULT FALSE,
                default_value VARCHAR(255),
                display_order INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                INDEX idx_channel (channel_id),
                INDEX idx_master_field (master_field_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("✓ 'channel_field_mapping' table created")
        
        # 3. Create master_order_sheet table
        print("Creating 'master_order_sheet' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS master_order_sheet (
                master_order_id INT PRIMARY KEY AUTO_INCREMENT,
                channel_id INT NOT NULL,
                channel_order_id VARCHAR(100) NOT NULL,
                
                -- Common standardized fields
                order_number VARCHAR(100),
                order_date DATETIME,
                customer_name VARCHAR(200),
                customer_email VARCHAR(200),
                customer_phone VARCHAR(50),
                
                shipping_address TEXT,
                shipping_city VARCHAR(100),
                shipping_state VARCHAR(100),
                shipping_pincode VARCHAR(20),
                shipping_country VARCHAR(100),
                
                order_amount DECIMAL(12,2),
                payment_method VARCHAR(50),
                payment_status VARCHAR(50),
                order_status VARCHAR(50),
                
                -- Products as JSON for flexibility
                items JSON,
                
                -- Metadata
                source_table_name VARCHAR(100),
                source_record_id INT,
                raw_data JSON,
                
                -- Tracking
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                synced_at DATETIME,
                
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                UNIQUE KEY unique_channel_order (channel_id, channel_order_id),
                INDEX idx_channel (channel_id),
                INDEX idx_order_date (order_date),
                INDEX idx_order_status (order_status),
                INDEX idx_customer (customer_email),
                INDEX idx_source (source_table_name, source_record_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("✓ 'master_order_sheet' table created")
        
        # 4. Create channel_table_schema table
        print("Creating 'channel_table_schema' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_table_schema (
                id INT PRIMARY KEY AUTO_INCREMENT,
                channel_id INT NOT NULL,
                column_name VARCHAR(100) NOT NULL,
                column_type VARCHAR(50) NOT NULL,
                column_length INT,
                is_nullable BOOLEAN DEFAULT TRUE,
                default_value VARCHAR(255),
                column_order INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                UNIQUE KEY unique_channel_column (channel_id, column_name),
                INDEX idx_channel (channel_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("✓ 'channel_table_schema' table created")
        
        # 5. Create dispatch_channel_mappings table
        print("Creating 'dispatch_channel_mappings' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dispatch_channel_mappings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                scan_id INT NOT NULL,
                channel_id INT NOT NULL,
                channel_order_id VARCHAR(100),
                master_order_id INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (scan_id) REFERENCES dispatch_scans(id) ON DELETE CASCADE,
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                FOREIGN KEY (master_order_id) REFERENCES master_order_sheet(master_order_id) ON DELETE SET NULL,
                INDEX idx_scan (scan_id),
                INDEX idx_channel (channel_id),
                INDEX idx_master (master_order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("✓ 'dispatch_channel_mappings' table created")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print(f"   Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
