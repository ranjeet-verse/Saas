from fastapi.responses import Response 
from starlette.middleware.base import BaseHTTPMiddleware

MAX_SIZE = 10 * 1024 * 1024

class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):

        cl = request.headers.get("content-length")

        if request.method == "POST" and cl:

            if int(cl) > MAX_SIZE:
                return Response(
                    "File too large (max 10MB)",
                    status_code=413
                )
        
        return await call_next(request)