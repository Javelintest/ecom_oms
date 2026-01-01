"""
Script to delete all user-created fields from all channel tables
Only deletes custom fields, preserves system columns
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.apps.common.db import SessionLocal
from backend.apps.mango.channel_master_models import Channel, ChannelTable, ChannelTableSchema
from sqlalchemy import text

# System columns that should NEVER be deleted
SYSTEM_COLUMNS = {
    'id', 'channel_record_id', 'company_id', 'uploaded_by_user_id', 
    'uploaded_at', 'raw_data', 'is_synced_to_master', 'master_order_id',
    'synced_at', 'created_at', 'updated_at'
}

def delete_all_custom_fields():
    """Delete all user-created fields from all channel tables"""
    db = SessionLocal()
    
    try:
        # Get all schema entries
        all_schemas = db.query(ChannelTableSchema).all()
        
        # Filter to only custom fields (not system columns)
        custom_fields = [
            schema for schema in all_schemas 
            if schema.column_name.lower() not in SYSTEM_COLUMNS
        ]
        
        print(f"Found {len(all_schemas)} total schema entries")
        print(f"Found {len(custom_fields)} custom (user-created) fields to delete")
        print(f"Will preserve {len(all_schemas) - len(custom_fields)} system fields\n")
        
        if len(custom_fields) == 0:
            print("✅ No custom fields to delete. All clean!")
            return
        
        # Group by table for reporting
        from collections import defaultdict
        fields_by_table = defaultdict(list)
        for field in custom_fields:
            table_id = field.channel_table_id
            channel_id = field.channel_id
            table_name = "Unknown"
            
            if table_id:
                table = db.query(ChannelTable).filter(ChannelTable.id == table_id).first()
                if table:
                    table_name = table.table_name
            elif channel_id:
                channel = db.query(Channel).filter(Channel.id == channel_id).first()
                if channel:
                    table_name = channel.table_name
            
            fields_by_table[table_name].append({
                'id': field.id,
                'column_name': field.column_name,
                'field_name': field.field_name or field.column_name
            })
        
        # Show what will be deleted
        print("Fields to be deleted by table:")
        print("-" * 80)
        for table_name, fields in fields_by_table.items():
            print(f"\n📊 Table: {table_name} ({len(fields)} fields)")
            for field in fields:
                print(f"   - {field['field_name']} ({field['column_name']})")
        
        # Confirm deletion (skip if --yes flag provided)
        import sys
        auto_confirm = '--yes' in sys.argv or '-y' in sys.argv
        
        if not auto_confirm:
            print("\n" + "=" * 80)
            try:
                response = input("\n⚠️  Are you sure you want to delete ALL custom fields? (yes/no): ")
                if response.lower() != 'yes':
                    print("❌ Deletion cancelled.")
                    return
            except EOFError:
                print("\n⚠️  No input available. Use --yes flag to auto-confirm.")
                print("❌ Deletion cancelled for safety.")
                return
        else:
            print("\n⚠️  Auto-confirmed (--yes flag provided)")
        
        # Delete custom fields
        deleted_count = 0
        for field in custom_fields:
            try:
                db.delete(field)
                deleted_count += 1
            except Exception as e:
                print(f"⚠️  Error deleting field {field.column_name}: {str(e)}")
        
        # Commit changes
        db.commit()
        
        print(f"\n✅ Successfully deleted {deleted_count} custom fields from schema metadata")
        print("\n📝 Note: Physical columns remain in database tables but are now unused.")
        print("   SQLite doesn't support DROP COLUMN easily. Columns can be manually removed if needed.")
        
        # Show remaining fields
        remaining = db.query(ChannelTableSchema).count()
        print(f"\n📊 Remaining schema entries: {remaining} (should be system fields only)")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 80)
    print("DELETE ALL CUSTOM FIELDS FROM CHANNEL TABLES")
    print("=" * 80)
    print("\nThis script will:")
    print("  ✓ Delete all user-created fields from channel_table_schema")
    print("  ✓ Preserve all system columns (id, company_id, created_at, etc.)")
    print("  ✓ Keep channel tables and structure intact")
    print("\n⚠️  WARNING: This action cannot be easily undone!")
    print("=" * 80)
    
    delete_all_custom_fields()

