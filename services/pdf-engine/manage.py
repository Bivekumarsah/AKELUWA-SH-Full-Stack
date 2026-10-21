#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pdf_reducer.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django is not installed. Run run_windows.bat or run_linux_mac.sh."
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
