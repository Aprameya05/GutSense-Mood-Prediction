from __future__ import annotations

import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from api_runner import run_pipeline_for_api

load_dotenv()

app = Flask(__name__)
CORS(app)  # allow local frontend during development


@app.post("/api/analyze")
def analyze_meal():
    """HTTP API entrypoint: run full GutSense pipeline for an uploaded meal image."""
    image = request.files.get("image")
    user = request.form.get("user")

    if not image or not user:
        return jsonify({"error": "Missing required fields: image, user"}), 400

    # Optional fields (fall back to sensible defaults used in CLI)
    mood_emoji = request.form.get("mood_emoji", "\U0001f610")
    mood_rating = int(request.form.get("mood_rating", "5"))
    cognitive_state = request.form.get("cognitive_state", "clear")
    energy_level = request.form.get("energy_level", "moderate")
    anxiety_level = request.form.get("anxiety_level", "none")

    bloating = request.form.get("bloating", "none")
    stool_quality = int(request.form.get("stool_quality", "4"))
    gas_discomfort = request.form.get("gas_discomfort", "none")
    fermented_food = request.form.get("fermented_food", "false").lower() == "true"

    sleep_onset = request.form.get("sleep_onset") or None
    wake_time = request.form.get("wake_time") or None
    sleep_quality = request.form.get("sleep_quality", "good")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            filename = secure_filename(image.filename or "meal.jpg")
            img_path = Path(tmpdir) / filename
            image.save(os.fspath(img_path))

            result = run_pipeline_for_api(
                str(img_path),
                user,
                mood_emoji=mood_emoji,
                mood_rating=mood_rating,
                cognitive_state=cognitive_state,
                energy_level=energy_level,
                anxiety_level=anxiety_level,
                bloating=bloating,
                stool_quality=stool_quality,
                gas_discomfort=gas_discomfort,
                fermented_food=fermented_food,
                sleep_onset=sleep_onset,
                wake_time=wake_time,
                sleep_quality=sleep_quality,
                skip_groq=os.getenv("GROQ_API_KEY") is None,
            )
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500

    return jsonify(result)


if __name__ == "__main__":
    # For local dev only; production would use gunicorn/uvicorn etc.
    app.run(host="0.0.0.0", port=8000, debug=False)


