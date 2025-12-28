from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from backend.apps.common import SessionLocal, models
from backend.apps.common.dependencies import get_current_user, get_db

router = APIRouter(prefix="/settings", tags=["settings"])

class AppResponse(BaseModel):
    id: int
    name: str
    code: str
    description: str
    is_active_global: int
    is_active_company: bool

    class Config:
        from_attributes = True

@router.get("/apps", response_model=List[AppResponse])
def get_company_apps(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all apps and their status for the current company"""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No active company context")

    all_apps = db.query(models.Application).filter(models.Application.is_active == 1).all()
    company_apps = db.query(models.CompanyApp).filter(models.CompanyApp.company_id == current_user.company_id).all()
    
    # Map active status
    company_app_map = {ca.app_id: ca.is_active for ca in company_apps}
    
    result = []
    for app in all_apps:
        # Default to Active if not in DB? Or Default to Inactive?
        # Usually user needs to enable them. Let's say defaulted to Inactive unless strictly enabled.
        # But for 'OMS' and 'settings' maybe default true?
        # Let's check DB. If not in CompanyApp, it is FALSE (Inactive).
        
        is_active = company_app_map.get(app.id, 0) == 1
        
        # Exceptions: Core apps might be always active? 
        # But user wants to "allot".
        
        result.append({
            "id": app.id,
            "name": app.name,
            "code": app.code,
            "description": app.description,
            "is_active_global": app.is_active,
            "is_active_company": is_active
        })
    return result

@router.post("/apps/{app_id}/toggle")
def toggle_app_status(app_id: int, active: bool, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Enable or disable an app for the company"""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No active company context")
    
    # Check permissions? (Assume Admin/Owner only, but for now allow all authenticated for simplicity in this task)
    
    company_app = db.query(models.CompanyApp).filter(
        models.CompanyApp.company_id == current_user.company_id,
        models.CompanyApp.app_id == app_id
    ).first()
    
    if company_app:
        company_app.is_active = 1 if active else 0
    else:
        company_app = models.CompanyApp(
            company_id=current_user.company_id,
            app_id=app_id,
            is_active=1 if active else 0
        )
        db.add(company_app)
        
    db.commit()
    return {"status": "success", "is_active": active}

# --- Company Profile Endpoints ---

class CompanyProfileUpdate(BaseModel):
    name: str
    industry: str
    location: str # Country
    address_line1: str
    address_line2: str
    city: str
    state: str
    zip_code: str
    phone: str
    website: str
    tax_id: str
    
    # Defaults
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    
    # New Fields
    fiscal_year: str = "April - March"
    report_basis: str = "Accrual"
    language: str = "English"
    date_format: str = "dd/MM/yyyy"

@router.get("/company/profile")
def get_company_profile(current_user: models.User = Depends(get_current_user)):
    """Get current company profile"""
    if not current_user.company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    c = current_user.company
    return {
        "name": c.name,
        "industry": c.industry,
        "location": c.country,
        "address_line1": c.address, # Assume mapped to address for now, or split if needed
        "address_line2": "", 
        "city": c.city,
        "state": c.state,
        "zip_code": c.zip_code,
        "phone": c.phone,
        "website": c.website,
        "tax_id": c.tax_id,
        "currency": c.currency,
        "timezone": c.timezone,
        
        # New Fields
        "fiscal_year": c.fiscal_year,
        "report_basis": c.report_basis,
        "language": c.language,
        "date_format": c.date_format
    }

@router.post("/company/profile")
def update_company_profile(profile: CompanyProfileUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update company profile"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company.name = profile.name
    company.industry = profile.industry
    company.country = profile.location
    company.address = f"{profile.address_line1}\n{profile.address_line2}".strip()
    company.city = profile.city
    company.state = profile.state
    company.zip_code = profile.zip_code
    company.phone = profile.phone
    company.website = profile.website
    company.tax_id = profile.tax_id
    company.currency = profile.currency
    company.timezone = profile.timezone
    
    # Update New Fields
    company.fiscal_year = profile.fiscal_year
    company.report_basis = profile.report_basis
    company.language = profile.language
    company.date_format = profile.date_format
    
    db.commit()
    db.refresh(company)
    return {"status": "success", "message": "Profile updated"}

from fastapi import UploadFile, File
import shutil
import os
import uuid

@router.post("/company/logo")
def upload_company_logo(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Upload company logo"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Create uploads dir if not exists (relative to backend execution or absolute)
    # We will use frontend/static/uploads so it's accessible directly via HTTP if serving static files, 
    # or separate static mount. Assuming frontend/static is served or accessible.
    # For now, let's save to a path we know.
    
    upload_dir = "frontend/static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    ext = file.filename.split(".")[-1]
    filename = f"company_logo_{company.id}_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Construct URL (Relative to where frontend is served, or absolute URL)
    # Assuming frontend is serving static/uploads
    # We need to consider how the user accesses it. 
    # If they access via file://, this won't work well without full path. 
    # If via server, we need the URL path.
    # Let's assume relative path for now: ../../static/uploads/filename
    
    logo_url = f"../../static/uploads/{filename}"
    
    company.logo_url = logo_url
    db.commit()
    
    return {"status": "success", "logo_url": logo_url}

# --- Warehouse Management ---

class WarehouseBase(BaseModel):
    name: str
    code: str
    address: str
    is_active: int = 1

class WarehouseCreate(WarehouseBase):
    pass

@router.get("/warehouses")
def get_warehouses(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all warehouses for the company"""
    if not current_user.company_id:
        return []
        
    return db.query(models.Warehouse).filter(models.Warehouse.company_id == current_user.company_id).all()

@router.post("/warehouses")
def create_warehouse(warehouse: WarehouseCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new warehouse"""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User not part of a company")

    # Check for duplicate code
    existing = db.query(models.Warehouse).filter(
        models.Warehouse.company_id == current_user.company_id,
        models.Warehouse.code == warehouse.code
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already exists")

    new_warehouse = models.Warehouse(
        **warehouse.dict(),
        company_id=current_user.company_id
    )
    db.add(new_warehouse)
    db.commit()
    db.refresh(new_warehouse)
    return new_warehouse

@router.delete("/warehouses/{warehouse_id}")
def delete_warehouse(warehouse_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a warehouse"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Company not found")

    wh = db.query(models.Warehouse).filter(
        models.Warehouse.id == warehouse_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    db.delete(wh)
    db.commit()
    return {"status": "success", "message": "Warehouse deleted"}

@router.get("/warehouses/{warehouse_id}")
def get_warehouse(warehouse_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get details of a specific warehouse"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Company not found")
        
    wh = db.query(models.Warehouse).filter(
        models.Warehouse.id == warehouse_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return wh

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[int] = None

@router.put("/warehouses/{warehouse_id}")
def update_warehouse(warehouse_id: int, warehouse: WarehouseUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an existing warehouse"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Company not found")
        
    wh = db.query(models.Warehouse).filter(
        models.Warehouse.id == warehouse_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    if warehouse.name is not None:
        wh.name = warehouse.name
    if warehouse.code is not None:
        if wh.code != warehouse.code:
             existing = db.query(models.Warehouse).filter(
                models.Warehouse.company_id == current_user.company_id,
                models.Warehouse.code == warehouse.code
            ).first()
             if existing:
                 raise HTTPException(status_code=400, detail="Warehouse code already exists")
        wh.code = warehouse.code
    if warehouse.address is not None:
        wh.address = warehouse.address
    if warehouse.is_active is not None:
        wh.is_active = warehouse.is_active
        
    db.commit()
    db.refresh(wh)
    return wh

# --- Custom Fields Management ---

class CustomFieldCreate(BaseModel):
    entity_type: str = "product"
    field_label: str
    field_type: str
    is_mandatory: Optional[bool] = False
    options: Optional[List[str]] = None # For dropdowns
    default_value: Optional[str] = None

class CustomFieldUpdate(BaseModel):
    field_label: Optional[str] = None
    is_mandatory: Optional[bool] = None
    options: Optional[List[str]] = None
    default_value: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/custom-fields/{entity_type}")
def get_custom_fields(entity_type: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        return []
    
    fields = db.query(models.CustomFieldDefinition).filter(
        models.CustomFieldDefinition.company_id == current_user.company_id,
        models.CustomFieldDefinition.entity_type == entity_type,
        models.CustomFieldDefinition.is_active == True
    ).all()
    return fields

@router.post("/custom-fields")
def create_custom_field(field: CustomFieldCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Company Context Required")

    # Generate key from label: "Warranty Period" -> "cf_warranty_period"
    import re
    slug = re.sub(r'[^a-z0-9]', '_', field.field_label.lower()).strip('_')
    key = f"cf_{slug}"
    
    # Check duplicate key
    existing = db.query(models.CustomFieldDefinition).filter(
        models.CustomFieldDefinition.company_id == current_user.company_id,
        models.CustomFieldDefinition.entity_type == field.entity_type,
        models.CustomFieldDefinition.field_key == key
    ).first()
    
    if existing:
        # If active, error. If inactive, reactivate?
        if existing.is_active:
             # Try appending random suffix
             key = f"{key}_{current_user.id}" # simplistic collision avoidance
        else:
            # Reactivate and update
            existing.is_active = True
            existing.field_label = field.field_label
            existing.field_type = field.field_type
            existing.options = field.options
            existing.is_mandatory = field.is_mandatory
            db.commit()
            db.refresh(existing)
            return existing

    new_field = models.CustomFieldDefinition(
        company_id=current_user.company_id,
        entity_type=field.entity_type,
        field_key=key,
        field_label=field.field_label,
        field_type=field.field_type,
        options=field.options,
        default_value=field.default_value,
        is_mandatory=field.is_mandatory
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field

@router.delete("/custom-fields/{field_id}")
def delete_custom_field(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(models.CustomFieldDefinition).filter(
        models.CustomFieldDefinition.id == field_id,
        models.CustomFieldDefinition.company_id == current_user.company_id
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    # Soft delete
    field.is_active = False
    db.commit()
    return {"status": "success"}
