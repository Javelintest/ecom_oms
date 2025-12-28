from backend.apps.common import SessionLocal, models

def check_apps():
    db = SessionLocal()
    try:
        apps = db.query(models.Application).all()
        for app in apps:
            print(f"ID: {app.id} | Name: {app.name} | Code: '{app.code}'")
    finally:
        db.close()

if __name__ == "__main__":
    check_apps()
