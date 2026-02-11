import sys
import os

# Mock the environment
os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres:password123@localhost/saas"

sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import models
from app.routers.projects import get_project_stats
from app.schema import schemas
import asyncio

async def test_stats():
    db = SessionLocal()
    try:
        # Get first user
        user = db.query(models.User).first()
        if not user:
            print("No users found in DB")
            return
        
        print(f"Testing stats for user: {user.email} (Role: {user.role}, Tenant: {user.tenant_id})")
        
        stats_data = await get_project_stats(db=db, current_user=user)
        print("Raw stats data generated.")
        
        # Try to validate with schema
        validated_stats = schemas.ProjectStatsOut(**stats_data)
        print("Validation Successful!")
        print(validated_stats.model_dump_json(indent=2))
        
    except Exception as e:
        print(f"Error caught: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_stats())
