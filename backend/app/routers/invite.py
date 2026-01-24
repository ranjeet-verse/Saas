from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from ..database import get_db
import uuid
from ..schema import schemas
from ..core import oauth2, utils, email
from ..models import models
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone



router = APIRouter(
    prefix="/invite",
    tags=['User Invite']
)

VALID_ROLES = ["admin", "editor", "viewer", "member"]

@router.post('/', response_model=schemas.InviteOut)
def invite_user(invite: schemas.CreateInvite, 
                background_tasks: BackgroundTasks , 
                db: Session = Depends(get_db), 
                current_user: models.User = Depends(oauth2.get_current_user)):

    print(f"DEBUG: Current user role: {current_user.role}")
    print(f"DEBUG: Invited user role: {invite.role}")

    if current_user.role.lower() not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can invite users"
    )

    if invite.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"
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
        # name=None,
        email=invite.email,
        role=invite.role,
        tenant_id=current_user.tenant_id,
        invited_by_user_id=current_user.id,
        expires_at= datetime.now(timezone.utc) + timedelta(days=7)
    )

    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    invite_link = f"http://localhost:3000/accept-invite?token={new_invite.token}"

    background_tasks.add_task(
        email.send_invitation_email,
        to_email=invite.email,
        invite_link=invite_link,
        invited_by=current_user.name,
        company_name=new_invite.tenant.company_name)
    
    return new_invite



@router.post('/accept/{token}', response_model=schemas.TokenWithUser)
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
        name=invite.name,
        email=invitation.email, 
        password=hashed_password,
        tenant_id=invitation.tenant_id,
        role=invitation.role,
        is_active=True
    )

    db.add(new_user)
    db.flush()


    invitation.is_used = True
    invitation.accepted_at = datetime.now(timezone.utc)
    invitation.accepted_by_user_id = new_user.id

    db.commit()
    db.refresh(new_user)


    access_token = oauth2.create_access_token(
        data={
            "sub": str(new_user.id),
            "tenant_id": new_user.tenant_id,
            "role": new_user.role
        }
    )
    refresh_token = utils.create_refresh_token()

    db.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=new_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
    )
    db.commit()

    return {
        "user": new_user,                 
        "access_token": access_token,
        "refresh_token": refresh_token,  
        "token_type": "bearer"
    }
