import os

LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React",
    ".ts": "TypeScript",
    ".tsx": "React TypeScript",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".php": "PHP",
    ".go": "Go",
    ".rb": "Ruby",
    ".swift": "Swift",
    ".kt": "Kotlin"
}


def detect_language(filename: str):

    extension = os.path.splitext(filename)[1].lower()

    return LANGUAGE_MAP.get(extension, "Unknown")