from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
import secrets
from sqlalchemy.orm import Session
from app.core import oauth2
from ..database import get_db
from ..models import models


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



def hash(password: str):
    return pwd_context.hash(password)


def verify(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_refresh_token():
    return secrets.token_urlsafe(64)



def require_project_roles(required_roles: list):
    def checker(
        project_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(oauth2.get_current_user),
    ):
        member = (
            db.query(models.ProjectMembers)
            .join(models.Project)
            .filter(
                models.ProjectMembers.project_id == project_id,
                models.ProjectMembers.user_id == current_user.id,
                models.Project.tenant_id == current_user.tenant_id,
                models.Project.is_deleted.is_(False),
            )
            .first()
        )

        if not member or member.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this project",
            )

        return member

    return checker



def update_project_progress(db: Session, project_id: int):
    # 1️⃣ Ensure project is active
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.is_deleted.is_(False)
    ).first()

    if not project:
        return

    # 2️⃣ Count tasks
    total_tasks = db.query(models.Task).filter(
        models.Task.project_id == project_id,
        models.Task.is_deleted.is_(False)
    ).count()

    if total_tasks == 0:
        progress = 0
    else:
        completed_tasks = db.query(models.Task).filter(
            models.Task.project_id == project_id,
            models.Task.status == "done",
            models.Task.is_deleted.is_(False)
        ).count()

        progress = int((completed_tasks / total_tasks) * 100)

    # 3️⃣ Update project
    project.progress = progress

    # 4️⃣ Commit once
    # db.commit()


