"""
Script to remove custom columns from physical database tables
SQLite doesn't support DROP COLUMN, so we recreate tables with only system columns
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.apps.common.db import SessionLocal, engine
from backend.apps.mango.channel_master_models import Channel, ChannelTable
from sqlalchemy import text, inspect

# System columns that should be preserved
SYSTEM_COLUMNS = {
    'id', 'channel_record_id', 'company_id', 'uploaded_by_user_id', 
    'uploaded_at', 'raw_data', 'is_synced_to_master', 'master_order_id',
    'synced_at', 'created_at', 'updated_at'
}

def cleanup_physical_columns():
    """Remove custom columns from physical tables by recreating them"""
    db = SessionLocal()
    inspector = inspect(engine)
    
    try:
        # Get all channel tables
        tables = db.query(ChannelTable).all()
        
        print("=" * 80)
        print("CLEANUP PHYSICAL COLUMNS FROM CHANNEL TABLES")
        print("=" * 80)
        print("\nThis will recreate tables with only system columns.")
        print("⚠️  WARNING: This will remove all custom columns from physical tables!")
        print("=" * 80)
        
        import sys
        auto_confirm = '--yes' in sys.argv or '-y' in sys.argv
        
        if not auto_confirm:
            try:
                response = input("\n⚠️  Continue? (yes/no): ")
                if response.lower() != 'yes':
                    print("❌ Cleanup cancelled.")
                    return
            except EOFError:
                print("\n⚠️  No input available. Use --yes flag to auto-confirm.")
                print("❌ Cleanup cancelled for safety.")
                return
        
        cleaned_tables = []
        
        for table in tables:
            channel = db.query(Channel).filter(Channel.id == table.channel_id).first()
            channel_name = channel.channel_name if channel else 'Unknown'
            
            try:
                # Get current columns
                columns = inspector.get_columns(table.table_name)
                column_names = [col['name'] for col in columns]
                
                # Find custom columns (not system columns)
                custom_columns = [
                    col for col in column_names 
                    if col.lower() not in SYSTEM_COLUMNS
                ]
                
                if not custom_columns:
                    print(f"\n✅ {table.table_name}: Already clean (no custom columns)")
                    continue
                
                print(f"\n📊 Cleaning {table.table_name} (Channel: {channel_name})")
                print(f"   Removing {len(custom_columns)} custom columns...")
                
                # Get system columns with their types
                system_cols = []
                for col in columns:
                    if col['name'].lower() in SYSTEM_COLUMNS:
                        col_type = str(col['type'])
                        # Convert SQLAlchemy types to SQLite types
                        if 'INTEGER' in col_type.upper() or 'INT' in col_type.upper():
                            sql_type = 'INTEGER'
                        elif 'VARCHAR' in col_type.upper() or 'STRING' in col_type.upper():
                            sql_type = 'VARCHAR(100)'
                        elif 'TEXT' in col_type.upper():
                            sql_type = 'TEXT'
                        elif 'DATETIME' in col_type.upper() or 'TIMESTAMP' in col_type.upper():
                            sql_type = 'DATETIME'
                        elif 'BOOLEAN' in col_type.upper():
                            sql_type = 'BOOLEAN'
                        else:
                            sql_type = 'TEXT'
                        
                        nullable = 'NULL' if col['nullable'] else 'NOT NULL'
                        default = ''
                        
                        if col['name'].lower() == 'id':
                            sql_type = 'INTEGER PRIMARY KEY AUTOINCREMENT'
                        elif col['name'].lower() in ['created_at', 'updated_at']:
                            default = 'DEFAULT CURRENT_TIMESTAMP'
                        elif col['name'].lower() == 'is_synced_to_master':
                            default = 'DEFAULT 0'
                        
                        system_cols.append(f"{col['name']} {sql_type} {nullable} {default}".strip())
                
                # Create new table with only system columns
                temp_table = f"{table.table_name}_temp_cleanup"
                
                create_sql = f"""
                CREATE TABLE {temp_table} (
                    {', '.join(system_cols)}
                )
                """
                
                # Copy data (only system columns)
                system_col_names = [col['name'] for col in columns if col['name'].lower() in SYSTEM_COLUMNS]
                insert_sql = f"""
                INSERT INTO {temp_table} ({', '.join(system_col_names)})
                SELECT {', '.join(system_col_names)} FROM {table.table_name}
                """
                
                # Drop old table and rename new one
                drop_sql = f"DROP TABLE {table.table_name}"
                rename_sql = f"ALTER TABLE {temp_table} RENAME TO {table.table_name}"
                
                # Execute in transaction
                db.execute(text(create_sql))
                db.execute(text(insert_sql))
                db.execute(text(drop_sql))
                db.execute(text(rename_sql))
                
                cleaned_tables.append(table.table_name)
                print(f"   ✅ Cleaned successfully")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
                db.rollback()
                continue
        
        db.commit()
        
        print("\n" + "=" * 80)
        print(f"✅ Successfully cleaned {len(cleaned_tables)} tables")
        print("=" * 80)
        print("\nAll custom columns have been removed from physical tables.")
        print("You can now create new fields from scratch!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_physical_columns()

