# Multi-Platform E-commerce OMS (FastAPI + MySQL)

A unified Order Management System (OMS) for managing orders and inventory across multiple e-commerce platforms including Amazon, Flipkart, Meesho, Myntra, and more.

## Features

- **Multi-Platform Support**: Manage orders and inventory from multiple e-commerce platforms in one unified dashboard
- **Unified Data Model**: Single database schema for all platforms with platform-specific metadata
- **Platform Adapters**: Extensible adapter system for easy integration with new platforms
- **Real-time Dashboard**: Aggregated analytics across all platforms with platform breakdown
- **Order Management**: View, filter, and sync orders from all connected platforms
- **Inventory Management**: Unified inventory tracking with platform-specific fields
- **Platform Management**: Enable/disable platforms and configure API credentials

## Supported Platforms

- ✅ Amazon (SP-API)
- ✅ Flipkart (Seller API)
- ✅ Meesho (Seller API)
- ✅ Myntra (Seller API)
- 🔄 Easy to add more platforms via adapter system

## Architecture

### Backend Structure

```
backend/
├── models.py          # Unified database models (Order, OrderItem, Inventory, Platform)
├── platforms/         # Platform adapter system
│   ├── base.py        # Abstract base adapter
│   ├── amazon.py      # Amazon adapter
│   ├── flipkart.py    # Flipkart adapter
│   ├── meesho.py      # Meesho adapter
│   └── myntra.py      # Myntra adapter
├── routers/           # API endpoints
│   ├── dashboard.py   # Dashboard analytics
│   ├── orders.py      # Order management
│   ├── inventory.py   # Inventory management
│   └── platforms.py   # Platform configuration
└── main.py            # FastAPI application
```

### Database Schema

- **Platforms**: Store platform configurations and API credentials
- **Orders**: Unified orders table with platform_id foreign key
- **OrderItems**: Order line items linked to orders
- **Inventory**: Unified inventory with platform-specific metadata
- **SyncLogs**: Track sync operations across platforms

## Quick Start

1. **Create a Python virtualenv and install requirements:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**

   ```bash
   export DB_URL="mysql+pymysql://user:password@localhost:3306/ecommerce_oms"
   ```

3. **Run backend:**

   ```bash
   uvicorn backend.main:app --reload
   ```

   The API will be available at `http://127.0.0.1:8000`
   API docs available at `http://127.0.0.1:8000/docs`

4. **Open frontend:**

   Open `frontend/index.html` directly in browser or serve via any static server.
   Edit `API_BASE_URL` in `frontend/static/js/app.js` if your backend runs on a different host/port.

## API Endpoints

### Dashboard
- `GET /dashboard/summary` - Get aggregated summary (with optional platform filter)

### Orders
- `GET /orders/` - List orders (with optional platform/status filters)
- `POST /orders/sync` - Sync orders from all platforms or specific platform

### Inventory
- `GET /inventory/` - List inventory (with optional platform/SKU filters)
- `POST /inventory/sync` - Sync inventory from all platforms or specific platform

### Platforms
- `GET /platforms/` - List all configured platforms
- `POST /platforms/` - Create new platform configuration
- `GET /platforms/{id}` - Get platform details
- `PUT /platforms/{id}/toggle` - Toggle platform active status

## Adding a New Platform

1. Create a new adapter in `backend/platforms/your_platform.py`:

```python
from .base import PlatformAdapter

class YourPlatformAdapter(PlatformAdapter):
    @property
    def platform_name(self) -> str:
        return "your_platform"
    
    def fetch_recent_orders(self, **kwargs):
        # Implement your platform's order fetching logic
        pass
    
    def fetch_inventory_snapshot(self, **kwargs):
        # Implement your platform's inventory fetching logic
        pass
```

2. Register it in `backend/platforms/__init__.py`

3. The platform will be automatically initialized on startup

## Configuration

Platform API credentials are stored in the `platforms` table's `api_config` JSON field. Update these via the API or directly in the database.

## Notes

- Currently uses mock data for all platforms. Replace adapter methods with actual API calls.
- Database migrations: Tables are auto-created on first run via SQLAlchemy.
- All timestamps are stored in UTC.
- Platform-specific fields are stored in `platform_metadata` JSON columns.
