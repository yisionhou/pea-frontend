"""Run an isolated real-backend/browser smoke test without changing backend .env or data."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen
from urllib.error import URLError

FRONTEND = Path(__file__).resolve().parents[1]
BACKEND = FRONTEND.parent / "pea-backend"
sys.path.insert(0, str(BACKEND))
from app.passwords import hash_password

def port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]

def ready(url, process):
    for _ in range(150):
        if process.poll() is not None:
            raise RuntimeError("Test server stopped before becoming ready")
        try:
            with urlopen(url, timeout=1):
                return
        except (URLError, TimeoutError):
            time.sleep(0.1)
    raise TimeoutError(url)

def main():
    api_port, ui_port = port(), port()
    password = secrets.token_urlsafe(24)
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    processes = []
    with tempfile.TemporaryDirectory(prefix="pea-browser-smoke-") as temporary:
        env = {
            **os.environ,
            "PROJECT_ROOT": temporary,
            "HOST": "127.0.0.1",
            "PORT": str(api_port),
            "MODEL_PROFILES": "{}",
            "EVALUATION_PROFILES": "{}",
            "ENABLE_EVALUATION_HTTP": "false",
            "AUTH_ACCOUNTS": json.dumps([{
                "principal_id": "smoke-reviewer", "username": "smoke-reviewer",
                "display_name": "Smoke reviewer", "password_hash": hash_password(password),
                "employee_ids": ["*"], "permissions": ["audit", "review"],
            }]),
        }
        log_path = FRONTEND / "test-results" / "real-backend-smoke.log"
        log_path.parent.mkdir(exist_ok=True)
        with log_path.open("w", encoding="utf-8") as log:
            try:
                backend = subprocess.Popen([sys.executable, "-m", "app", "serve"], cwd=BACKEND, env=env, stdout=log, stderr=log, creationflags=flags)
                processes.append(backend)
                ready(f"http://127.0.0.1:{api_port}/health", backend)
                vite_env = {**os.environ, "API_PROXY_TARGET": f"http://127.0.0.1:{api_port}"}
                frontend = subprocess.Popen(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(ui_port)], cwd=FRONTEND, env=vite_env, stdout=log, stderr=log, creationflags=flags)
                processes.append(frontend)
                ready(f"http://127.0.0.1:{ui_port}", frontend)
                result = subprocess.run(["node", "tests/smoke-browser.mjs"], cwd=FRONTEND, env={**os.environ, "SMOKE_FRONTEND_URL": f"http://127.0.0.1:{ui_port}", "SMOKE_PASSWORD": password}, check=True, timeout=90, creationflags=flags, capture_output=True, text=True, encoding="utf-8")
                print(result.stdout.strip())
            finally:
                for process in reversed(processes):
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)

if __name__ == "__main__":
    main()
