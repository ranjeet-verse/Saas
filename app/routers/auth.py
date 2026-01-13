from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from ..schema.schemas import Token
from ..models import models
from ..core import utils, oauth2

router = APIRouter(
    tags=["Auth"]
)

@router.post('/login')
def auth_user(db: Session = Depends(get_db), user_credentials: OAuth2PasswordRequestForm = Depends()):

    user = db.query(models.User).filter(models.User.email == user_credentials.username).first()

    if not user or not utils.verify(user.password, user_credentials.password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN , detail="Invalid credentials")
    
    access_token = oauth2.create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": user.tenant_id
        }
    )
    return {"acess token": access_token, "Token_type": 'bearer'}
