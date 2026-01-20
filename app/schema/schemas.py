from pydantic import BaseModel, EmailStr 
from datetime import datetime
from typing import Optional, Literal
import uuid


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
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int
    tenant_id: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

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

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TaskCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreateInvite(BaseModel):
    email: EmailStr
    role: Literal['member', 'admin'] = "member"

class InviteOut(BaseModel):
    id: int
    token: uuid.UUID
    email: EmailStr
    role: str
    is_used: bool
    expires_at: datetime
    created_at: datetime
    invited_by_user_id: int

    class Config:
        from_attributes = True


class AcceptInvite(BaseModel):
    name: str  # Required field
    password: str

class TokenWithUser(BaseModel):  
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str

    class Config:
        from_attributes = True