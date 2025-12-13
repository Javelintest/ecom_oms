#!/usr/bin/env python3
"""Database setup script for Javelin OMS"""
import pymysql
import sys

def test_connection(host='localhost', port=3306, user='root', password='', database=None):
    """Test MySQL connection"""
    try:
        if database:
            conn = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database
            )
        else:
            conn = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=password
            )
        
        print(f"✅ Successfully connected to MySQL server!")
        print(f"   Host: {host}:{port}")
        print(f"   User: {user}")
        if database:
            print(f"   Database: {database}")
        
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"   MySQL Version: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except pymysql.Error as e:
        print(f"❌ Connection failed: {e}")
        return False

def create_database(host='localhost', port=3306, user='root', password='', db_name='javelin_oms'):
    """Create database if it doesn't exist"""
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SHOW DATABASES LIKE '{db_name}'")
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ Database '{db_name}' already exists")
        else:
            cursor.execute(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✅ Database '{db_name}' created successfully")
        
        cursor.close()
        conn.close()
        return True
        
    except pymysql.Error as e:
        print(f"❌ Failed to create database: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Javelin OMS - Database Setup")
    print("=" * 50)
    print()
    
    # Default XAMPP settings
    host = 'localhost'
    port = 3306
    user = 'root'
    password = ''  # Empty password for default XAMPP
    
    # Check if password provided as argument
    if len(sys.argv) > 1:
        password = sys.argv[1]
        print(f"Using provided password")
    else:
        print("Using default XAMPP settings (root user, no password)")
        print("If you have a password, run: python3 setup_database.py your_password")
    
    print()
    print("Step 1: Testing MySQL connection...")
    if not test_connection(host, port, user, password):
        print("\n❌ Cannot connect to MySQL server.")
        print("   Please ensure:")
        print("   1. XAMPP MySQL service is running")
        print("   2. MySQL is accessible on localhost:3306")
        print("   3. Username and password are correct")
        sys.exit(1)
    
    print()
    print("Step 2: Creating database 'javelin_oms'...")
    if not create_database(host, port, user, password):
        sys.exit(1)
    
    print()
    print("Step 3: Testing database connection...")
    if not test_connection(host, port, user, password, 'javelin_oms'):
        sys.exit(1)
    
    print()
    print("=" * 50)
    print("✅ Database setup complete!")
    print("=" * 50)
    print()
    print("Next steps:")
    print("1. Start the backend server: uvicorn backend.main:app --reload")
    print("2. Tables will be created automatically on first run")
    print("3. Check phpMyAdmin to verify tables are created")
    print()
    print("Connection string:")
    if password:
        print(f"   mysql+pymysql://{user}:{password}@{host}:{port}/javelin_oms")
    else:
        print(f"   mysql+pymysql://{user}@{host}:{port}/javelin_oms")

