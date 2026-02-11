from app.database import SessionLocal
from app.models import models

def check_counts():
    db = SessionLocal()
    try:
        project_count = db.query(models.Project).count()
        task_count = db.query(models.Task).count()
        user_count = db.query(models.User).count()
        tenant_count = db.query(models.Tenant).count()
        
        print(f"Projects: {project_count}")
        print(f"Tasks: {task_count}")
        print(f"Users: {user_count}")
        print(f"Tenants: {tenant_count}")
        
        # Check projects per user
        users = db.query(models.User).all()
        for u in users:
            p_count = db.query(models.ProjectMembers).filter(models.ProjectMembers.user_id == u.id).count()
            print(f"User {u.email} (ID: {u.id}) is member of {p_count} projects")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_counts()
