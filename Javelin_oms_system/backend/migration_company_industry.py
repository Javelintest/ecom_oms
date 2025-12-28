from backend.apps.common import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        print("Checking for industry column in companies table...")
        try:
            db.execute(text("SELECT industry FROM companies LIMIT 1"))
            print("Columns already exist.")
        except Exception:
            print("Adding industry column...")
            db.execute(text("ALTER TABLE companies ADD COLUMN industry VARCHAR(100)"))
            db.commit()
            print("Columns added successfully.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
