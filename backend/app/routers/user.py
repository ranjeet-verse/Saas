from fastapi import APIRouter, Depends, HTTPException, status
from ..schema import schemas
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import models
from ..core import utils, oauth2


router = APIRouter(
    prefix="/user",
    tags=["User"]
)

@router.post('/', status_code=status.HTTP_201_CREATED, response_model=schemas.UserOut)
def new_user(user: schemas.UserSignup, db:Session = Depends(get_db), current_user: models.User= Depends(oauth2.get_current_user)):

    existin_user = db.query(models.User).filter(models.User.email == user.email,
                                                models.User.tenant_id == current_user.tenant_id).first()
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You're Not Allowed To Perform This Action")

    if existin_user:
        raise HTTPException(status_code=409, detail="User already exists")
    if not existin_user:
        hashed_password = utils.hash(user.password)
        user.password = hashed_password
        new_user = models.User(**user.model_dump(), tenant_id = current_user.tenant_id)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    return new_user