import os

ALLOWED_EXTENSIONS = {
    ".py",
    ".java",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".cpp",
    ".c",
    ".cs",
    ".php",
    ".go",
    ".rb",
    ".swift",
    ".kt",
    ".zip"
}

MAX_FILE_SIZE = 50 * 1024 * 1024   # 50 MB


def validate_file(filename: str):

    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        return False, "Unsupported File Type"

    return True, "Valid File"