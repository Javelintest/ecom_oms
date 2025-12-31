from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .apps.common import Base, engine, SessionLocal, models
from .apps.oms.routers import orders, inventory, dashboard, platforms, connections, sync_logs, reports, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Multi-Platform E-commerce OMS")


origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8005",
    "http://127.0.0.1:8005",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "*"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/oms")
app.include_router(dashboard.router, prefix="/oms")
app.include_router(orders.router, prefix="/oms")
app.include_router(inventory.router, prefix="/oms")
app.include_router(platforms.router, prefix="/oms")
app.include_router(connections.router, prefix="/oms")
app.include_router(sync_logs.router, prefix="/oms")
app.include_router(sync_logs.router, prefix="/oms")
app.include_router(reports.router, prefix="/oms")

from .apps.oms.routers import settings
app.include_router(settings.router, prefix="/oms")

from .apps.mango.routers import inventory as mango_inventory
app.include_router(mango_inventory.router, prefix="/mango/inventory", tags=["Mango Inventory"])

from .apps.mango.routers import customers
app.include_router(customers.router, prefix="/mango/customers", tags=["Customer Management"])

from .apps.mango import dispatch_routes
app.include_router(dispatch_routes.router, prefix="/mango", tags=["Dispatch Scanning"])

from .apps.mango import channel_config_routes
app.include_router(channel_config_routes.router, prefix="/mango", tags=["Channel Configuration"])

from .apps.mango import channel_import_routes
app.include_router(channel_import_routes.router, prefix="/mango", tags=["Channel Import"])

from .apps.mango import channel_orders_routes
app.include_router(channel_orders_routes.router, prefix="/mango", tags=["Channel Orders"])

from .apps.mango import oms_sync_routes
app.include_router(oms_sync_routes.router, prefix="/mango", tags=["OMS Sync"])

# Multi-Channel Master System Routes
from .apps.mango import channel_management_routes
app.include_router(channel_management_routes.router, prefix="/api", tags=["Multi-Channel Management"])

from .apps.mango import channel_upload_routes
app.include_router(channel_upload_routes.router, prefix="/api", tags=["Multi-Channel Upload"])


# Mount frontend directory
import os
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/frontend", StaticFiles(directory=frontend_dir, html=True), name="frontend")



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
        
        # Init Apps
        default_apps = [
            {"name": "Order Management System", "code": "oms", "description": "Centralize orders from Amazon, Flipkart, etc."},
            {"name": "Mango", "code": "mango", "description": "Advanced multi-warehouse inventory management."},
            {"name": "Jaimini Intelligence", "code": "jaimini", "description": "AI-powered analytics and forecasting."},
            {"name": "Global Settings", "code": "settings", "description": "Organization and User Management."}
        ]
        
        for app_data in default_apps:
            existing = db.query(models.Application).filter_by(code=app_data["code"]).first()
            if existing:
                # Update if changed
                if existing.name != app_data["name"] or existing.description != app_data["description"]:
                    existing.name = app_data["name"]
                    existing.description = app_data["description"]
                    db.add(existing)
            else:
                application = models.Application(
                    name=app_data["name"],
                    code=app_data["code"],
                    description=app_data["description"],
                    is_active=1
                )
                db.add(application)

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

# Developer Panel Routes (Protected - requires developer role)
from .apps.dev import panel_routes as dev_panel
from .apps.dev import data_routes as dev_data
app.include_router(dev_panel.router, prefix="/api", tags=["Developer Panel"])
app.include_router(dev_data.router, prefix="/api", tags=["Developer Panel - Data"])


# Mount frontend static files (Must be last to avoid hiding API routes)
import os
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
