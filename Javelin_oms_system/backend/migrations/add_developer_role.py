"""
Database Migration: Add Developer Role Support
Adds is_developer column and permissions support to users table
"""

from sqlalchemy import create_engine, text

# Database connection
DB_URL = "mysql+pymysql://root:@localhost:3306/javelin_oms"
engine = create_engine(DB_URL)

def run_migration():
    with engine.connect() as conn:
        print("Starting migration: Adding developer role support...")
        
        try:
            # Add is_developer column
            migrations = [
                "ALTER TABLE users ADD COLUMN is_developer BOOLEAN DEFAULT FALSE AFTER is_admin",
                "ALTER TABLE users ADD COLUMN permissions JSON AFTER is_developer",
                "ALTER TABLE users ADD COLUMN last_login DATETIME AFTER permissions"
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
            
            # Set admin@javelin.com as developer
            try:
                conn.execute(text("""
                    UPDATE users 
                    SET is_developer = TRUE 
                    WHERE email = 'admin@javelin.com'
                """))
                print("✓ Set admin@javelin.com as developer")
            except Exception as e:
                print(f"⚠ Could not update admin user: {e}")
            
            conn.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
