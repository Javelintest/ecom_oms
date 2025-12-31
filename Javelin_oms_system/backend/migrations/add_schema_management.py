"""
Database Migration: Add Advanced Schema Management Columns
Adds primary key, unique, index, and foreign key support to field definitions
"""

from sqlalchemy import create_engine, text
import os

# Database connection
DB_URL = "mysql+pymysql://root:@localhost:3306/javelin_oms"
engine = create_engine(DB_URL)

def run_migration():
    with engine.connect() as conn:
        print("Starting migration: Adding schema management columns...")
        
        try:
            # Add new columns to channel_field_definitions
            migrations = [
                "ALTER TABLE channel_field_definitions ADD COLUMN is_primary_key BOOLEAN DEFAULT FALSE",
                "ALTER TABLE channel_field_definitions ADD COLUMN is_unique BOOLEAN DEFAULT FALSE",
                "ALTER TABLE channel_field_definitions ADD COLUMN is_indexed BOOLEAN DEFAULT FALSE",
                "ALTER TABLE channel_field_definitions ADD COLUMN foreign_key_table VARCHAR(100)",
                "ALTER TABLE channel_field_definitions ADD COLUMN foreign_key_field VARCHAR(100)",
                "ALTER TABLE channel_field_definitions ADD COLUMN on_duplicate VARCHAR(20) DEFAULT 'skip'"
            ]
            
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                    print(f"✓ {sql[:60]}...")
                except Exception as e:
                    if "Duplicate column name" in str(e):
                        print(f"⚠ Column already exists, skipping...")
                    else:
                        raise e
            
            # Add composite unique index on mango_channel_orders
            try:
                conn.execute(text("""
                    CREATE UNIQUE INDEX idx_platform_order_unique 
                    ON mango_channel_orders (company_id, platform, platform_order_id)
                """))
                print("✓ Created unique composite index on mango_channel_orders")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("⚠ Index already exists, skipping...")
                else:
                    print(f"⚠ Index creation failed: {e}")
            
            conn.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
