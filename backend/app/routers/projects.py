from fastapi import APIRouter, Depends, status, HTTPException, Query
from ..schema import schemas
from ..models import models
from ..core import oauth2, utils
from ..database import get_db
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_, func, extract


router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

# ===================== PROJECTS =====================

@router.get("/", response_model=List[schemas.ProjectOut])
async def see_projects(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    if current_user.role == "admin":
        # Admin sees everything in their tenant
        query = (
            db.query(models.Project, models.ProjectMembers.role.label("my_role"))
            .outerjoin(
                models.ProjectMembers,
                (models.ProjectMembers.project_id == models.Project.id) & 
                (models.ProjectMembers.user_id == current_user.id)
            )
            .filter(
                models.Project.tenant_id == current_user.tenant_id,
                models.Project.is_deleted.is_(False),
            )
        )
    else:
        # Regular user sees only projects they are members of
        query = (
            db.query(models.Project, models.ProjectMembers.role.label("my_role"))
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

    results = query.offset(offset).limit(limit).all()
    
    projects = []
    for project, my_role in results:
        # Construct the response object with role info
        p_out = schemas.ProjectOut.from_orm(project)
        p_out.my_role = my_role if my_role else ("admin" if current_user.role == "admin" else None)
        projects.append(p_out)
        
    return projects


@router.get("/{project_id}", response_model=schemas.ProjectOut)
async def see_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    project_obj = Depends(utils.require_project_access(["owner", "editor", "viewer"], allow_admin=True)),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    
    # Identify user role
    my_role = None
    if current_user.role == "admin":
        my_role = "admin"
    else:
        member = db.query(models.ProjectMembers).filter(
            models.ProjectMembers.project_id == project_id,
            models.ProjectMembers.user_id == current_user.id
        ).first()
        if member:
            my_role = member.role

    p_out = schemas.ProjectOut.from_orm(project)
    p_out.my_role = my_role
    return p_out


@router.post("/", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    new_project = models.Project(
        **project.model_dump(),
        tenant_id=current_user.tenant_id,
    )

    # Use relationship to add the owner
    new_project.members.append(
        models.ProjectMembers(
            user_id=current_user.id,
            role="owner"
        )
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.put("/{project_id}", response_model=schemas.ProjectOut)
async def update_project(
    project_id: int,
    project: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
     project_obj = Depends(utils.require_project_access(["owner", "editor"], allow_admin=True)),
):
    project_q = db.query(models.Project).filter(
        models.Project.id == project_id
    )

    project_q.update(
        project.model_dump(exclude_unset=True),
        synchronize_session=False
    )
    db.commit()

    return project_q.first()


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    project_obj = Depends(utils.require_project_access(["owner"], allow_admin=True)),
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()

    project.is_deleted = True
    db.commit()


# ===================== TASKS =====================

@router.post("/{project_id}/task", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: int,
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    project_obj = Depends(utils.require_project_access(["owner", "editor"], allow_admin=True)),
):
    
    project = db.query(models.Project).filter(
    models.Project.id == project_id).first()
    
    new_task = models.Task(
        **task.model_dump(),
        project_id=project_id,
        tenant_id=project.tenant_id,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    utils.update_project_progress(db, project_id)

    return new_task


@router.get("/{project_id}/task", response_model=List[schemas.TaskOut])
async def see_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    project_obj = Depends(utils.require_project_access(["owner", "editor", "viewer"], allow_admin=True)),
):
    return db.query(models.Task).filter(
        models.Task.project_id == project_id,
        models.Task.is_deleted.is_(False),
    ).all()


@router.put("/{project_id}/task/{task_id}", response_model=schemas.TaskOut)
async def update_task(
    project_id: int,
    task_id: int,
    task: schemas.TaskCreate,
    # current_user: models.User = Depends(oauth2.get_current_user),
    db: Session = Depends(get_db),
    project_obj = Depends(utils.require_project_access(["owner", "editor"], allow_admin=True)),):

    task_q = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
        models.Task.is_deleted.is_(False),
    )

    if not task_q.first():
        # logger.create_log(
        #     db,
        #     request,
        #     action="FORBIDDEN_DELETE_USER",
        #     category="SECURITY",
        #     message="Non-admin tried to delete a user",
        #     user_id=current_user.id,
        #     tenant_id=current_user.tenant_id)
        raise HTTPException(status_code=404, detail="Task not found")

    task_q.update(
        task.model_dump(exclude_unset=True),
        synchronize_session=False
    )
    db.commit()

    utils.update_project_progress(db, project_id)

    return task_q.first()


@router.delete("/{project_id}/task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    project_obj = Depends(utils.require_project_access(["owner"], allow_admin=True))):

    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id == project_id,
        models.Task.is_deleted.is_(False),
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_deleted = True
    db.commit()

    utils.update_project_progress(db, project_id)


# ===================== MEMBERS =====================

@router.post("/{project_id}/members")
async def add_member(
    project_id: int,
    data: schemas.ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    project_obj = Depends(utils.require_project_access(["owner"], allow_admin=True)),):

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


@router.get("/{project_id}/members", response_model=List[schemas.ProjectMemberWithUserOut])
async def members_of_project(
    project_id: int,
    db: Session = Depends(get_db),
    project_obj = Depends(utils.require_project_access(["owner", "editor", "viewer"], allow_admin=True)),
):
    members = (
        db.query(models.ProjectMembers)
        .join(models.User, models.ProjectMembers.user_id == models.User.id)
        .filter(models.ProjectMembers.project_id == project_id)
        .all()
    )
    
    return [schemas.ProjectMemberWithUserOut.from_orm(member) for member in members]

# Add to your projects router
@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
    project_obj = Depends(utils.require_project_access(["owner"], allow_admin=True)),
):
    """Remove a member from a project"""
    member = db.query(models.ProjectMembers).filter(
        models.ProjectMembers.id == member_id,
        models.ProjectMembers.project_id == project_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.role == "owner":
        owner_count = db.query(models.ProjectMembers).filter(
            models.ProjectMembers.project_id == project_id,
            models.ProjectMembers.role == "owner"
        ).count()
        if owner_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last owner from the project"
            )
    
    db.delete(member)
    db.commit()


@router.get("/stats", response_model=schemas.ProjectStatsOut)
async def get_project_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    # Base queries for projects and tasks
    project_query = db.query(models.Project).filter(
        models.Project.tenant_id == current_user.tenant_id,
        models.Project.is_deleted == False
    )
    
    task_query = db.query(models.Task).filter(
        models.Task.tenant_id == current_user.tenant_id,
        models.Task.is_deleted == False
    )

    # Filter by membership if not admin
    if current_user.role != "admin":
        project_query = project_query.join(models.ProjectMembers).filter(
            models.ProjectMembers.user_id == current_user.id
        )
        task_query = task_query.join(
            models.ProjectMembers, 
            models.Task.project_id == models.ProjectMembers.project_id
        ).filter(
            models.ProjectMembers.user_id == current_user.id
        )

    total_projects = project_query.count()
    active_tasks = task_query.filter(models.Task.status != "done").count()

    avg_progress = project_query.with_entities(func.avg(models.Project.progress)).scalar() or 0.0

    status_dist = task_query.with_entities(
        models.Task.status,
        func.count(models.Task.id)
    ).group_by(models.Task.status).all()
    
    status_distribution = [
        schemas.StatusDistribution(
            status=s, 
            count=c, 
            percentage=(c / total_projects * 100) if total_projects > 0 else 0
        ) for s, c in status_dist
    ]

    priority_dist = task_query.with_entities(
        models.Task.priority,
        func.count(models.Task.id)
    ).group_by(models.Task.priority).all()
    
    # Calculate tasks total for priority distribution
    total_tasks = sum(c for s, c in status_dist)
    priority_distribution = [
        schemas.PriorityDistribution(
            priority=p, 
            count=c, 
            percentage=(c / total_tasks * 100) if total_tasks > 0 else 0
        ) for p, c in priority_dist
    ]

    trends = project_query.with_entities(
        extract('month', models.Project.created_at).label('month_num'),
        extract('year', models.Project.created_at).label('year_num'),
        func.count(models.Project.id)
    ).group_by('year_num', 'month_num').order_by('year_num', 'month_num').limit(6).all()
    
    monthly_trends = [schemas.MonthlyTrend(month=f"{int(y)}-{int(m):02d}", count=c) for m, y, c in trends]

    # Top Projects
    top_projects = project_query.order_by(models.Project.progress.desc()).limit(5).all()

    return {
        "total_projects": total_projects,
        "active_tasks": active_tasks,
        "avg_progress": float(avg_progress),
        "status_distribution": status_distribution,
        "priority_distribution": priority_distribution,
        "monthly_trends": monthly_trends,
        "top_projects": top_projects
    }