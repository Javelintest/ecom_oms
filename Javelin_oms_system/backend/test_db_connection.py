from sqlalchemy import create_engine, text

DB_URL = "mysql+pymysql://u593574106_Mango:Mango%408585@82.25.121.79:3306/u593574106_Mango"
engine = create_engine(DB_URL)

try:
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("SHOW TABLES LIKE 'channel_field_definitions'"))
        tables = result.fetchall()
        print(f"Table exists: {len(tables) > 0}")
        
        # Check table structure  
        result = conn.execute(text("DESCRIBE channel_field_definitions"))
        print("\nTable Structure:")
        for row in result:
            print(f"  {row[0]}: {row[1]}")
        
        # Check if there are any rows
        result = conn.execute(text("SELECT COUNT(*) FROM channel_field_definitions"))
        count = result.fetchone()[0]
        print(f"\nTotal records: {count}")
        
except Exception as e:
    print(f"Error: {e}")
