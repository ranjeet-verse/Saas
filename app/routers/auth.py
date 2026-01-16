from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from ..schema.schemas import Token, SignupRequest
from ..models import models
from ..core import utils, oauth2

router = APIRouter(
    tags=["Tenant"]
)

@router.post('/login', response_model=Token)
def auth_user(db: Session = Depends(get_db), user_credentials: OAuth2PasswordRequestForm = Depends()):

    user = db.query(models.User).filter(models.User.email == user_credentials.username).first()

    if not user or not utils.verify(user_credentials.password, user.password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN , detail="Invalid credentials")
    
    access_token = oauth2.create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": user.tenant_id
        }
    )
    return {
    "access_token": access_token,
    "token_type": "bearer"
    }


@router.post('/admin', response_model=Token, status_code=status.HTTP_201_CREATED)
def admin(data: SignupRequest, db: Session = Depends(get_db)):

    existing_tentant = db.query(models.Tenant).filter(models.Tenant.company_name == data.company_name).first()
    if existing_tentant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, details="Company already Exists")
    
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, details="Email already Exists")
  
    new_tenant = models.Tenant(company_name=data.company_name)
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    hashed_password = utils.hash(data.password)

    admin_user = models.User(
        name=data.name,
        email=data.email,
        password=hashed_password,
        tenant_id=new_tenant.id,
        role="admin",
        is_active=True
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    access_token = oauth2.create_access_token(
        data={
            "sub": str(admin_user.id),
            "tenant_id": new_tenant.id,
            "role": "admin"
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

    
