"""
Create Dispatch Scans Table
Run this script to create the dispatch_scans table in the database
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from apps.common.db import DB_URL, Base
from apps.common.models import DispatchScan, Order

def create_dispatch_tables():
    """Create dispatch_scans table using SQLAlchemy"""
    
    print("=" * 60)
    print("CREATING DISPATCH SCANS TABLE")
    print("=" * 60)
    
    # Use database URL
    database_url = DB_URL
    print(f"Database: {database_url.split('@')[1] if '@' in database_url else database_url}")
    
    # Create engine
    engine = create_engine(database_url)
    
    try:
        print("\nCreating dispatch_scans table...")
        
        # Create only the DispatchScan table (and dependencies)
        Base.metadata.create_all(bind=engine, tables=[DispatchScan.__table__])
        
        print("✅ dispatch_scans table created successfully!")
        
        # Also add dispatch columns to orders table if not exists
        print("\nAdding dispatch tracking fields to orders table...")
        with engine.connect() as conn:
            from sqlalchemy import text
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN is_dispatched BOOLEAN DEFAULT FALSE"))
                conn.commit()
                print("✓ Added is_dispatched column")
            except Exception as e:
                if "Duplicate column" in str(e):
                    print("  ℹ is_dispatched column already exists")
                else:
                    print(f"  ⚠ Error adding is_dispatched: {e}")
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN dispatched_at TIMESTAMP NULL"))
                conn.commit()
                print("✓ Added dispatched_at column")
            except Exception as e:
                if "Duplicate column" in str(e):
                    print("  ℹ dispatched_at column already exists")
                else:
                    print(f"  ⚠ Error adding dispatched_at: {e}")
        
        print("\n✅ All tables and columns created successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

if __name__ == "__main__":
    success = create_dispatch_tables()
    sys.exit(0 if success else 1)
