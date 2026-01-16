from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from .. import database
from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from ..schema import schemas
from ..models import models



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

SECRET_KEY = ""
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encode_jwt

def verify_access_token(token: str, credentials_exception):
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id: str = payload.get('sub')
        tenant_id: int = payload.get('tenant_id')
        if user_id is None or tenant_id is None:
            raise credentials_exception
        
        token_data = schemas.TokenData(user_id= int(user_id),
                               tenant_id=tenant_id) 
    except JWTError:
            raise credentials_exception
    return token_data

def get_current_user(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException( status_code=401, 
        detail="Invalid Credentials",  
        headers={'WWW-Authenticate': 'Bearer'} 
    )

    token_data = verify_access_token(token, credentials_exception)

    user = db.query(models.User).filter(models.User.id == token_data.user_id, models.User.tenant_id == token_data.tenant_id).first()

    if user is None:
         raise credentials_exception
    
    return user
    
    