#!/usr/bin/env python3
"""Interactive password reset tool for Javelin OMS users"""
from backend.apps.common import SessionLocal, models
from passlib.context import CryptContext
import sys

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def reset_user_password():
    """Interactive password reset"""
    db = SessionLocal()
    
    try:
        # List all users
        users = db.query(models.User).all()
        
        if not users:
            print("❌ No users found in database!")
            return
        
        print("=" * 60)
        print("🔑 Javelin OMS - Password Reset Tool")
        print("=" * 60)
        print("\nAvailable users:\n")
        
        for i, user in enumerate(users, 1):
            status = "✅ Active" if user.is_active else "❌ Inactive"
            admin = " [ADMIN]" if user.is_admin else ""
            dev = " [DEV]" if user.is_developer else ""
            print(f"{i}. {user.email} - {user.full_name} {status}{admin}{dev}")
        
        print("\n" + "-" * 60)
        print("\nQuick reset: python3 reset_password.py <email> <password>")
        print("Or run interactively by just running: python3 reset_password.py")
        print("-" * 60)
        
        # Select user
        if len(sys.argv) > 1:
            # Non-interactive mode: email provided as argument
            email = sys.argv[1]
            user = db.query(models.User).filter_by(email=email).first()
            if not user:
                print(f"❌ User with email '{email}' not found!")
                return
        else:
            # Interactive mode
            print("\nEnter user number to reset password: ", end="")
            try:
                choice = int(input())
                if choice < 1 or choice > len(users):
                    print("❌ Invalid choice!")
                    return
                user = users[choice - 1]
            except (ValueError, KeyboardInterrupt):
                print("\n❌ Operation cancelled")
                return
        
        # Get new password
        if len(sys.argv) > 2:
            # Non-interactive: password provided as argument
            new_password = sys.argv[2]
        else:
            print(f"\nResetting password for: {user.email}")
            print("Enter new password (or press Enter for 'admin123'): ", end="")
            try:
                new_password = input().strip()
                if not new_password:
                    new_password = "admin123"
            except KeyboardInterrupt:
                print("\n❌ Operation cancelled")
                return
        
        # Update password
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ PASSWORD RESET SUCCESSFUL!")
        print("=" * 60)
        print(f"\n📧 Email: {user.email}")
        print(f"🔑 New Password: {new_password}")
        print(f"👤 User: {user.full_name}")
        print("\nYou can now login with these credentials.")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reset_user_password()
