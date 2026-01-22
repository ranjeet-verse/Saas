from passlib.context import CryptContext
from fastapi import Depends , HTTPException
import secrets
from datetime import timedelta
from app.core import oauth2 
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models

pwd_context = CryptContext(["bcrypt"], deprecated="auto")

def hash(password: str):
    return pwd_context.hash(password)

def verify(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_refresh_token():
    return secrets.token_urlsafe(64)


def require_project_roles(required_roles: list):
    def checker(project_id: int, 
                db: Session = Depends(get_db), 
                current_user: models.User = Depends(oauth2.get_current_user)):
        
        member = db.query(models.ProjectMembers).filter(models.ProjectMembers.project_id == project_id , models.ProjectMembers.user_id == current_user.id).first()

        if not member or member.role not in required_roles:
            raise HTTPException(status_code=403,
                detail="You do not have permission for this project"
            )
        return member
    return checker


