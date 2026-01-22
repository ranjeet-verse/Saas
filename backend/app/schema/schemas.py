from pydantic import BaseModel, EmailStr, field_validator, Field
from datetime import datetime
from typing import Optional, Literal
import uuid
import re
import html



class SecureBaseModel(BaseModel):
    model_config = {
        "from_attributes": True,
        "extra": "forbid",        
        "str_strip_whitespace": True
    }

    @staticmethod
    def sanitize_text(value: str) -> str:
        value = html.escape(value)          
        value = re.sub(r"\s+", " ", value)  
        return value.strip()


class CreateTenant(SecureBaseModel):
    company_name: str

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        if not (2 <= len(v) <= 100):
            raise ValueError("Company name length invalid")
        return cls.sanitize_text(v)


class TenantOut(SecureBaseModel):
    id: int
    company_name: str
    created_at: datetime


class UserSignup(SecureBaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not (2 <= len(v) <= 50):
            raise ValueError("Invalid name length")
        return cls.sanitize_text(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password too weak")
        return v


class UserInvite(SecureBaseModel):
    email: EmailStr


class UserAcceptInvite(SecureBaseModel):
    password: str


class UserOut(SecureBaseModel):
    id: int
    name: Optional[str]
    email: EmailStr
    role: str
    created_at: datetime


class SignupRequest(SecureBaseModel):
    company_name: str
    name: str
    email: EmailStr
    password: str



class Token(SecureBaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(SecureBaseModel):
    user_id: int
    tenant_id: int


class RefreshTokenRequest(SecureBaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class LogoutRequest(SecureBaseModel):
    refresh_token: str


class Me(SecureBaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    tenant_id: int


class ProjectCreate(SecureBaseModel):
    name: str
    description: str

    @field_validator("name")
    @classmethod
    def validate_project_name(cls, v):
        if not (3 <= len(v) <= 100):
            raise ValueError("Invalid project name length")
        return cls.sanitize_text(v)

    @field_validator("description")
    @classmethod
    def validate_project_description(cls, v):
        if len(v) > 500:
            raise ValueError("Description too long")
        return cls.sanitize_text(v)


class ProjectUpdate(SecureBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectOut(SecureBaseModel):
    id: int
    name: str
    description: str
    created_at: datetime



class TaskCreate(SecureBaseModel):
    title: str
    description: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if not (3 <= len(v) <= 100):
            raise ValueError("Invalid task title")
        return cls.sanitize_text(v)

    @field_validator("description")
    @classmethod
    def validate_task_desc(cls, v):
        if v and len(v) > 500:
            raise ValueError("Task description too long")
        return cls.sanitize_text(v) if v else v


class TaskOut(SecureBaseModel):
    id: int
    title: str
    description: Optional[str]
    project_id: int
    created_at: datetime


class CreateInvite(SecureBaseModel):
    email: EmailStr
    role: Literal["member", "admin"] = "member"


class InviteOut(SecureBaseModel):
    id: int
    token: uuid.UUID
    email: EmailStr
    role: str
    is_used: bool
    expires_at: datetime
    created_at: datetime
    invited_by_user_id: int


class AcceptInvite(SecureBaseModel):
    name: str
    password: str


class TokenWithUser(SecureBaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str

class ProjectMemberCreate(BaseModel):
    user_id: int = Field(..., description="User ID to add to the project")
    role: Literal["owner", "editor", "viewer"] = Field(
        default="viewer",
        description="Role of the user in the project"
    )