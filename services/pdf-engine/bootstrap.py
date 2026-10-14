"""Create/repair the local environment without removing user files."""
import os
from pathlib import Path
import subprocess
import sys
import venv

BASE = Path(__file__).resolve().parent


def main():
    if sys.version_info < (3, 10):
        raise SystemExit("Python 3.10 or newer is required.")
    environment = BASE / ".venv"
    executable = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not executable.is_file():
        print("Creating or repairing the local Python environment…", flush=True)
        venv.EnvBuilder(with_pip=True).create(environment)
    check = "import django,pymupdf; assert django.get_version() == '5.2.17'; assert pymupdf.VersionBind == '1.28.2'"
    if subprocess.run([str(executable), "-c", check], capture_output=True).returncode:
        print("Installing PDF reducer dependencies…", flush=True)
        subprocess.run([str(executable), "-m", "pip", "install", "--disable-pip-version-check",
                        "-r", str(BASE / "requirements.txt")], check=True)
    print("PDF reducer is ready.", flush=True)


if __name__ == "__main__":
    main()
