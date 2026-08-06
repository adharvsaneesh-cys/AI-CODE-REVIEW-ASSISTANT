from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil

from app.utils.file_validator import validate_file
from app.analyzers.language_detector import detect_language
from app.analyzers.bandit_scanner import run_bandit
from app.analyzers.semgrep_scanner import run_semgrep
from app.reports.report_generator import generate_report

router = APIRouter()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/upload")
async def upload_code(file: UploadFile = File(...)):

    # Validate extension
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

    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    # Detect language
    language = detect_language(
        file.filename
    )

    # Run scanners
    bandit_results = {}

    if language == "Python":
        bandit_results = run_bandit(
            filepath
        )

    semgrep_results = run_semgrep(
        filepath
    )

    # Generate report
    report = generate_report(
        filename=file.filename,
        language=language,
        bandit_results=bandit_results,
        semgrep_results=semgrep_results
    )

    return report