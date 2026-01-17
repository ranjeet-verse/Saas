from fastapi import APIRouter, Depends, HTTPException, status
from ..database import get_db
import uuid
from ..schema import schemas
from ..core import oauth2, utils
from ..models import models
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone


router = APIRouter(
    prefix="/invite",
    tags=['User Invite']
)

@router.post('/', response_model=schemas.InviteOut)
def invite_user(invite: schemas.CreateInvite, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can invite users"
        )
    
    existing_user = db.query(models.User).filter(models.User.email == invite.email, models.User.tenant_id == current_user.tenant_id).first()

    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="User with this email already exists in your organization")
    
    existing_invite = db.query(models.Invitation).filter(models.Invitation.email == invite.email, 
    models.Invitation.tenant_id == current_user.tenant_id,
    models.Invitation.is_used == False,
    models.Invitation.expires_at > datetime.now(timezone.utc)).first()

    if existing_invite:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="An active invitation already exists for this email")
    
    new_invite = models.Invitation(
        name=invite.name,
        email=invite.email,
        role=invite.role,
        tenant_id=current_user.tenant_id,
        invited_by_user_id=current_user.id,
        expires_at= datetime.now(timezone.utc) + timedelta(days=7)
    )

    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)
    return new_invite

@router.post('/{token}', response_model=schemas.TokenWithUser)
def accept_invite(
    token: uuid.UUID,  
    invite: schemas.AcceptInvite,  
    db: Session = Depends(get_db)
):
    
    
    invitation = db.query(models.Invitation).filter(
        models.Invitation.token == token, 
        models.Invitation.is_used == False, 
        models.Invitation.expires_at > datetime.now(timezone.utc)
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation"
        )
    
   
    if invite.email != invitation.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match the invitation"
        )
    
   
    existing_user = db.query(models.User).filter(
        models.User.email == invitation.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    
    hashed_password = utils.hash(invite.password) 

    
    new_user = models.User( 
        name=invitation.name, 
        email=invite.email, 
        password=hashed_password,
        tenant_id=invitation.tenant_id,  
        role=invitation.role  
    )

    db.add(new_user)
    db.flush()  


    invitation.is_used= True
    invitation.accepted_at = datetime.now(timezone.utc)
    invitation.accepted_by_user_id = new_user.id

    db.commit()
    db.refresh(new_user)

    access_token = oauth2.create_access_token(
        data={
            "sub":str(new_user.id),
            "tenant_id": new_user.tenant_id,
            "role": new_user.role
        }
    )


    return {
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "tenant_id": new_user.tenant_id,
            "role": new_user.role
        },
        "access_token": access_token,
        "token_type": "bearer"
    }
    




    