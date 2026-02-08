import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import models
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import SessionLocal
from app.models import models

RATE_LIMIT= 100
WINDOW = 60

requests = defaultdict(list)

def is_rate_limited(key: str):
    now = time.time()
    requests[key] = [t for t in requests[key] if now - t < WINDOW ]

    if len(requests[key]) >= RATE_LIMIT:
        return True
    
    requests[key].append(now)
    return False



class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = None

        db: Session = SessionLocal()

        try:
            response = await call_next(request)
            status_code = response.status_code

        except Exception as exc:
            status_code = 500
            raise exc

        finally:
            process_time = round(time.time() - start_time, 3)

            user = getattr(request.state, "user", None)

            try:
                log = models.Log(
                    tenant_id=getattr(user, "tenant_id", None),
                    user_id=getattr(user, "id", None),
                    action=f"{request.method} {request.url.path}",
                    category="SYSTEM",
                    message=f"Status {status_code} | {process_time}s",
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )

                db.add(log)
                db.commit()
            except Exception as e:
                print(f"Logging error: {e}")
                db.rollback()
            finally:
                db.close()

        return response



class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print("RateLimitMiddleware HIT")
        user = getattr(request.state, "user", None)
        key = f"user:{user.id}" if user else f"ip:{request.client.host}"

        if is_rate_limited(key):
            db = SessionLocal()
            try:
                db.add(models.Log(
                    category="SECURITY",
                    action="RATE_LIMIT_EXCEEDED",
                    message=f"Key: {key}"
                ))
                db.commit()
            finally:
                db.close()

            raise HTTPException(
                status_code=429,
                detail="Too many requests"
            )

        response = await call_next(request)
        return response
