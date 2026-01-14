from fastapi import FastAPI, Depends
from .database import engine
from .models import models

from .routers import tenant, user, auth


models.Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get('/')
def home():
    return "Hello Here resides my Saas"

app.include_router(tenant.router)
app.include_router(user.router)
app.include_router(auth.router)