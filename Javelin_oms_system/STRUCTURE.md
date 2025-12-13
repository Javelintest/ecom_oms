# Project Structure

This document describes the organized folder structure of the Multi-Platform E-commerce OMS.

## Directory Structure

```
backend/
├── common/                    # Shared/common code across all platforms
│   ├── __init__.py           # Common module exports
│   ├── db.py                  # Database connection and session management
│   ├── models.py              # Unified database models (Platform, Order, OrderItem, Inventory, SyncLog)
│   └── utils.py               # Common utility functions
│
├── platforms/                 # Platform-specific adapters
│   ├── __init__.py            # Platform adapter registry
│   ├── base.py                # Abstract base class for all platform adapters
│   ├── amazon/                # Amazon-specific code
│   │   ├── __init__.py
│   │   └── adapter.py         # Amazon SP-API adapter
│   ├── flipkart/              # Flipkart-specific code
│   │   ├── __init__.py
│   │   └── adapter.py         # Flipkart Seller API adapter
│   ├── meesho/                # Meesho-specific code
│   │   ├── __init__.py
│   │   └── adapter.py         # Meesho API adapter
│   └── myntra/                # Myntra-specific code
│       ├── __init__.py
│       └── adapter.py         # Myntra API adapter
│
├── services/                  # Business logic layer
│   ├── __init__.py            # Services module exports
│   ├── order_service.py        # Order-related business logic
│   ├── inventory_service.py   # Inventory-related business logic
│   └── sync_service.py        # Platform sync operations
│
├── routers/                   # API endpoints (FastAPI routers)
│   ├── __init__.py
│   ├── dashboard.py           # Dashboard analytics endpoints
│   ├── orders.py              # Order management endpoints
│   ├── inventory.py           # Inventory management endpoints
│   └── platforms.py           # Platform configuration endpoints
│
├── __init__.py
└── main.py                    # FastAPI application entry point
```

## Architecture Principles

### 1. **Separation of Concerns**
   - **Common/**: Shared code used by all platforms (database models, utilities)
   - **Platforms/**: Platform-specific implementations isolated in their own folders
   - **Services/**: Business logic separated from API routes
   - **Routers/**: Thin API layer that delegates to services

### 2. **Platform Isolation**
   - Each platform (Amazon, Flipkart, Meesho, Myntra) has its own folder
   - Platform-specific code is self-contained
   - Easy to add new platforms without affecting existing ones

### 3. **Service Layer Pattern**
   - Business logic is in services, not routers
   - Services can be reused across different endpoints
   - Easier to test and maintain

### 4. **Common Code Reusability**
   - Database models, utilities, and connection logic in `common/`
   - No duplication across platforms
   - Single source of truth for shared functionality

## Adding a New Platform

1. Create a new folder in `platforms/` (e.g., `platforms/shopify/`)
2. Create `adapter.py` implementing `PlatformAdapter` from `base.py`
3. Register the adapter in `platforms/__init__.py`
4. The platform will be automatically initialized on startup

## File Responsibilities

### Common Module
- **db.py**: Database engine, session factory, and connection utilities
- **models.py**: SQLAlchemy models for all database tables
- **utils.py**: Helper functions (date parsing, type conversion, etc.)

### Platform Adapters
- **base.py**: Abstract interface that all platform adapters must implement
- **{platform}/adapter.py**: Platform-specific API integration logic

### Services
- **order_service.py**: Order CRUD operations and business rules
- **inventory_service.py**: Inventory CRUD operations and business rules
- **sync_service.py**: Orchestrates syncing from multiple platforms

### Routers
- **dashboard.py**: Analytics and summary endpoints
- **orders.py**: Order listing and sync endpoints
- **inventory.py**: Inventory listing and sync endpoints
- **platforms.py**: Platform management endpoints

## Benefits of This Structure

1. **Maintainability**: Clear separation makes code easier to understand and modify
2. **Scalability**: Easy to add new platforms without touching existing code
3. **Testability**: Services can be tested independently
4. **Reusability**: Common code is shared, reducing duplication
5. **Organization**: Related code is grouped together logically

