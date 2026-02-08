from .core import logging, config
from fastapi import FastAPI
from .database import engine
from .models import models
from fastapi.middleware.cors import CORSMiddleware

from .routers import user, auth, me, projects, invite, messaging, files, activity


models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(logging.LoggingMiddleware)
app.add_middleware(logging.RateLimitMiddleware)
app.add_middleware(config.LimitUploadSizeMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get('/')
def home():
    return "Hello Here resides my Saas"

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(projects.router)
app.include_router(invite.router)
app.include_router(messaging.router)
app.include_router(files.router)
app.include_router(activity.router)