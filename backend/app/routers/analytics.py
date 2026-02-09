from fastapi import APIRouter, HTTPException, status, Depends
from ..core import oauth2, utils
from ..database import get_db
from ..schema import schemas
from sqlalchemy.orm import Session
from ..models import models
from sqlalchemy import func, and_, or_, cast, Date, extract



router = APIRouter(prefix="/analytics",
                   tags=["Analytics"])


@router.get("/dashboard", response_model=schemas.DashboardMetrics)
async def get_dashboard_metrics(db: Session = Depends(get_db),
                                current_user: models.User = Depends(oauth2.get_current_user)):
    
    tenant_id = current_user.tenant_id

    total_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.is_deleted._is(False)
    ).count()

    active_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.status == 'active'
        models.Project.is_deleted._is(False)
    ).count()

    completed_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.status == 'completed'
        models.Project.is_deleted._is(False)
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

    


