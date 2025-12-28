from backend.apps.common.db import engine
from sqlalchemy import text

def add_column(table, column, type_def):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
            print(f"Added {column} to {table}")
    except Exception as e:
        print(f"Skipping {column}: {e}")

# Fix Companies Table
add_column("companies", "city", "VARCHAR(100)")
add_column("companies", "state", "VARCHAR(100)")
add_column("companies", "country", "VARCHAR(100) DEFAULT 'India'")
add_column("companies", "zip_code", "VARCHAR(20)")
add_column("companies", "currency", "VARCHAR(10) DEFAULT 'INR'")
add_column("companies", "timezone", "VARCHAR(50) DEFAULT 'Asia/Kolkata'")

# Fix Users Table
add_column("users", "company_id", "INT")
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id)"))
        print("Added FK to users")
except Exception as e:
    print(f"Skipping FK: {e}")

print("Schema Update Complete.")
