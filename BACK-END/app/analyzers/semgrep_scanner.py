import subprocess
import json


def run_semgrep(filepath):

    command = [
        "semgrep",
        "--config=auto",
        "--json",
        filepath
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    try:
        return json.loads(result.stdout)
    except:
        return {
            "results": [],
            "errors": result.stderr
        }