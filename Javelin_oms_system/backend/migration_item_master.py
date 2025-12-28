from sqlalchemy import create_engine, text
from backend.apps.common.db import DB_URL, engine
from backend.apps.common.models import Base

def run_migration():
    engine = create_engine(DB_URL)
    connection = engine.connect()
    print(f"Connected to {DB_URL}")

    # List of new columns to add
    # (Column Name, SQL Type)
    new_columns = [
        ("item_code", "VARCHAR(100)"),
        ("item_short_name", "VARCHAR(200)"),
        ("item_type", "VARCHAR(50)"),
        ("item_status", "VARCHAR(50) DEFAULT 'Active'"),
        ("parent_item_id", "INTEGER"),
        ("item_level", "INTEGER DEFAULT 0"),
        ("subcategory_id", "INTEGER"),
        ("product_group", "VARCHAR(100)"),
        ("brand_id", "INTEGER"),
        ("model_no", "VARCHAR(100)"),
        ("variant_group", "VARCHAR(100)"),
        ("base_uom", "VARCHAR(20)"),
        ("alternate_uom", "VARCHAR(20)"),
        ("uom_conversion_factor", "DECIMAL(10,4) DEFAULT 1.0"),
        ("inventory_tracking_flag", "BOOLEAN DEFAULT 1"),
        ("batch_tracking_flag", "BOOLEAN DEFAULT 0"),
        ("serial_tracking_flag", "BOOLEAN DEFAULT 0"),
        ("expiry_tracking_flag", "BOOLEAN DEFAULT 0"),
        ("hsn_code", "VARCHAR(20)"),
        ("gst_applicable_flag", "BOOLEAN DEFAULT 1"),
        ("tax_category", "VARCHAR(50)"),
        ("cess_applicable_flag", "BOOLEAN DEFAULT 0"),
        ("country_of_origin", "VARCHAR(50)"),
        ("weight_uom", "VARCHAR(20)"),
        ("dimension_uom", "VARCHAR(20)"),
        ("volume", "DECIMAL(10,4)"),
        ("color", "VARCHAR(50)"),
        ("size", "VARCHAR(50)"),
        ("material", "VARCHAR(100)"),
        ("quality_grade", "VARCHAR(50)"),
        ("shelf_life_days", "INTEGER"),
        ("storage_type", "VARCHAR(50)"),
        ("temperature_range", "VARCHAR(50)"),
        ("costing_method", "VARCHAR(50) DEFAULT 'Weighted Average'"),
        ("standard_cost", "DECIMAL(12,2)"),
        ("default_margin_percent", "DECIMAL(5,2)"),
        ("price_control_type", "VARCHAR(50)"),
        ("hazardous_flag", "BOOLEAN DEFAULT 0"),
        ("stackable_flag", "BOOLEAN DEFAULT 1"),
        ("min_order_qty", "DECIMAL(10,2)"),
        ("max_order_qty", "DECIMAL(10,2)"),
        ("reorder_level", "DECIMAL(10,2)"),
        ("abc_classification", "VARCHAR(1)"),
        ("demand_velocity", "VARCHAR(20)"),
        ("forecast_enabled_flag", "BOOLEAN DEFAULT 1"),
        ("lifecycle_stage", "VARCHAR(50)"),
        ("ai_tags", "TEXT"),
        ("search_keywords", "TEXT"),
        ("custom_attributes_json", "TEXT"),
        ("approved_status", "VARCHAR(50) DEFAULT 'Draft'"),
        ("approved_by", "INTEGER")
    ]

    for col_name, col_type in new_columns:
        try:
            sql = f"ALTER TABLE products ADD COLUMN {col_name} {col_type}"
            connection.execute(text(sql))
            print(f"Added column: {col_name}")
        except Exception as e:
            # Column likely exists
            print(f"Skipping {col_name}, might already exist. Error: {e}")

    try:
        # Create Update Index on item_code if supported/needed, but SQLite handles index creation separately
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_item_code ON products (item_code)"))
        print("Indexes updated.")
    except Exception as e:
         print(f"Index error: {e}")

    print("Migration completed.")
    connection.close()

if __name__ == "__main__":
    run_migration()
