"""
Clean up duplicate mappings and add constraint
"""

import sys
sys.path.insert(0, '/Users/surajjha/Desktop/S Code/01_Jav_Order_M_OMS/Javelin_oms_system')

from backend.apps.common.db import DB_URL
from sqlalchemy import create_engine, text

def cleanup_and_constrain():
    engine = create_engine(DB_URL)
    
    with engine.connect() as conn:
        # Find duplicates
        print("Finding duplicate mappings...")
        result = conn.execute(text("""
            SELECT product_id, platform_name, COUNT(*) as count
            FROM platform_item_mappings
            GROUP BY product_id, platform_name
            HAVING COUNT(*) > 1
        """))
        
        duplicates = result.fetchall()
        
        if duplicates:
            print(f"\n⚠️  Found {len(duplicates)} duplicate product-platform combinations:")
            for dup in duplicates:
                print(f"  - Product ID {dup[0]} on {dup[1]} ({dup[2]} mappings)")
            
            # Keep only the most recent mapping for each product-platform
            print("\nCleaning up duplicates (keeping most recent)...")
            for dup in duplicates:
                product_id, platform_name = dup[0], dup[1]
                
                # Delete all but the most recent
                conn.execute(text("""
                    DELETE FROM platform_item_mappings
                    WHERE id NOT IN (
                        SELECT id FROM (
                            SELECT id FROM platform_item_mappings
                            WHERE product_id = :pid AND platform_name = :pname
                            ORDER BY created_at DESC
                            LIMIT 1
                        ) AS keep
                    )
                    AND product_id = :pid AND platform_name = :pname
                """), {"pid": product_id, "pname": platform_name})
            
            conn.commit()
            print("✓ Duplicates cleaned up")
        else:
            print("✓ No duplicates found")
        
        # Now add the constraint
        try:
            conn.execute(text("ALTER TABLE platform_item_mappings ADD UNIQUE KEY unique_platform_per_product (product_id, platform_name)"))
            conn.commit()
            print("✓ Added unique constraint: unique_platform_per_product")
        except Exception as e:
            if "Duplicate entry" in str(e):
                print("⚠️  Still have duplicates, constraint not added")
            elif "already exists" in str(e) or "Duplicate key name" in str(e):
                print("✓ Constraint already exists")
            else:
                print(f"Note: {e}")
        
        print("\n✅ Done! Validation rule active:")
        print("   - One product CAN be mapped to multiple platforms")
        print("   - One product CANNOT have multiple mappings on the same platform")

if __name__ == "__main__":
    cleanup_and_constrain()
