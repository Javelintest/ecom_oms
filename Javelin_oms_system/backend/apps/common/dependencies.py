from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from . import models, security, SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/oms/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Dependency to get the current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

class AppAccessChecker:
    def __init__(self, app_code: str):
        self.app_code = app_code

    def __call__(self, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
        # 1. Check if user is active in a company (Company Activated)
        if not current_user.company_id:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="User does not belong to an active organization context."
            )
            
        # 2. Check if App is Enabled for this Company
        app = db.query(models.Application).filter(models.Application.code == self.app_code).first()
        if not app:
             raise HTTPException(status_code=500, detail=f"Application definition for '{self.app_code}' not found.")
             
        # Check CompanyApp Is Active
        company_app = db.query(models.CompanyApp).filter(
            models.CompanyApp.company_id == current_user.company_id,
            models.CompanyApp.app_id == app.id,
            models.CompanyApp.is_active == 1
        ).first()

        if not company_app:
             print(f"DEBUG: AppAccessChecker FAILED. User Company: {current_user.company_id}, App: {self.app_code} (ID: {app.id}) -> Not Active/Found.")
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"The '{app.name}' application is not enabled for your organization."
            )
            
        return current_user
