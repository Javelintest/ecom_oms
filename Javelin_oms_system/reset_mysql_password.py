#!/usr/bin/env python3
"""Password reset for MySQL database"""
import pymysql
import bcrypt

# Hash the new password
new_password = "admin123"
hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

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
    
    # Update the password
    cursor.execute(
        "UPDATE users SET hashed_password = %s WHERE email = %s",
        (hashed, "admin@javelin.com")
    )
    
    rows_updated = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ Password reset successful!")
    print(f"   Email: admin@javelin.com")
    print(f"   New Password: {new_password}")
    print(f"   Rows updated: {rows_updated}")
    
except pymysql.Error as e:
    print(f"❌ Error: {e}")
    print("\nPlease make sure:")
    print("1. MySQL/XAMPP is running")
    print("2. The database 'javelin_oms' exists")
    print("3. The 'users' table exists")
