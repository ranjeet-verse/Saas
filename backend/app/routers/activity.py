from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import models
from ..core import oauth2
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter(
    prefix="/activity",
    tags=["Activity"]
)

class ActivityOut(BaseModel):
    id: int
    user_name: Optional[str]
    action: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/recent", response_model=List[ActivityOut])
async def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    logs = (
        db.query(models.Log)
        .outerjoin(models.User, models.Log.user_id == models.User.id)
        .filter(
            models.Log.tenant_id == current_user.tenant_id,
            models.Log.category == "SYSTEM",
            models.Log.action.regexp_match('POST|PUT|DELETE')
        )
        .order_by(models.Log.created_at.desc())
        .limit(10)
        .all()
    )

    activities = []
    for log in logs:
        user_name = log.user_id
        action_parts = log.action.split(' ')
        method = action_parts[0]
        path = action_parts[1]
        
        message = f"Performed {method} on {path}"
        if "/projects" in path and method == "POST":
            message = "Created a new project"
        elif "/task" in path and method == "POST":
            message = "Created a new task"
        elif method == "PUT":
            message = "Updated an item"
        elif method == "DELETE":
            message = "Deleted an item"

        activities.append({
            "id": log.id,
            "user_name": db.query(models.User).filter(models.User.id == log.user_id).first().name if log.user_id else "System",
            "action": method,
            "message": message,
            "created_at": log.created_at
        })

    return activities
