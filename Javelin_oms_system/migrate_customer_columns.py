#!/usr/bin/env python3
"""Comprehensive migration to add all missing customer columns"""
import pymysql

# List of columns to add with their definitions
columns_to_add = [
    ("customer_code", "VARCHAR(50) UNIQUE NULL", "AFTER company_id"),
    ("display_name", "VARCHAR(200) NULL", "AFTER name"),
    ("customer_type", "VARCHAR(50) DEFAULT 'RETAIL'", "AFTER display_name"),
    ("mobile", "VARCHAR(20) NULL", "AFTER phone"),
    ("website", "VARCHAR(200) NULL", "AFTER mobile"),
    ("gst_number", "VARCHAR(15) NULL", "AFTER address"),
    ("pan_number", "VARCHAR(10) NULL", "AFTER gst_number"),
    ("tax_registration_number", "VARCHAR(50) NULL", "AFTER tax_id"),
    ("currency", "VARCHAR(10) DEFAULT 'INR'", "AFTER tax_registration_number"),
    ("payment_terms", "VARCHAR(50) DEFAULT 'NET_30'", "AFTER currency"),
    ("credit_limit", "DECIMAL(15,2) DEFAULT 0", "AFTER payment_terms"),
    ("opening_balance", "DECIMAL(15,2) DEFAULT 0", "AFTER credit_limit"),
    ("opening_balance_date", "DATETIME NULL", "AFTER opening_balance"),
    ("current_balance", "DECIMAL(15,2) DEFAULT 0", "AFTER opening_balance_date"),
    ("is_active", "BOOLEAN DEFAULT TRUE", "AFTER current_balance"),
    ("is_credit_hold", "BOOLEAN DEFAULT FALSE", "AFTER is_active"),
    ("is_blacklisted", "BOOLEAN DEFAULT FALSE", "AFTER is_credit_hold"),
    ("notes", "TEXT NULL", "AFTER is_blacklisted"),
    ("tags", "JSON NULL", "AFTER notes"),
    ("app_metadata", "JSON NULL", "AFTER tags"),
    ("custom_fields", "JSON NULL", "AFTER app_metadata"),
    ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", "AFTER created_at"),
    ("created_by_user_id", "INT NULL", "AFTER updated_at"),
]

try:
    # Connect to MySQL database
    conn = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='',  # Default XAMPP password
        database='javelin_oms'
    )
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'javelin_oms' 
        AND TABLE_NAME = 'customers'
    """)
    existing_columns = {row[0] for row in cursor.fetchall()}
    
    added_count = 0
    skipped_count = 0
    
    print("Processing customer table columns...")
    print("="*60)
    
    for column_name, column_def, position in columns_to_add:
        if column_name in existing_columns:
            print(f"⏭️  Skipped '{column_name}' - already exists")
            skipped_count += 1
        else:
            try:
                sql = f"ALTER TABLE customers ADD COLUMN {column_name} {column_def} {position}"
                cursor.execute(sql)
                conn.commit()
                print(f"✅ Added '{column_name}'")
                added_count += 1
            except Exception as e:
                print(f"❌ Error adding '{column_name}': {e}")
    
    # Add indexes
    print("\nAdding indexes...")
    try:
        cursor.execute("CREATE INDEX idx_customer_code ON customers(customer_code)")
        print("✅ Added index on customer_code")
    except:
        print("⏭️  Index on customer_code already exists")
    
    try:
        cursor.execute("CREATE INDEX idx_gst_number ON customers(gst_number)")
        print("✅ Added index on gst_number")
    except:
        print("⏭️  Index on gst_number already exists")
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*60)
    print(f"✅ Migration completed!")
    print(f"   Added: {added_count} columns")
    print(f"   Skipped: {skipped_count} columns")
    
except Exception as e:
    print(f"❌ Fatal error: {e}")
    import traceback
    traceback.print_exc()
