from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .common import Base, engine, SessionLocal, models
from .routers import orders, inventory, dashboard, platforms, connections, sync_logs, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Multi-Platform E-commerce OMS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(platforms.router)
app.include_router(connections.router)
app.include_router(sync_logs.router)
app.include_router(reports.router)


@app.on_event("startup")
def init_platforms():
    """Initialize default platforms if they don't exist"""
    db = SessionLocal()
    try:
        default_platforms = [
            {"name": "amazon", "display_name": "Amazon"},
            {"name": "flipkart", "display_name": "Flipkart"},
            {"name": "meesho", "display_name": "Meesho"},
            {"name": "myntra", "display_name": "Myntra"},
        ]
        
        for platform_data in default_platforms:
            existing = db.query(models.Platform).filter_by(name=platform_data["name"]).first()
            if not existing:
                platform = models.Platform(
                    name=platform_data["name"],
                    display_name=platform_data["display_name"],
                    is_active=1,
                    api_config={}
                )
                db.add(platform)
        
        db.commit()
    except Exception as e:
        print(f"Error initializing platforms: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "Multi-Platform E-commerce OMS API is running",
        "version": "2.0",
        "supported_platforms": ["amazon", "flipkart", "meesho", "myntra"]
    }
