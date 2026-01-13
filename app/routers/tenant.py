from fastapi import APIRouter, Depends, HTTPException, status
from ..schema import schemas
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import models


router = APIRouter(
    prefix="/tenant",
    tags=["Tenant"]
)

@router.post('/', status_code=status.HTTP_201_CREATED)
def create_tenant(tenant: schemas.CreateTenant, db: Session = Depends(get_db)):

    existing_tenant = db.query(models.Tenant).filter(models.Tenant.name == tenant.name).first()
    if existing_tenant:
        raise HTTPException(status_code=409,
            detail="Tenant already exists")

    if not existing_tenant:
        new_tenant = models.Tenant(**tenant.model_dump())
        db.add(new_tenant)
        db.commit()
        db.refresh(new_tenant)
    return new_tenant

