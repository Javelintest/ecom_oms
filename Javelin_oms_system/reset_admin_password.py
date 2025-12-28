#!/usr/bin/env python3
"""Reset admin user password - Direct DB access version"""
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def reset_admin_password(email="admin@javelin.com", new_password="admin123"):
    """Reset or create admin user with specified password"""
    
    # Get database URL from environment or use SQLite default
    db_url = os.getenv("DATABASE_URL", "sqlite:///./javelin_oms.db")
    
    try:
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            # Check if user exists
            result = conn.execute(
                text("SELECT id, email FROM users WHERE email = :email"),
                {"email": email}
            )
            user = result.fetchone()
            
            hashed_password = get_password_hash(new_password)
            
            if user:
                # User exists, update password
                conn.execute(
                    text("UPDATE users SET hashed_password = :password WHERE email = :email"),
                    {"password": hashed_password, "email": email}
                )
                conn.commit()
                print(f"✅ Password updated for user: {email}")
                print(f"   New password: {new_password}")
            else:
                # User doesn't exist, create new user
                conn.execute(
                    text("""
                        INSERT INTO users (email, hashed_password, full_name, is_active, created_at)
                        VALUES (:email, :password, :full_name, 1, datetime('now'))
                    """),
                    {
                        "email": email,
                        "password": hashed_password,
                        "full_name": "Admin User"
                    }
                )
                conn.commit()
                print(f"✅ New user created: {email}")
                print(f"   Password: {new_password}")
                print(f"   Name: Admin User")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    
    email = "admin@javelin.com"
    password = "admin123"
    
    # Allow custom password from command line
    if len(sys.argv) > 1:
        password = sys.argv[1]
    
    print("="*50)
    print("Javelin OMS - Admin Password Reset")
    print("="*50)
    print()
    print(f"Email: {email}")
    print(f"New Password: {password}")
    print()
    
    if reset_admin_password(email, password):
        print()
        print("="*50)
        print("✅ SUCCESS!")
        print("="*50)
        print()
        print("You can now login with:")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
    else:
        print()
        print("❌ FAILED - Please check the error above")
