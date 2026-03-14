"""Load environment variables for the pipeline."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
FDC_API_KEY: str = os.environ.get("FDC_API_KEY", "")
FOOD_MODEL_ID: str = os.environ.get("FOOD_MODEL_ID", "nateraw/food")
# Groq model IDs — override via env to switch models without code changes
GROQ_CHAT_MODEL: str = os.environ.get(
    "GROQ_CHAT_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
GROQ_VISION_MODEL: str = os.environ.get(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
MISMATCH_LOG_DIR: str = os.environ.get("MISMATCH_LOG_DIR", "corrections/")

DATA_DIR = Path("data")
USER_PROFILES_DIR = DATA_DIR / "user_profiles"
NUTRITION_DB_DIR = DATA_DIR / "nutrition_db"
NUTRITION_CACHE_PATH = DATA_DIR / "nutrition_cache.json"
DAILY_LOGS_DIR = DATA_DIR / "daily_logs"
BASELINES_DIR = DATA_DIR / "baselines"
