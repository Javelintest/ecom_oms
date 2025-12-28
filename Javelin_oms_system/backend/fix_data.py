from sqlalchemy.orm import Session
from backend.apps.common import SessionLocal, models

def run_migration():
    db = SessionLocal()
    try:
        # Get Default Company (ID 1)
        default_company = db.query(models.Company).filter(models.Company.id == 1).first()
        if not default_company:
            print("Default company not found.")
            return

        print(f"Migrating legacy data to Default Company: {default_company.name} (ID: 1)")

        # Update Vendors
        vendors = db.query(models.Vendor).filter(models.Vendor.company_id == None).all()
        for v in vendors:
            v.company_id = 1
        print(f"Updated {len(vendors)} vendors.")

        # Update Warehouses
        whs = db.query(models.Warehouse).filter(models.Warehouse.company_id == None).all()
        for w in whs:
            w.company_id = 1
        print(f"Updated {len(whs)} warehouses.")

        # Update Products
        prods = db.query(models.Product).filter(models.Product.company_id == None).all()
        for p in prods:
            p.company_id = 1
        print(f"Updated {len(prods)} products.")
        
        # Update POs
        pos = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.company_id == None).all()
        for po in pos:
            po.company_id = 1
        print(f"Updated {len(pos)} POs.")

        db.commit()
        print("Migration complete.")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
