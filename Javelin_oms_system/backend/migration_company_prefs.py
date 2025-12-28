from backend.apps.common import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        print("Checking for preference columns in companies table...")
        
        columns_to_add = [
            ("fiscal_year", "VARCHAR(50) DEFAULT 'April - March'"),
            ("report_basis", "VARCHAR(20) DEFAULT 'Accrual'"),
            ("language", "VARCHAR(50) DEFAULT 'English'"),
            ("date_format", "VARCHAR(50) DEFAULT 'dd/MM/yyyy'")
        ]
        
        for col_name, col_def in columns_to_add:
            try:
                db.execute(text(f"SELECT {col_name} FROM companies LIMIT 1"))
                print(f"Column '{col_name}' already exists.")
            except Exception:
                print(f"Adding column '{col_name}'...")
                db.execute(text(f"ALTER TABLE companies ADD COLUMN {col_name} {col_def}"))
                db.commit()
                print(f"Column '{col_name}' added.")

    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
