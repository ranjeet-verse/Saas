from fastapi import APIRouter, Depends, status, HTTPException, Query
from ..schema import schemas
from ..models import models
from ..core import oauth2
from ..database import get_db
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

router = APIRouter(
    prefix="/projects",
    tags=['Projects']
)


@router.get('/', response_model=List[schemas.ProjectOut])
def see_projects(limit: int = Query(default=10, ge=1, le=100),
                offset: int = Query(default=0, ge=0),
                search: Optional[str] = None,
                db: Session = Depends(get_db),
                current_user: models.User = Depends(oauth2.get_current_user)):

    query = db.query(models.Project).filter(models.Project.tenant_id == current_user.tenant_id)

    if search:
        query = query.filter(or_(
                models.Project.name.ilike(f"%{search}%"),
                models.Project.description.ilike(f"%{search}%")))
    
    projects = query.limit(limit).offset(offset).all()

    return projects


@router.get('/{id}', response_model=schemas.ProjectOut)
def see_project(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project = db.query(models.Project).filter(
        models.Project.tenant_id == current_user.tenant_id, 
        models.Project.id == id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with id {id} not found")

    return project


@router.post('/', response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):
     
    new_project = models.Project(**project.model_dump(), tenant_id=current_user.tenant_id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return new_project


@router.put('/{id}', response_model=schemas.ProjectOut)
def update_project(id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project_query = db.query(models.Project).filter(
        models.Project.id == id, 
        models.Project.tenant_id == current_user.tenant_id
    )

    if not project_query.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail=f"Project with id {id} was not found")
    
    project_query.update(project.model_dump(exclude_unset=True), synchronize_session=False)
    db.commit()
    
    return project_query.first()


@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_project(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project_query = db.query(models.Project).filter(
        models.Project.id == id, 
        models.Project.tenant_id == current_user.tenant_id
    )
    
    project = project_query.first()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail=f"Project with id {id} was not found")

    project_query.delete(synchronize_session=False)
    db.commit()
    
    return None  


@router.post('/{project_id}/task', response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(project_id: int,
    task: schemas.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(oauth2.get_current_user)):

    project = db.query(models.Project).filter(models.Project.id == project_id,
                models.Project.tenant_id == current_user.tenant_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project Not Found")

    new_task = models.Task(**task.model_dump(), 
                        project_id = project.id, tenant_id = project.tenant_id)

    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@router.get('/{project_id}/task', response_model=List[schemas.TaskOut])
def see_tasks(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.tenant_id == current_user.tenant_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Project not found")
    
    task = db.query(models.Task).filter(models.Task.project_id == project_id, models.Task.tenant_id == current_user.tenant_id).all()

    return task



@router.put('/{project_id}/task/{id}', response_model=schemas.TaskOut)
def update_task(project_id: int,id: int, task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project = db.query(models.Project).filter(models.Project.id == project_id , models.Project.tenant_id == current_user.tenant_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail="Project Not Found")
    
    task_query = db.query(models.Task).filter(models.Task.id == id, models.Task.project_id == project_id, models.Task.tenant_id == current_user.tenant_id)

    if not task_query.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail="Task not found")

    task_query.update(task.model_dump(exclude_unset=True), synchronize_session=False)
    db.commit()
    return task_query.first()

@router.delete('/{project_id}/task/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_task(id: int, project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):

    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.tenant_id == current_user.tenant_id).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail="Project Not Found")
    
    task = db.query(models.Task).filter(models.Task.id == id, models.Task.project_id == project_id, models.Task.tenant_id == current_user.tenant_id)

    if not task.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail="Task Not Found")
    
    task.delete(synchronize_session=False)
    db.commit()

    return None
