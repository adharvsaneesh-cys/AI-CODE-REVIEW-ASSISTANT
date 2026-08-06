from datetime import datetime


def generate_report(
    filename,
    language,
    bandit_results,
    semgrep_results
):

    report = {
        "filename": filename,
        "language": language,
        "generated_at": datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
        "bandit": bandit_results,
        "semgrep": semgrep_results
    }

    return report