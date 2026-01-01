"""
Migration: Add is_system column to channel_tables
This marks default system tables as non-deletable
"""

from sqlalchemy import text
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from apps.common.db import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        # Add is_system column
        db.execute(text("""
            ALTER TABLE channel_tables 
            ADD COLUMN is_system BOOLEAN DEFAULT 0
        """))
        
        # Mark all existing tables as system tables (default = True)
        db.execute(text("""
            UPDATE channel_tables 
            SET is_system = 1
        """))
        
        db.commit()
        print("✅ Migration completed: is_system column added to channel_tables")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
