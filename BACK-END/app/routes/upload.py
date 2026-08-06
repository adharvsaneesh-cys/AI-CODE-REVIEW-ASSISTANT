from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil

from app.utils.file_validator import validate_file

router = APIRouter()

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/upload")
async def upload_code(file: UploadFile = File(...)):

    valid, message = validate_file(file.filename)

    if not valid:
        raise HTTPException(
            status_code=400,
            detail=message
        )

    filepath = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "success",
        "filename": file.filename,
        "message": "Upload Successful"
    }