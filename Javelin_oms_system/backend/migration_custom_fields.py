from sqlalchemy import create_engine, text
from backend.apps.common.db import DB_URL
from backend.apps.common.models import Base

def run_migration():
    engine = create_engine(DB_URL)
    connection = engine.connect()
    print(f"Connected to {DB_URL}")

    # Create table directly using SQLAlchemy metadata
    # This is safer than raw SQL for exact model match
    try:
        print("Creating custom_field_definitions table...")
        Base.metadata.create_all(bind=engine)
        print("Table creation check complete (SQLAlchemy handles existence checks).")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
