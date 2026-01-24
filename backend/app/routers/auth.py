from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from ..schema.schemas import Token, SignupRequest, RefreshTokenRequest ,LogoutRequest

from ..models import models
from ..core import utils, oauth2
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/auth",
                    tags=["Tenant"])

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
    refresh_token = utils.create_refresh_token()

    db.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
    )
    db.commit()

    return {
    "access_token": access_token,
    "refresh_token": refresh_token,
    "token_type": "bearer"
    }

@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(data: LogoutRequest, db: Session = Depends(get_db)):

    token_record = db.query(models.RefreshToken).filter(models.RefreshToken.token == data.refresh_token).first()

    if not token_record:
        return
    
    db.delete(token_record)
    db.commit()




@router.post('/admin', response_model=RefreshTokenRequest, status_code=status.HTTP_201_CREATED)
def admin(data: SignupRequest, db: Session = Depends(get_db)):

    existing_tentant = db.query(models.Tenant).filter(models.Tenant.company_name == data.company_name).first()
    if existing_tentant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company already Exists")
    
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already Exists")
  
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
    
    refresh_token = utils.create_refresh_token()

    db.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=admin_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
    )
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

    
@router.post("/refresh", response_model= Token)
def refresh_access_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    token_record = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == data.refresh_token,
            models.RefreshToken.expires_at > datetime.now(timezone.utc)
        )
        .first()
    )

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user = token_record.user

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    new_access_token = oauth2.create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": user.tenant_id,
            "role": user.role
        }
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }
