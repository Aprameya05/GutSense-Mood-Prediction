"""FastAPI backend for the GutSense frontend.

Exposes a single `/analyze-meal` endpoint that accepts an image upload,
runs the full pipeline, and returns the `MealAnalysis` JSON.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

from fastapi import File, FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from full_pipeline import analyze_meal
from biosense_pipeline import analyze_image_biosense


app = FastAPI(title="GutSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok", "service": "gutsense-api"}


@app.post("/analyze-meal")
async def analyze_meal_endpoint(file: UploadFile = File(...)):
    """Accept an uploaded meal image and run the full GutSense pipeline."""
    suffix = Path(file.filename or "meal.jpg").suffix or ".jpg"
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    os.close(tmp_fd)

    try:
        with open(tmp_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)

        result = analyze_meal(tmp_path)
        return result
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


@app.post("/biosense/analyze-meal")
async def biosense_analyze_meal(file: UploadFile = File(...)):
    """Extended BioSense endpoint returning the richer multi-layer state."""
    suffix = Path(file.filename or "meal.jpg").suffix or ".jpg"
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    os.close(tmp_fd)

    try:
        with open(tmp_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)

        result = analyze_image_biosense(tmp_path)
        return result
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


