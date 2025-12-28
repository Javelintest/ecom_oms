from sqlalchemy import text
from backend.apps.common import SessionLocal

def migrate():
    db = SessionLocal()
    try:
        print("Starting manual schema migration...")
        
        # Add company_id to vendors
        try:
            db.execute(text("ALTER TABLE vendors ADD COLUMN company_id INT DEFAULT NULL;"))
            db.execute(text("ALTER TABLE vendors ADD INDEX ix_vendors_company_id (company_id);"))
            print("Added company_id to vendors.")
        except Exception as e:
            print(f"Vendor migration skipped/failed (might exist): {e}")

        # Add company_id to warehouses
        try:
            db.execute(text("ALTER TABLE warehouses ADD COLUMN company_id INT DEFAULT NULL;"))
            db.execute(text("ALTER TABLE warehouses ADD INDEX ix_warehouses_company_id (company_id);"))
            print("Added company_id to warehouses.")
        except Exception as e:
            print(f"Warehouse migration skipped/failed: {e}")

        # Add company_id to products
        try:
            db.execute(text("ALTER TABLE products ADD COLUMN company_id INT DEFAULT NULL;"))
            db.execute(text("ALTER TABLE products ADD INDEX ix_products_company_id (company_id);"))
            print("Added company_id to products.")
        except Exception as e:
            print(f"Product migration skipped/failed: {e}")
            
        # Add company_id to purchase_orders
        try:
            db.execute(text("ALTER TABLE purchase_orders ADD COLUMN company_id INT DEFAULT NULL;"))
            db.execute(text("ALTER TABLE purchase_orders ADD INDEX ix_purchase_orders_company_id (company_id);"))
            print("Added company_id to purchase_orders.")
        except Exception as e:
            print(f"PO migration skipped/failed: {e}")

        # Add Product Fields (Rate, HSN, etc)
        try:
            db.execute(text("ALTER TABLE products ADD COLUMN hsn_sac VARCHAR(50) DEFAULT NULL;"))
            db.execute(text("ALTER TABLE products ADD COLUMN purchase_description TEXT DEFAULT NULL;"))
            db.execute(text("ALTER TABLE products ADD COLUMN purchase_rate DECIMAL(12,2) DEFAULT 0;"))
            db.execute(text("ALTER TABLE products ADD COLUMN sales_rate DECIMAL(12,2) DEFAULT 0;"))
            print("Added extra fields to products.")
        except Exception as e:
            print(f"Product extra fields migration skipped/failed: {e}")

        db.commit()

        # Update Data (Assign NULLs to ID 1)
        print("Migrating data to Default Company (ID 1)...")
        db.execute(text("UPDATE vendors SET company_id = 1 WHERE company_id IS NULL;"))
        db.execute(text("UPDATE warehouses SET company_id = 1 WHERE company_id IS NULL;"))
        db.execute(text("UPDATE products SET company_id = 1 WHERE company_id IS NULL;"))
        db.execute(text("UPDATE purchase_orders SET company_id = 1 WHERE company_id IS NULL;"))
        db.commit()
        
        print("Migration and Data Fix Complete.")
        
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
