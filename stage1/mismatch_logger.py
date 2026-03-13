"""Log EfficientNet vs Groq prediction mismatches for periodic batch retraining."""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
MISMATCH_LOG = LOGS_DIR / "mismatch_log.jsonl"

_lock = threading.Lock()


def log_mismatch(
    image_path: str,
    en_pred: str,
    groq_pred: str,
) -> None:
    """Append a single mismatch record to the JSONL log (thread-safe)."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "image_path": image_path,
        "en_pred": en_pred,
        "groq_pred": groq_pred,
    }

    with _lock:
        with open(MISMATCH_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
