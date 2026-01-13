from pydantic import BaseModel, EmailStr 
from datetime import datetime


class CreateTenant(BaseModel):
    name: str

class TenantOutput(CreateTenant):
    id: int

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    tenant_id: int

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    pass