from fastapi import APIRouter, Depends, HTTPException, status
from ..schema import schemas
from ..database import get_db
from sqlalchemy.orm import Session
from ..models import models
from ..core import utils


router = APIRouter(
    prefix="/user",
    tags=["User"]
)

@router.post('/', status_code=status.HTTP_201_CREATED, response_model=schemas.UserOut)
def new_user(user: schemas.UserCreate, db:Session = Depends(get_db)):

    existin_user = db.query(models.User).filter(models.User.email == user.email).first()

    if existin_user:
        raise HTTPException(status_code=409, detail="User already exists")
    if not existin_user:
        hashed_password = utils.hash(user.password)
        user.password = hashed_password
        new_user = models.User(**user.model_dump())
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    return new_user