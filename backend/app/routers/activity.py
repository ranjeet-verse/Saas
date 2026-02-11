from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
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
    # Join with User to get names in one go
    results = (
        db.query(models.Log, models.User.name)
        .outerjoin(models.User, models.Log.user_id == models.User.id)
        .filter(
            models.Log.tenant_id == current_user.tenant_id,
            models.Log.category == "SYSTEM"
        )
        .filter(
            or_(
                models.Log.action.like('POST%'),
                models.Log.action.like('PUT%'),
                models.Log.action.like('DELETE%')
            )
        )
        .order_by(models.Log.created_at.desc())
        .limit(10)
        .all()
    )

    activities = []
    for log, user_name in results:
        action_parts = log.action.split(' ')
        method = action_parts[0] if action_parts else "UNKNOWN"
        path = action_parts[1] if len(action_parts) > 1 else ""
        
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
            "user_name": user_name or "System",
            "action": method,
            "message": message,
            "created_at": log.created_at
        })

    return activities
