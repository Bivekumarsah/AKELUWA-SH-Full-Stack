"""Open the browser once the local service is ready."""
import os
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path


def main():
    toolbox = "--toolbox" in sys.argv
    port = 8096 if toolbox else 8000
    url = f"http://127.0.0.1:{port}"
    os.chdir(Path(__file__).resolve().parent)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pdf_reducer.settings")
    import socket
    with socket.socket() as probe:
        try:
            probe.bind(("127.0.0.1", port))
        except OSError:
            raise SystemExit(f"Port {port} is already in use. Close the previous server and try again.")

    def open_when_ready():
        for _ in range(50):
            time.sleep(.2)
            try:
                with urllib.request.urlopen(url + "/api/pdf-reducer/capabilities/", timeout=1) as response:
                    if response.status == 200:
                        webbrowser.open(url + ("/" if toolbox else "/reducer/"))
                        return
            except OSError:
                pass

    threading.Thread(target=open_when_ready, daemon=True).start()
    print(f"Opening {'Akeluwa ToolBox' if toolbox else 'PDF Size Reducer'} at {url}")
    print("Keep this window open. Press Ctrl+C to stop the local service.")
    from django.core.management import execute_from_command_line
    execute_from_command_line(["manage.py", "runserver", f"127.0.0.1:{port}", "--noreload"])


if __name__ == "__main__":
    main()
