from ..core.s3 import s3_client, BUCKET
import uuid
from fastapi import APIRouter, HTTPException, File, UploadFile
import os


router = APIRouter(
    prefix="/files",
    tags=["Fils"]
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

@router.post("upload")
async def upload_file(file: UploadFile = File(...)):


        if file.content_type not in ALLOWED_MIME_TYPES:
              raise HTTPException(
                    status_code=400,
                    detail="File type not allowed"
              )
        
        if not file.filename:
            raise HTTPException(400, "Invalid filename")

        ext = os.path.splitext(file.filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
              raise HTTPException(
                    status_code=400,
                    detail="Invalid file extension"
              )
        
        if ext in BLOCKED_EXT:
            raise HTTPException(400, "Executable files not allowed")

        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)

        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File too large (max 10MB)"
            )

        file_id = str(uuid.uuid4())
        key = f"uploads/{file_id}-{file.filename}"

        try:
            s3_client.upload_fileobj(
                  file.file,
                  BUCKET,
                  key,
                  ExtraArgs={"ContentType": file.content_type,
                             "ACL": "private" }
            )
            # file_url = f"https://{BUCKET}.s3.amazonaws.com/{key}"

            return{
                  "filename": file.filename
            }
        except Exception as e:
              raise HTTPException(500, str(e))