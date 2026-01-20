from fastapi import APIRouter, Depends, HTTPException
from ..schema.schemas import Me
from ..core import oauth2
from ..models import models


router = APIRouter(
    tags=["Testing"]
)


@router.post('/me', response_model=Me)
def curr_user(current_user: models.User = Depends(oauth2.get_current_user)):
    return current_user

def require_admin(user: models.User):
    if user.role != "admin":
        raise HTTPException(status_code=403)
