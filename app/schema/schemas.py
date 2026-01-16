from pydantic import BaseModel, EmailStr 
from datetime import datetime
from typing import Optional


class CreateTenant(BaseModel):
    company_name: str

class TenantOut(BaseModel):
    id: int
    company_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserInvite(BaseModel):
    email: EmailStr

class UserAcceptInvite(BaseModel):
    password: str

class UserOut(BaseModel):
    id: int
    name: Optional[str]
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class SignupRequest(BaseModel):
    company_name: str
    name: str
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int
    tenant_id: int


class Me(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    tenant_id: int

class ProjectCreate(BaseModel):
    name: str
    description: str

class ProjectOut(ProjectCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True