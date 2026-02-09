from pydantic import BaseModel, EmailStr, field_validator, Field
from datetime import datetime
from typing import Optional, Literal, List
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
    role: str


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
    company_name: Optional[str] = None


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
    progress: int
    created_at: datetime
    my_role: Optional[str] = None


class ProjectMemberOut(BaseModel):
    user_id: int
    role: str
    joined_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True



class ProjectMemberWithUserOut(BaseModel):
    id: int
    user_id: int
    role: str
    joined_at: datetime
    user_name: str
    user_email: str
    user_role: str

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Custom method to extract user info
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            role=obj.role,
            joined_at=obj.joined_at,
            user_name=obj.user.name if obj.user else "Unknown",
            user_email=obj.user.email if obj.user else "",
            user_role=obj.user.role if obj.user else ""
        )

        
class TaskCreate(SecureBaseModel):
    title: str
    description: Optional[str] = None
    status: str = Field(default="todo")
    priority: str = Field(default="medium") 

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
    status: str
    priority: str
    project_id: int
    created_at: datetime


class CreateInvite(SecureBaseModel):
    email: EmailStr
    role: Literal["member", "admin"] = "member"


class InviteOut(BaseModel):
    id: int
    email: str
    role: str
    token: uuid.UUID
    tenant_id: int
    invited_by_user_id: int
    is_used: bool
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None
    accepted_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True


class AcceptInvite(SecureBaseModel):
    name: str
    password: str


class TokenWithUser(SecureBaseModel):
    user: UserOut  # Make sure UserOut is defined above this
    access_token: str
    refresh_token: str
    token_type: str

class ProjectMemberCreate(BaseModel):
    user_id: int = Field(..., description="User ID to add to the project")
    role: Literal["owner", "editor", "viewer"] = Field(
        default="viewer",
        description="Role of the user in the project"
    )

# Message Schemas
class ConversationParticipantBase(BaseModel):
    user_id: int
    user: Optional["UserOut"] = None
    
    class Config:
        from_attributes = True

class ConversationParticipantOut(ConversationParticipantBase):
    id: int
    conversation_id: int
    joined_at: datetime

class ConversationBase(BaseModel):
    id: int
    is_group: bool = False
    name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ConversationOut(ConversationBase):
    participants: List[ConversationParticipantOut] = []
    messages: List["MessageOut"] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_message: Optional["MessageOut"] = None

class CreateConversation(SecureBaseModel):
    user_id: int
    is_group: Optional[bool] = False
    name: Optional[str] = None
    participant_ids: Optional[List[int]] = None  

class MessageBase(BaseModel):
    content: str
    
    class Config:
        from_attributes = True

class MessageOut(MessageBase):
    id: int
    conversation_id: int
    sender_id: int
    sender: Optional["UserOut"] = None
    created_at: datetime
    is_read: bool

class CreateMessage(SecureBaseModel):
    content: str

# Update UserOut to include last_message_seen if needed
# class UserOut(BaseModel):
#     id: int
#     email: str
#     created_at: datetime
#     first_name: Optional[str] = None
#     last_name: Optional[str] = None
#     avatar_url: Optional[str] = None
#     last_message_seen: Optional[datetime] = None
    
#     class Config:
#         from_attributes = True

class FileOut(BaseModel):
    id: int
    filename: str
    size: int
    is_shared: bool
    uploaded_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class MonthlyTrend(BaseModel):
    month: str
    count: int

class PriorityDistribution(BaseModel):
    priority: str
    count: int

class StatusDistribution(BaseModel):
    status: str
    count: int

class ProjectStatsOut(BaseModel):
    total_projects: int
    active_tasks: int
    avg_progress: float
    status_distribution: List[StatusDistribution]
    priority_distribution: List[PriorityDistribution]
    monthly_trends: List[MonthlyTrend]
    top_projects: List[ProjectOut]



class DashboardMetrics(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    total_team_members: int
    completion_rate: float
    average_project_progress: float

    class Config:
        from_attributes = True


class ProjectAnalytics(BaseModel):
    project_id: int
    project_name: str
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float
    progress: int
    team_size: int
    created_at: datetime
    deadline: Optional[datetime]

    class Config:
        from_attributes = True


class UserProductivity(BaseModel):
    user_id: int
    user_name: str
    email: str
    assigned_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    completion_rate: float
    overdue_tasks: int
    avg_completion_time_days: Optional[float]

    class Config:
        from_attributes = True


class TimeSeriesData(BaseModel):
    date: str
    value: int

    class Config:
        from_attributes = True


class TaskStatusDistribution(BaseModel):
    status: str
    count: int
    percentage: float

    class Config:
        from_attributes = True


class PriorityDistribution(BaseModel):
    priority: str
    count: int
    percentage: float

    class Config:
        from_attributes = True