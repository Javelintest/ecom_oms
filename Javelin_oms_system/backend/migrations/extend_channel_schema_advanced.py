"""
Advanced Channel Table Schema Migration
Extends the multi-channel system to support advanced field configurations including:
- Validation rules (email, phone, regex, range, length)
- Key constraints (primary, unique, indexed, auto-increment)
- Default values and descriptions
- Composite constraints
"""

import sys
import os
from sqlalchemy import create_engine, text, Table, Column, Integer, String, Boolean, DECIMAL, TEXT, JSON, DateTime, Enum, ForeignKey, MetaData
from sqlalchemy.sql import func
import pymysql

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Empty password for XAMPP default
    'database': 'javelin_oms',
    'port': 3306
}

def get_engine():
    """Create database engine"""
    connection_string = f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    return create_engine(connection_string, echo=True)

def extend_channel_table_schema(engine):
    """
    Extend channel_table_schema table with advanced field properties
    """
    print("\n" + "="*80)
    print("Step 1: Extending channel_table_schema table")
    print("="*80)
    
    with engine.connect() as conn:
        # Define all columns to add
        columns_to_add = {
            # Validation columns
            'validation_rule': "VARCHAR(50) DEFAULT 'none' COMMENT 'Validation type: none, email, phone, url, regex, range, length'",
            'validation_pattern': "TEXT COMMENT 'Custom regex pattern for validation'",
            'min_value': "DECIMAL(18,4) COMMENT 'Minimum value for number range validation'",
            'max_value': "DECIMAL(18,4) COMMENT 'Maximum value for number range validation'",
            'min_length': "INT COMMENT 'Minimum length for text validation'",
            'max_length': "INT COMMENT 'Maximum length for text validation'",
            # Constraint columns
            'is_primary_key': "BOOLEAN DEFAULT FALSE COMMENT 'Is this field a primary key'",
            'is_unique': "BOOLEAN DEFAULT FALSE COMMENT 'Is this field unique'",
            'is_indexed': "BOOLEAN DEFAULT FALSE COMMENT 'Is this field indexed for search'",
            'auto_increment': "BOOLEAN DEFAULT FALSE COMMENT 'Auto-increment for numeric fields'",
            # Metadata columns
            'default_value': "VARCHAR(255) COMMENT 'Default value for this field'",
            'description': "TEXT COMMENT 'Field description'",
            'foreign_key_table': "VARCHAR(100) COMMENT 'Target table for foreign key'",
            'foreign_key_column': "VARCHAR(100) COMMENT 'Target column for foreign key'"
        }
        
        added_count = 0
        skipped_count = 0
        
        for column_name, column_def in columns_to_add.items():
            # Check if column already exists
            check_query = text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'channel_table_schema' 
                AND COLUMN_NAME = :col
            """)
            result = conn.execute(check_query, {"db": DB_CONFIG['database'], "col": column_name}).fetchone()
            
            if result:
                print(f"  ⊘ {column_name} already exists, skipping")
                skipped_count += 1
            else:
                print(f"  → Adding {column_name}...")
                conn.execute(text(f"""
                    ALTER TABLE channel_table_schema
                    ADD COLUMN {column_name} {column_def}
                """))
                conn.commit()
                added_count += 1
                print(f"  ✓ {column_name} added")
        
        print(f"\n✅ Summary: {added_count} columns added, {skipped_count} already existed")


def create_composite_constraints_table(engine):
    """
    Create table for storing composite unique constraints
    """
    print("\n" + "="*80)
    print("Step 2: Creating channel_composite_constraints table")
    print("="*80)
    
    with engine.connect() as conn:
        # Check if table exists
        check_query = text("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'channel_composite_constraints'
        """)
        result = conn.execute(check_query, {"db": DB_CONFIG['database']}).fetchone()
        
        if result:
            print("✓ Table already exists. Skipping...")
            return
        
        print("\n→ Creating table...")
        conn.execute(text("""
            CREATE TABLE channel_composite_constraints (
                id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Constraint ID',
                channel_id INT NOT NULL COMMENT 'Reference to channels table',
                constraint_name VARCHAR(100) NOT NULL COMMENT 'Name of the constraint',
                constraint_type ENUM('UNIQUE', 'INDEX') DEFAULT 'UNIQUE' COMMENT 'Type of constraint',
                field_names JSON NOT NULL COMMENT 'Array of field names in constraint e.g. ["order_id", "channel_name"]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When constraint was created',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When constraint was last updated',
                
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                INDEX idx_channel (channel_id),
                UNIQUE KEY unique_constraint_name (channel_id, constraint_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='Stores composite unique constraints and multi-field indexes for channel tables'
        """))
        print("✓ Table created")
        
        conn.commit()
        print("\n✅ channel_composite_constraints table created successfully!")

def verify_schema(engine):
    """
    Verify the schema changes
    """
    print("\n" + "="*80)
    print("Step 3: Verifying schema changes")
    print("="*80)
    
    with engine.connect() as conn:
        # Check channel_table_schema columns
        print("\n→ Checking channel_table_schema columns...")
        result = conn.execute(text("""
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = :db 
            AND TABLE_NAME = 'channel_table_schema'
            AND COLUMN_NAME IN (
                'validation_rule', 'validation_pattern', 'min_value', 'max_value',
                'min_length', 'max_length', 'is_primary_key', 'is_unique',
                'is_indexed', 'auto_increment', 'default_value', 'description',
                'foreign_key_table', 'foreign_key_column'
            )
            ORDER BY ORDINAL_POSITION
        """), {"db": DB_CONFIG['database']})
        
        columns = result.fetchall()
        print(f"\n✓ Found {len(columns)} new columns:")
        for col in columns:
            print(f"   - {col[0]} ({col[1]}): {col[2]}")
        
        # Check composite constraints table
        print("\n→ Checking channel_composite_constraints table...")
        result = conn.execute(text("""
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = :db 
            AND TABLE_NAME = 'channel_composite_constraints'
            ORDER BY ORDINAL_POSITION
        """), {"db": DB_CONFIG['database']})
        
        columns = result.fetchall()
        print(f"\n✓ Found {len(columns)} columns in composite constraints table:")
        for col in columns:
            print(f"   - {col[0]} ({col[1]}): {col[2]}")
        
        print("\n✅ Schema verification complete!")

def main():
    """
    Main migration function
    """
    print("\n" + "="*80)
    print("ADVANCED CHANNEL TABLE SCHEMA MIGRATION")
    print("="*80)
    print("\nThis migration will:")
    print("  1. Extend channel_table_schema with validation & constraint columns")
    print("  2. Create channel_composite_constraints table")
    print("  3. Verify the changes")
    print("\n" + "="*80 + "\n")
    
    try:
        # Create engine
        engine = get_engine()
        
        # Run migrations
        extend_channel_table_schema(engine)
        create_composite_constraints_table(engine)
        verify_schema(engine)
        
        print("\n" + "="*80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*80)
        print("\nYour multi-channel system now supports:")
        print("  ✓ Email, phone, URL validation")
        print("  ✓ Custom regex patterns")
        print("  ✓ Number ranges & text length limits")
        print("  ✓ Primary keys, unique constraints")
        print("  ✓ Auto-increment fields")
        print("  ✓ Field indexing")
        print("  ✓ Composite unique constraints")
        print("  ✓ Foreign key relationships")
        print("  ✓ Default values & descriptions")
        print("\n" + "="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
