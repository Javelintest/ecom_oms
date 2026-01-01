"""
Migration: Add Channel Tables for Multi-Table Per Channel Support
Creates channel_tables table and updates channel_table_schema with channel_table_id
"""

from sqlalchemy import text
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from apps.common.db import SessionLocal


def run_migration():
    """Create channel_tables table and add channel_table_id column"""
    db = SessionLocal()
    
    try:
        # Create channel_tables table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS channel_tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                table_name VARCHAR(100) NOT NULL UNIQUE,
                table_type VARCHAR(50) DEFAULT 'orders',
                display_name VARCHAR(100),
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                record_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id)
            )
        """))
        
        # Create indexes
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_channel_tables_channel 
            ON channel_tables(channel_id)
        """))
        
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_channel_tables_type 
            ON channel_tables(table_type)
        """))
        
        # Add channel_table_id column to channel_table_schema if not exists
        try:
            db.execute(text("""
                ALTER TABLE channel_table_schema 
                ADD COLUMN channel_table_id INTEGER REFERENCES channel_tables(id)
            """))
        except Exception as e:
            # Column might already exist
            if "duplicate column" not in str(e).lower():
                print(f"Note: channel_table_id column already exists or error: {e}")
        
        # Create index on the new column
        try:
            db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_channel_table_schema_table 
                ON channel_table_schema(channel_table_id)
            """))
        except Exception:
            pass
        
        db.commit()
        print("✅ Migration completed: channel_tables table created successfully")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
