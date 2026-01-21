from passlib.context import CryptContext
import secrets
from datetime import timedelta


pwd_context = CryptContext(["bcrypt"], deprecated="auto")

def hash(password: str):
    return pwd_context.hash(password)

def verify(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_refresh_token():
    return secrets.token_urlsafe(64)


