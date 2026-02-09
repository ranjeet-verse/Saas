from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, cast, Date, extract
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pydantic import BaseModel
from ..database import get_db
from ..models import models
from app.core import oauth2
from ..schema import schemas


router = APIRouter(prefix="/analytics",
                   tags=["Analytics"])


@router.get("/dashboard", response_model=schemas.DashboardMetrics)
async def get_dashboard_metrics(db: Session = Depends(get_db),
                                current_user: models.User = Depends(oauth2.get_current_user)):
    
    tenant_id = current_user.tenant_id

    total_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted.is_(False)
    ).count()

    active_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.status == 'active',
        models.Project.is_deleted.is_(False)
    ).count()

    completed_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.status == 'completed',
        models.Project.is_deleted.is_(False)
    ).count()

    total_tasks = db.query(models.Task).join(
        models.Project).filter(
            models.Project.tenant_id == tenant_id,
            models.Project.is_deleted.is_(False)
        ).count()
    
    completed_tasks = db.query(models.Task).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.status == "done",
        models.Project.is_deleted.is_(False)
    ).count()

    pending_tasks = db.query(models.Task).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.status == "pending",
        models.Project.is_deleted.is_(False)
    ).count()

    today = datetime.now(timezone.utc)
    overdue_tasks = db.query(models.Task).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.due_date < today,
        models.Task.status != 'done',
        models.Project.is_deleted.is_(False)
    ).count()

    total_team_members = db.query(models.User).filter(
        models.User.tenant_id == tenant_id,
        models.User.is_active.is_(True)
    ).count()

    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    avg_progress = db.query(
        func.avg(models.Project.progress)
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted.is_(False)
    ).scalar() or 0 

    return schemas.DashboardMetrics(
        total_projects=total_projects,
        active_projects=active_projects,
        completed_projects=completed_projects,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        overdue_tasks=overdue_tasks,
        total_team_members=total_team_members,
        completion_rate=round(completion_rate, 2),
        average_project_progress=round(avg_progress, 2)
    )



@router.get("/projects", response_model=List[schemas.ProjectAnalytics])
async def get_projects_analytics(
    status: Optional[str] = Query(None, description="Filter by project status"),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get detailed analytics for all projects
    """
    tenant_id = current_user.tenant_id
    today = datetime.utcnow()

    # Base query
    query = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted.is_(False)
    )

    if status:
        query = query.filter(models.Project.status == status)

    projects = query.limit(limit).all()

    result = []
    for project in projects:
        # Task counts
        total_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.is_deleted.is_(False)
        ).count()

        completed_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.status == "done",
            models.Task.is_deleted.is_(False)
        ).count()

        in_progress_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.status == "in_progress",
            models.Task.is_deleted.is_(False)
        ).count()

        pending_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.status == "pending",
            models.Task.is_deleted.is_(False)
        ).count()

        overdue_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.due_date < today,
            models.Task.status != "done",
            models.Task.is_deleted.is_(False)
        ).count()

        # Team size
        team_size = db.query(models.ProjectMembers).filter(
            models.ProjectMembers.project_id == project.id
        ).count()

        # Completion rate
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        result.append(schemas.ProjectAnalytics(
            project_id=project.id,
            project_name=project.name,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            in_progress_tasks=in_progress_tasks,
            pending_tasks=pending_tasks,
            overdue_tasks=overdue_tasks,
            completion_rate=round(completion_rate, 2),
            progress=project.progress,
            team_size=team_size,
            created_at=project.created_at,
            deadline=project.deadline
        ))

    return result


@router.get("/projects/{project_id}", response_model=schemas.ProjectAnalytics)
async def get_project_analytics(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get detailed analytics for a specific project
    """
    tenant_id = current_user.tenant_id
    today = datetime.utcnow()

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted.is_(False)
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Task counts
    total_tasks = db.query(models.Task).filter(
        models.Task.project_id == project.id,
        models.Task.is_deleted.is_(False)
    ).count()

    completed_tasks = db.query(models.Task).filter(
        models.Task.project_id == project.id,
        models.Task.status == "done",
        models.Task.is_deleted.is_(False)
    ).count()

    in_progress_tasks = db.query(models.Task).filter(
        models.Task.project_id == project.id,
        models.Task.status == "in_progress",
        models.Task.is_deleted.is_(False)
    ).count()

    pending_tasks = db.query(models.Task).filter(
        models.Task.project_id == project.id,
        models.Task.status == "pending",
        models.Task.is_deleted.is_(False)
    ).count()

    overdue_tasks = db.query(models.Task).filter(
        models.Task.project_id == project.id,
        models.Task.due_date < today,
        models.Task.status != "done",
        models.Task.is_deleted.is_(False)
    ).count()

    # Team size
    team_size = db.query(models.ProjectMembers).filter(
        models.ProjectMembers.project_id == project.id
    ).count()

    # Completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    return schemas.ProjectAnalytics(
        project_id=project.id,
        project_name=project.name,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        pending_tasks=pending_tasks,
        overdue_tasks=overdue_tasks,
        completion_rate=round(completion_rate, 2),
        progress=project.progress,
        team_size=team_size,
        created_at=project.created_at,
        deadline=project.deadline
    )


# ============================================================================
# USER PRODUCTIVITY
# ============================================================================

@router.get("/users/productivity", response_model=List[schemas.UserProductivity])
async def get_users_productivity(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get productivity metrics for all users in the tenant
    """
    tenant_id = current_user.tenant_id
    today = datetime.utcnow()

    users = db.query(models.User).filter(
        models.User.tenant_id == tenant_id,
        models.User.is_active.is_(True)
    ).limit(limit).all()

    result = []
    for user in users:
        # Task counts
        assigned_tasks = db.query(models.Task).join(
            models.Project
        ).filter(
            models.Task.assigned_to == user.id,
            models.Project.tenant_id == tenant_id,
            models.Task.is_deleted.is_(False)
        ).count()

        completed_tasks = db.query(models.Task).join(
            models.Project
        ).filter(
            models.Task.assigned_to == user.id,
            models.Project.tenant_id == tenant_id,
            models.Task.status == "done",
            models.Task.is_deleted.is_(False)
        ).count()

        in_progress_tasks = db.query(models.Task).join(
            models.Project
        ).filter(
            models.Task.assigned_to == user.id,
            models.Project.tenant_id == tenant_id,
            models.Task.status == "in_progress",
            models.Task.is_deleted.is_(False)
        ).count()

        overdue_tasks = db.query(models.Task).join(
            models.Project
        ).filter(
            models.Task.assigned_to == user.id,
            models.Project.tenant_id == tenant_id,
            models.Task.due_date < today,
            models.Task.status != "done",
            models.Task.is_deleted.is_(False)
        ).count()

        # Completion rate
        completion_rate = (completed_tasks / assigned_tasks * 100) if assigned_tasks > 0 else 0

        # Average completion time (for completed tasks)
        avg_time = db.query(
            func.avg(
                extract('epoch', models.Task.updated_at - models.Task.created_at) / 86400.0
            )
        ).join(
            models.Project
        ).filter(
            models.Task.assigned_to == user.id,
            models.Project.tenant_id == tenant_id,
            models.Task.status == "done",
            models.Task.is_deleted.is_(False)
        ).scalar()

        result.append(schemas.UserProductivity(
            user_id=user.id,
            user_name=user.name,
            email=user.email,
            assigned_tasks=assigned_tasks,
            completed_tasks=completed_tasks,
            in_progress_tasks=in_progress_tasks,
            completion_rate=round(completion_rate, 2),
            overdue_tasks=overdue_tasks,
            avg_completion_time_days=round(avg_time, 2) if avg_time else None
        ))

    return result


# ============================================================================
# TIME SERIES DATA
# ============================================================================

@router.get("/tasks/timeline", response_model=List[schemas.TimeSeriesData])
async def get_tasks_timeline(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get task creation timeline (tasks created per day)
    """
    tenant_id = current_user.tenant_id
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Query tasks grouped by date
    tasks_by_date = db.query(
        cast(models.Task.created_at, Date).label('date'),
        func.count(models.Task.id).label('count')
    ).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.created_at >= start_date,
        models.Task.is_deleted.is_(False)
    ).group_by(
        cast(models.Task.created_at, Date)
    ).all()

    # Convert to dict for easy lookup
    data_dict = {str(row.date): row.count for row in tasks_by_date}

    # Fill in missing dates with 0
    result = []
    current_date = start_date.date()
    while current_date <= end_date.date():
        date_str = str(current_date)
        result.append(schemas.TimeSeriesData(
            date=date_str,
            value=data_dict.get(date_str, 0)
        ))
        current_date += timedelta(days=1)

    return result


@router.get("/tasks/completion-timeline", response_model=List[schemas.TimeSeriesData])
async def get_tasks_completion_timeline(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get task completion timeline (tasks completed per day)
    """
    tenant_id = current_user.tenant_id
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Query completed tasks grouped by date
    tasks_by_date = db.query(
        cast(models.Task.updated_at, Date).label('date'),
        func.count(models.Task.id).label('count')
    ).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.status == "done",
        models.Task.updated_at >= start_date,
        models.Task.is_deleted.is_(False)
    ).group_by(
        cast(models.Task.updated_at, Date)
    ).all()

    # Convert to dict
    data_dict = {str(row.date): row.count for row in tasks_by_date}

    # Fill in missing dates
    result = []
    current_date = start_date.date()
    while current_date <= end_date.date():
        date_str = str(current_date)
        result.append(schemas.TimeSeriesData(
            date=date_str,
            value=data_dict.get(date_str, 0)
        ))
        current_date += timedelta(days=1)

    return result



@router.get("/tasks/status-distribution", response_model=List[schemas.TaskStatusDistribution])
async def get_task_status_distribution(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get distribution of tasks by status
    """
    tenant_id = current_user.tenant_id

    # Base query
    query = db.query(
        models.Task.status,
        func.count(models.Task.id).label('count')
    ).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.is_deleted.is_(False)
    )

    if project_id:
        query = query.filter(models.Task.project_id == project_id)

    status_counts = query.group_by(models.Task.status).all()

    # Calculate total for percentages
    total = sum(row.count for row in status_counts)

    result = []
    for row in status_counts:
        percentage = (row.count / total * 100) if total > 0 else 0
        result.append(schemas.TaskStatusDistribution(
            status=row.status,
            count=row.count,
            percentage=round(percentage, 2)
        ))

    return result


@router.get("/tasks/priority-distribution", response_model=List[schemas.PriorityDistribution])
async def get_task_priority_distribution(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Get distribution of tasks by priority
    """
    tenant_id = current_user.tenant_id

    # Base query
    query = db.query(
        models.Task.priority,
        func.count(models.Task.id).label('count')
    ).join(
        models.Project
    ).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.is_deleted.is_(False)
    )

    if project_id:
        query = query.filter(models.Task.project_id == project_id)

    priority_counts = query.group_by(models.Task.priority).all()

    # Calculate total for percentages
    total = sum(row.count for row in priority_counts)

    result = []
    for row in priority_counts:
        percentage = (row.count / total * 100) if total > 0 else 0
        result.append(schemas.PriorityDistribution(
            priority=row.priority or "none",
            count=row.count,
            percentage=round(percentage, 2)
        ))

    return result


@router.get("/projects/health-score")
async def get_project_health_scores(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Calculate health scores for projects based on multiple factors:
    - Progress vs time remaining
    - Overdue tasks
    - Task completion rate
    - Team activity
    """
    tenant_id = current_user.tenant_id
    today = datetime.utcnow()

    projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted.is_(False),
        models.Project.status == "active"
    ).all()

    result = []
    for project in projects:
        # Calculate various health metrics
        total_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.is_deleted.is_(False)
        ).count()

        if total_tasks == 0:
            continue

        completed_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.status == "done",
            models.Task.is_deleted.is_(False)
        ).count()

        overdue_tasks = db.query(models.Task).filter(
            models.Task.project_id == project.id,
            models.Task.due_date < today,
            models.Task.status != "done",
            models.Task.is_deleted.is_(False)
        ).count()

        # Calculate health score (0-100)
        completion_score = (completed_tasks / total_tasks) * 40  # 40% weight
        overdue_penalty = (overdue_tasks / total_tasks) * 30  # 30% penalty
        progress_score = (project.progress / 100) * 30  # 30% weight

        health_score = max(0, completion_score + progress_score - overdue_penalty)

        # Determine health status
        if health_score >= 80:
            health_status = "excellent"
        elif health_score >= 60:
            health_status = "good"
        elif health_score >= 40:
            health_status = "fair"
        else:
            health_status = "poor"

        result.append({
            "project_id": project.id,
            "project_name": project.name,
            "health_score": round(health_score, 2),
            "health_status": health_status,
            "progress": project.progress,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
            "deadline": project.deadline
        })

    # Sort by health score
    result.sort(key=lambda x: x["health_score"], reverse=True)

    return result


@router.get("/reports/executive-summary")
async def get_executive_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Generate an executive summary with key insights
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access executive summary"
        )

    tenant_id = current_user.tenant_id
    today = datetime.utcnow()
    last_30_days = today - timedelta(days=30)

    # Overall metrics
    total_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted.is_(False)
    ).count()

    active_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.status == "active",
        models.Project.is_deleted.is_(False)
    ).count()

    # Tasks metrics
    total_tasks = db.query(models.Task).join(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.is_deleted.is_(False)
    ).count()

    completed_tasks_30d = db.query(models.Task).join(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.status == "done",
        models.Task.updated_at >= last_30_days,
        models.Task.is_deleted.is_(False)
    ).count()

    overdue_tasks = db.query(models.Task).join(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Task.due_date < today,
        models.Task.status != "done",
        models.Task.is_deleted.is_(False)
    ).count()

    # Team metrics
    total_users = db.query(models.User).filter(
        models.User.tenant_id == tenant_id,
        models.User.is_active.is_(True)
    ).count()

    # Projects at risk (deadline within 7 days and progress < 70%)
    at_risk_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.deadline.isnot(None),
        models.Project.deadline <= today + timedelta(days=7),
        models.Project.progress < 70,
        models.Project.status == "active",
        models.Project.is_deleted.is_(False)
    ).count()

    return {
        "summary": {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "total_tasks": total_tasks,
            "total_team_members": total_users
        },
        "recent_activity": {
            "tasks_completed_last_30_days": completed_tasks_30d,
            "current_overdue_tasks": overdue_tasks
        },
        "alerts": {
            "projects_at_risk": at_risk_projects,
            "high_priority_overdue": db.query(models.Task).join(models.Project).filter(
                models.Project.tenant_id == tenant_id,
                models.Task.priority == "high",
                models.Task.due_date < today,
                models.Task.status != "done",
                models.Task.is_deleted.is_(False)
            ).count()
        },
        "generated_at": today.isoformat()
    }