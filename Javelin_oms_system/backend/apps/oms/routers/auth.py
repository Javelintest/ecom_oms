from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.apps.common import SessionLocal, models, security
from backend.apps.common.dependencies import get_db, get_current_user, oauth2_scheme
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/auth", tags=["authentication"])


# --- Company Schemas ---

class CompanyCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    zip_code: Optional[str] = None
    
    # Legal
    tax_id: Optional[str] = None
    currency: Optional[str] = "INR"
    timezone: Optional[str] = "Asia/Kolkata"

class CompanyResponse(CompanyCreate):
    id: int
    
    class Config:
        from_attributes = True

# --- User Schemas ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    company_id: Optional[int] = None
    company: Optional[CompanyResponse] = None # Added nested company
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = security.get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}



# --- Company Onboarding Endpoints ---

# (Schemas moved to top)

@router.post("/setup-company", response_model=CompanyResponse)
def setup_company(company_data: CompanyCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new company and link to current user as owner"""
    # Create Company
    new_company = models.Company(**company_data.dict())
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    
    # Create Link
    membership = models.UserCompany(
        user_id=current_user.id,
        company_id=new_company.id,
        role="owner"
    )
    db.add(membership)
    
    # Set as active if none set
    if not current_user.company_id:
        current_user.company_id = new_company.id
        
    db.commit()
    db.refresh(new_company)
    
    return new_company

@router.get("/my-companies")
def get_my_companies(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all companies the user belongs to"""
    memberships = db.query(models.UserCompany).filter(models.UserCompany.user_id == current_user.id).all()
    companies = []
    for m in memberships:
        c = db.query(models.Company).filter(models.Company.id == m.company_id).first()
        if c:
            companies.append({
                "id": c.id,
                "name": c.name,
                "role": m.role,
                "is_active": c.id == current_user.company_id
            })
    return companies

@router.post("/switch-company/{company_id}")
def switch_company(company_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Switch active company context"""
    membership = db.query(models.UserCompany).filter(
        models.UserCompany.user_id == current_user.id,
        models.UserCompany.company_id == company_id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this company")
        
    current_user.company_id = company_id
    db.commit()
    return {"status": "success", "active_company_id": company_id}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
