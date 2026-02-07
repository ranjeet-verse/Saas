from ..core.s3 import s3_client, BUCKET
import uuid
from fastapi import APIRouter, HTTPException, File, UploadFile, Depends
import os
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models
from ..core import oauth2


router = APIRouter(
    prefix="/files",
    tags=["Files"]
)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

BLOCKED_EXT = {
    ".exe", ".bat", ".cmd", ".sh",
    ".js", ".vbs", ".ps1", ".jar"
}

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"
}

MAX_FILE_SIZE = 10 * 1024 * 1024 

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "File type not allowed")

    if not file.filename:
        raise HTTPException(400, "Invalid filename")

    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Invalid extension")

    if ext in BLOCKED_EXT:
        raise HTTPException(400, "Executable not allowed")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large")

    key = f"tenant_{current_user.tenant_id}/user_{current_user.id}/{uuid.uuid4()}-{file.filename}"

    try:
        s3_client.upload_fileobj(
            file.file,
            BUCKET,
            key,
            ExtraArgs={
                "ContentType": file.content_type,
                "ACL": "private"
            }
        )

        file_obj = models.File(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            filename=file.filename,
            s3_key=key,
            size=size
        )

        db.add(file_obj)
        db.commit()
        db.refresh(file_obj)

        return {
            "id": file_obj.id,
            "filename": file.filename
        }

    except Exception as e:
        raise HTTPException(500, str(e))

        

@router.get("/{file_id}/download")
async def download(file_id: int,
                   db: Session = Depends(get_db),
                   current_user: models.User = Depends(oauth2.get_current_user)):
     
    file = db.query(models.File).filter(
          models.File.id==file_id,
          models.File.tenant_id==current_user.tenant_id).first()

    
    if not file:
        raise HTTPException(404, "File not found")
    
    if not (
        file.user_id == current_user.id or
        file.is_shared is True
    ):
        raise HTTPException(403, "Access denied")


    
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET,
            "Key": file.s3_key
        },
        ExpiresIn=300
    )

    return {"download_url": url}


@router.put("/{file_id}/share")
async def share_file(file_id: int,
                     db: Session = Depends(get_db),
                     current_user: models.User = Depends(oauth2.get_current_user)):
    
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id,
        models.File.tenant_id == current_user.tenant_id
    ).first()

    if not file:
        raise HTTPException(404, "File not found")
    
    file.is_shared = True
    db.commit()

    return {"message": "File shared with organization"}


@router.put("/{file_id}/unshare")
async def unshare_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):

    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.user_id == current_user.id,
        models.File.tenant_id == current_user.tenant_id
    ).first()

    if not file:
        raise HTTPException(404, "File not found")

    file.is_shared = False
    db.commit()

    return {"message": "File is now private"}


@router.get("/shared")
async def get_shared_files(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):

    files = db.query(models.File).filter(
        models.File.tenant_id == current_user.tenant_id,
        models.File.is_shared == True
    ).all()

    return files

