import subprocess
import json


def run_bandit(filepath):

    command = [
        "bandit",
        "-r",
        filepath,
        "-f",
        "json"
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