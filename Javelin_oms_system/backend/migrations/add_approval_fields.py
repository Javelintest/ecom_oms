"""
Database Migration: Add Approval Workflow Fields to Stock Transfers

Run this script to add the required approval fields to the stock_transfers table.
This will allow the approval workflow to function properly.

Instructions:
1. Make sure your FastAPI server is stopped
2. Run: python3 backend/migrations/add_approval_fields.py
3. Restart your FastAPI server
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from apps.common.db import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    """Add approval workflow fields to stock_transfers table"""
    
    db = SessionLocal()
    
    try:
        print("Starting migration: Adding approval workflow fields to stock_transfers...")
        
        # Check if columns already exist
        check_query = text("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'stock_transfers' 
            AND COLUMN_NAME = 'approval_status'
        """)
        
        result = db.execute(check_query).fetchone()
        
        if result[0] > 0:
            print("✓ Columns already exist. Migration not needed.")
            return
        
        print("Adding new columns...")
        
        # Add approval_status column
        db.execute(text("""
            ALTER TABLE stock_transfers 
            ADD COLUMN approval_status VARCHAR(50) DEFAULT 'draft' AFTER status
        """))
        print("✓ Added approval_status column")
        
        # Add approved_by_user_id column
        db.execute(text("""
            ALTER TABLE stock_transfers 
            ADD COLUMN approved_by_user_id INT NULL AFTER approval_status
        """))
        print("✓ Added approved_by_user_id column")
        
        # Add approved_at column  
        db.execute(text("""
            ALTER TABLE stock_transfers 
            ADD COLUMN approved_at DATETIME NULL AFTER approved_by_user_id
        """))
        print("✓ Added approved_at column")
        
        # Add rejection_reason column
        db.execute(text("""
            ALTER TABLE stock_transfers 
            ADD COLUMN rejection_reason TEXT NULL AFTER approved_at
        """))
        print("✓ Added rejection_reason column")
        
        # Add foreign key constraint for approved_by_user_id
        db.execute(text("""
            ALTER TABLE stock_transfers 
            ADD CONSTRAINT fk_stock_transfers_approved_by
            FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
        """))
        print("✓ Added foreign key constraint")
        
        # Add index on approval_status for faster queries
        db.execute(text("""
            CREATE INDEX idx_stock_transfers_approval_status 
            ON stock_transfers(approval_status)
        """))
        print("✓ Added index on approval_status")
        
        # Update existing records to have proper approval_status
        db.execute(text("""
            UPDATE stock_transfers 
            SET approval_status = CASE 
                WHEN status = 'DRAFT' THEN 'draft'
                WHEN status IN ('IN_TRANSIT', 'COMPLETED') THEN 'approved'
                WHEN status = 'CANCELLED' THEN 'rejected'
                ELSE 'draft'
            END
        """))
        print("✓ Updated existing records")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        print("\nYou can now restart your FastAPI server.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        print("\nPlease check the error and try again.")
        raise
    
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
