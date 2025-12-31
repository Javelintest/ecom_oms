"""Script to check users in the database"""
from apps.common import SessionLocal, models

def check_users():
    """List all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        
        if not users:
            print("❌ No users found in the database")
            print("\n💡 You may need to create a user first")
            return
        
        print(f"✅ Found {len(users)} user(s) in the database:\n")
        print("=" * 80)
        
        for user in users:
            print(f"\n👤 User ID: {user.id}")
            print(f"   Email: {user.email}")
            print(f"   Full Name: {user.full_name}")
            print(f"   Is Active: {'Yes' if user.is_active else 'No'}")
            print(f"   Is Admin: {'Yes' if user.is_admin else 'No'}")
            print(f"   Is Developer: {'Yes' if user.is_developer else 'No'}")
            print(f"   Company ID: {user.company_id}")
            print(f"   Last Login: {user.last_login}")
            print(f"   Created At: {user.created_at}")
            
            # Check company memberships
            if user.company_memberships:
                print(f"\n   Company Memberships:")
                for membership in user.company_memberships:
                    company = db.query(models.Company).filter_by(id=membership.company_id).first()
                    company_name = company.name if company else "Unknown"
                    print(f"   - {company_name} (Role: {membership.role})")
            
            print("-" * 80)
        
        # Check companies
        companies = db.query(models.Company).all()
        print(f"\n\n📊 Found {len(companies)} compan{'y' if len(companies) == 1 else 'ies'} in the database:")
        for company in companies:
            print(f"   - ID: {company.id}, Name: {company.name}")
            
    except Exception as e:
        print(f"❌ Error checking users: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
