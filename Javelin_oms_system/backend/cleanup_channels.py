import sys
import os
from sqlalchemy import text, inspect

# Add the parent directory of backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apps.common.db import SessionLocal, engine
from apps.mango.channel_master_models import Channel, ChannelFieldMapping, ChannelTableSchema, MasterOrderSheet

def cleanup_channels():
    db = SessionLocal()
    try:
        print("Starting Channel Cleanup...")
        
        # 1. Get all dynamic table names
        channels = db.query(Channel).all()
        dynamic_tables = [c.table_name for c in channels]
        
        # 2. Drop dynamic tables
        for table in dynamic_tables:
            print(f"Dropping table: {table}")
            try:
                db.execute(text(f"DROP TABLE IF EXISTS {table}"))
            except Exception as e:
                print(f"Error dropping {table}: {e}")
        
        # 3. Clear related tables
        print("Cleaning up metadata tables...")
        # Order matters due to FK constraints
        db.query(MasterOrderSheet).delete()
        db.query(ChannelFieldMapping).delete()
        db.query(ChannelTableSchema).delete()
        db.query(Channel).delete()
        
        # 4. Commit changes
        db.commit()
        print("Cleanup Complete. All channels and data deleted.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_channels()
