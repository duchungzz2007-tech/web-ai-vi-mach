import os
import subprocess
import time
import httpx
import logging
from pathlib import Path

logger = logging.getLogger("ollama_manager")
logging.basicConfig(level=logging.INFO)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
OLLAMA_EXE = ROOT_DIR / "ollama.exe"
OLLAMA_MODELS_DIR = ROOT_DIR / "ollama_models"

_ollama_process = None

def is_ollama_running() -> bool:
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{OLLAMA_BASE_URL}/api/version")
            return resp.status_code == 200
    except Exception:
        return False

def ensure_ollama_running() -> bool:
    global _ollama_process
    if is_ollama_running():
        logger.info("Ollama server is already running.")
        return True

    if not OLLAMA_EXE.exists():
        logger.error(f"Ollama executable not found at: {OLLAMA_EXE}")
        return False

    logger.info("Starting Ollama background server...")
    env = os.environ.copy()
    env["OLLAMA_MODELS"] = str(OLLAMA_MODELS_DIR)
    env["OLLAMA_NUM_GPU"] = "0"
    env["CUDA_VISIBLE_DEVICES"] = ""

    try:
        # Launch ollama.exe serve in background silently
        creation_flags = 0
        if os.name == 'nt':
            creation_flags = subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS

        _ollama_process = subprocess.Popen(
            [str(OLLAMA_EXE), "serve"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creation_flags
        )
        
        # Wait up to 10 seconds for server to start
        for _ in range(10):
            time.sleep(1)
            if is_ollama_running():
                logger.info("Ollama server started successfully.")
                return True
                
        logger.warning("Ollama server started but is not responding yet.")
        return False
    except Exception as e:
        logger.error(f"Failed to start Ollama server: {e}")
        return False

async def fetch_available_models():
    if not is_ollama_running():
        ensure_ollama_running()
        
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", [])]
                return models
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
    return []
