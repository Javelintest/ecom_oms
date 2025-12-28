#!/usr/bin/env python3
"""Add missing customer_code column to customers table"""
import pymysql

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
    
    # Check if column exists
    cursor.execute("""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'javelin_oms' 
        AND TABLE_NAME = 'customers' 
        AND COLUMN_NAME = 'customer_code'
    """)
    
    if cursor.fetchone():
        print("✅ Column 'customer_code' already exists")
    else:
        # Add the customer_code column
        cursor.execute("""
            ALTER TABLE customers 
            ADD COLUMN customer_code VARCHAR(50) UNIQUE NULL AFTER company_id,
            ADD INDEX idx_customer_code (customer_code)
        """)
        conn.commit()
        print("✅ Added 'customer_code' column to customers table")
    
    cursor.close()
    conn.close()
    print("\n✅ Migration completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
