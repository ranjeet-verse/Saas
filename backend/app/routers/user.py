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

# Add to your user router
@router.get("/", response_model=list[schemas.UserOut])
async def get_tenant_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Get all users in the current tenant"""
    users = db.query(models.User).filter(
        models.User.tenant_id == current_user.tenant_id,
        models.User.is_active == True
    ).all()
    return users
# @router.post('/', status_code=status.HTTP_201_CREATED, response_model=schemas.UserOut)
# def new_user(user: schemas.UserSignup, db:Session = Depends(get_db), current_user: models.User= Depends(oauth2.get_current_user)):

#     existin_user = db.query(models.User).filter(models.User.email == user.email,
#                                                 models.User.tenant_id == current_user.tenant_id).first()
    
#     if current_user.role != "admin":
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You're Not Allowed To Perform This Action")

#     if existin_user:
#         raise HTTPException(status_code=409, detail="User already exists")
#     if not existin_user:
#         hashed_password = utils.hash(user.password)
#         user.password = hashed_password
#         new_user = models.User(**user.model_dump(), tenant_id = current_user.tenant_id)
#         db.add(new_user)
#         db.commit()
#         db.refresh(new_user)
#     return new_user


@router.delete("/delete/{user_id}")
def delete_user(user_id: int , db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    if current_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete users"
        )
    
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete yourself"
        )

    user = db.query(models.User).filter(
        models.User.id == user_id, 
        models.User.tenant_id == current_user.tenant_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in this tenant"
        )
    if user.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner account cannot be deleted"
        )
    

    db.delete(user)
    db.commit()
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id
    }
    