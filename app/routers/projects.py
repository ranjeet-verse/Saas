from fastapi import APIRouter, Depends, status, HTTPException
from ..schema import schemas
from ..models import models
from ..core import oauth2
from ..database import get_db
from sqlalchemy.orm import Session
from typing import List

router = APIRouter(
    prefix="/projects",
    tags=['Projects']
)


@router.get('/', response_model=List[schemas.ProjectOut])
def see_projects(db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    projects = db.query(models.Project).filter(models.Project.tenant_id == current_user.tenant_id).all()

    return projects

@router.get('/{id}', response_model=List[schemas.ProjectOut])
def see_projects(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project = db.query(models.Project).filter(models.Project.tenant_id == current_user.tenant_id, models.Project.id == id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with id {id} not found")

    return project

@router.post('/', response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):
     

    new_project = models.Project(**project.model_dump(), tenant_id = current_user.tenant_id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return new_project

@router.put('/{id}')
def update_porject()