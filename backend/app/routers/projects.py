from fastapi import APIRouter, Depends, status, HTTPException, Query
from ..schema import schemas
from ..models import models
from ..core import oauth2, utils
from ..database import get_db
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

# PROJECTS 

@router.get("/", response_model=List[schemas.ProjectOut])
def see_projects(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    query = (
        db.query(models.Project)
        .join(models.ProjectMembers)
        .filter(
            models.ProjectMembers.user_id == current_user.id,
            models.Project.tenant_id == current_user.tenant_id,
            models.Project.is_deleted.is_(False),
        )
    )

    if search:
        query = query.filter(
            or_(
                models.Project.name.ilike(f"%{search}%"),
                models.Project.description.ilike(f"%{search}%"),
            )
        )

    return query.offset(offset).limit(limit).all()


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def see_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner", "editor", "viewer"])),
):
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.tenant_id == current_user.tenant_id,
            models.Project.is_deleted.is_(False),
        )
        .first()
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.post("/", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    new_project = models.Project(
        **project.model_dump(),
        tenant_id=current_user.tenant_id,
    )

    db.add(new_project)
    db.flush()

    db.add(
        models.ProjectMembers(
            project_id=new_project.id,
            user_id=current_user.id,
            role="owner",
        )
    )

    db.commit()
    db.refresh(new_project)
    return new_project


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    project: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner", "editor"])),
):
    project_q = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.tenant_id == current_user.tenant_id,
        models.Project.is_deleted.is_(False),
    )

    if not project_q.first():
        raise HTTPException(status_code=404, detail="Project not found")

    project_q.update(project.model_dump(exclude_unset=True), synchronize_session=False)
    db.commit()

    return project_q.first()


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner"])),
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.tenant_id == current_user.tenant_id,
        models.Project.is_deleted.is_(False),
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_deleted = True
    db.commit()


# TASKS

@router.post("/{project_id}/task", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner", "editor"])),
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.tenant_id == current_user.tenant_id,
        models.Project.is_deleted.is_(False),
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_task = models.Task(
        **task.model_dump(),
        project_id=project.id,
        tenant_id=project.tenant_id,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    utils.update_project_task(db, project_id)

    return new_task


@router.get("/{project_id}/task", response_model=List[schemas.TaskOut])
def see_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner", "editor", "viewer"])),
):
    tasks = db.query(models.Task).filter(
        models.Task.project_id == project_id,
        models.Task.tenant_id == current_user.tenant_id,
        models.Task.is_deleted.is_(False),
    ).all()

    return tasks


@router.put("/{project_id}/task/{task_id}", response_model=schemas.TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner", "editor"])),
):
    task_q = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
        models.Task.tenant_id == current_user.tenant_id,
        models.Task.is_deleted.is_(False),
    )

    if not task_q.first():
        raise HTTPException(status_code=404, detail="Task not found")

    task_q.update(task.model_dump(exclude_unset=True), synchronize_session=False)
    db.commit()

    utils.update_project_progress(db, project_id)

    return task_q.first()


@router.delete("/{project_id}/task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner"])),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
        models.Task.tenant_id == current_user.tenant_id,
        models.Task.is_deleted.is_(False),
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_deleted = True
    db.commit()
    utils.update_project_task(db, project_id)


# MEMBERS  

@router.post("/{project_id}/members")
def add_member(
    project_id: int,
    data: schemas.ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner"])),
):
    user = db.query(models.User).filter(
        models.User.id == data.user_id,
        models.User.tenant_id == current_user.tenant_id,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found in tenant")

    existing = db.query(models.ProjectMembers).filter(
        models.ProjectMembers.project_id == project_id,
        models.ProjectMembers.user_id == data.user_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="User is already a member of this project",
        )

    db.add(
        models.ProjectMembers(
            project_id=project_id,
            user_id=data.user_id,
            role=data.role,
        )
    )
    db.commit()

    return {"message": "Member added"}


@router.get("/{project_id}/members", response_model=List[schemas.ProjectMemberCreate])
def members_of_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: models.ProjectMembers = Depends(utils.require_project_roles(["owner", "editor", "viewer"])),
):
    return db.query(models.ProjectMembers).filter(
        models.ProjectMembers.project_id == project_id
    ).all()
