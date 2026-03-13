"""FastAPI backend for the GutSense pipeline.

Exposes all endpoints from specs.md Section 4, proxying requests to the
existing Python pipeline stages (0-10).

Run with: uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from utils import daily_log_manager as dlm
from utils.config import BASELINES_DIR, GROQ_API_KEY
from utils.schemas import (
    BaselinesOutput,
    DailyLog,
    DigestionSubmitRequest,
    ErrorResponse,
    FeatureLockedResponse,
    HistoryResponse,
    InsightsOutput,
    LoginRequest,
    MealLogResponse,
    MealSaveRequest,
    MealSaveResponse,
    MoodMetabolicResponse,
    MoodSubmitRequest,
    NutritionTotals,
    ProfileUpdateRequest,
    RegisterRequest,
    RiskOutput,
    SleepLogRequest,
    SleepOutput,
    Stage3Response,
    TrendsOutput,
    UserProfileResponse,
)
from utils.storage import read_json

app = FastAPI(
    title="GutSense API",
    description="10-stage food-gut-mood pipeline backend",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_skip_groq = not bool(GROQ_API_KEY)


# ── Auth ────────────────────────────────────────────────────────────────


@app.post("/api/auth/register", response_model=UserProfileResponse, status_code=201)
async def register(req: RegisterRequest):
    from stage0.profile import run as profile_run

    profile_data = req.model_dump(exclude={"user_id"})
    try:
        profile = profile_run(req.user_id, profile_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"errors": str(e).split(", ")})
    return profile


@app.post("/api/auth/login", response_model=UserProfileResponse)
async def login(req: LoginRequest):
    from stage0.profile import load as profile_load

    profile = profile_load(req.user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail={"error": "User not found"})
    return profile


# ── Meal Logging ────────────────────────────────────────────────────────


@app.post("/api/meals/log", response_model=MealLogResponse)
async def meal_log(image: UploadFile = File(...), user_id: str = Form(...)):
    """Upload meal image → Stage 1 (food ID) + Stage 2 (nutrition)."""
    from pipeline import analyze_food_image
    from stage0.profile import load as profile_load
    from stage2.nutrition import run as stage2_run

    profile = profile_load(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail={"error": "User not found"})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            suffix = Path(image.filename or "meal.jpg").suffix or ".jpg"
            img_path = Path(tmpdir) / f"upload{suffix}"
            content = await image.read()
            img_path.write_bytes(content)

            stage1 = analyze_food_image(str(img_path))
            stage1["timestamp"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": f"Image processing failed: {exc}"})

    try:
        stage2 = stage2_run(stage1)
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": f"Nutrition lookup failed: {exc}"})

    stage2_resp = _normalize_stage2_response(stage2)
    return {"stage1": stage1, "stage2": stage2_resp}


@app.post("/api/digestion/submit", response_model=Stage3Response)
async def digestion_submit(req: DigestionSubmitRequest):
    """Submit daily digestion report → Stage 3 (gut proxy)."""
    from stage3.gut_proxy import run as stage3_run

    log = dlm.get_or_create(req.user_id, req.date)

    digestion_dict = req.digestion.model_dump()

    totals = log.get("daily_totals", {})
    stage2_for_gut = {"totals": _totals_for_stage3(totals)}

    stage3 = stage3_run(stage2_for_gut, digestion_dict)
    dlm.set_digestion(req.user_id, req.date, digestion_dict, stage3)

    return {"stage3": stage3}


@app.post("/api/mood/submit", response_model=MoodMetabolicResponse)
async def mood_submit(req: MoodSubmitRequest):
    """Submit mood → Stage 4 (mood) + Stage 5 (metabolic)."""
    from stage4.mood import run as stage4_run
    from stage5.metabolic import run as stage5_run

    mood_dict = req.mood_input.model_dump()
    mood_dict["timestamp"] = mood_dict.get("timestamp") or datetime.now(timezone.utc).isoformat()

    totals_dict = req.stage2_totals.model_dump()
    stage2_for_mood = {"totals": _totals_for_stages(totals_dict)}

    stage4 = stage4_run(mood_dict, stage2_for_mood, req.meal_timestamp)

    stage2_for_metab = {"totals": _totals_for_stages(totals_dict)}
    stage5 = stage5_run(stage2_for_metab, req.meal_timestamp, req.stage0_profile)

    return {"stage4": stage4, "stage5": stage5}


@app.post("/api/meals/save", response_model=MealSaveResponse)
async def meal_save(req: MealSaveRequest):
    """Persist fully-assembled meal entry to daily log."""
    from stage0.profile import load as profile_load

    profile = profile_load(req.user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail={"error": "User not found"})

    meal_id = req.meal_id or _infer_meal_id()
    now_time = datetime.now(timezone.utc).strftime("%H:%M")

    meal_data = req.meal_data.model_dump()
    stage2_data = meal_data["stage2"]
    stage2_data = _normalize_stage2_for_storage(stage2_data)

    meal_entry = {
        "meal_id": meal_id,
        "meal_time": now_time,
        "stage1": meal_data["stage1"],
        "stage2": stage2_data,
        "stage4": meal_data["stage4"],
        "stage5": meal_data["stage5"],
    }

    diet_type = profile.get("diet_type", "vegetarian")
    log = dlm.append_meal(req.user_id, req.date, meal_entry, diet_type)

    return {
        "meal_id": meal_id,
        "meal_count": len(log["meals"]),
        "daily_totals": log["daily_totals"],
        "daily_mood_summary": log["daily_mood_summary"],
    }


# ── Sleep ───────────────────────────────────────────────────────────────


@app.post("/api/sleep/log", response_model=SleepOutput)
async def sleep_log(req: SleepLogRequest):
    """Save sleep data → Stage 6."""
    from stage6.sleep import run as stage6_run

    sleep_dict = req.sleep_input.model_dump()

    sleep_history = dlm.get_sleep_history(req.user_id, days=7)
    stage6 = stage6_run(sleep_dict, sleep_history_7d=sleep_history or None)

    dlm.set_sleep(req.user_id, req.date, sleep_dict, stage6)

    result = {
        "sleep_onset": sleep_dict["sleep_onset"],
        "wake_time": sleep_dict["wake_time"],
        "sleep_hours": stage6["sleep_hours"],
        "sleep_debt": stage6["sleep_debt"],
        "cumulative_debt_7d": stage6["cumulative_debt_7d"],
        "circadian_regularity_index": stage6["circadian_regularity_index"],
        "neurological_stress_proxy": stage6["neurological_stress_proxy"],
        "sleep_quality": sleep_dict.get("sleep_quality", "good"),
        "sleep_stability": stage6["sleep_stability"],
        "night_awakenings": sleep_dict.get("night_awakenings", 0),
        "caffeine_after_14h": sleep_dict.get("caffeine_after_14h", False),
        "screen_before_bed_min": sleep_dict.get("screen_before_bed_min", 0),
        "timestamp": stage6["timestamp"],
    }
    return result


# ── Data Retrieval ──────────────────────────────────────────────────────


@app.get("/api/daily-log/{date}")
async def get_daily_log(date: str, user_id: str = Query(...)):
    """Get structured DailyLog for a specific date. Always returns scaffold."""
    log = dlm.get_or_create(user_id, date)
    return log


@app.get("/api/history", response_model=HistoryResponse)
async def get_history(
    user_id: str = Query(...),
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
):
    logs = dlm.load_date_range(user_id, from_date, to_date)
    return {"logs": logs, "count": len(logs)}


@app.get("/api/trends")
async def get_trends(user_id: str = Query(...)):
    """Stage 7: time-series pattern analysis (requires 30+ days)."""
    from stage7.patterns import run as stage7_run

    days_logged = dlm.count_days_logged(user_id)
    if days_logged < 30:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Trends require 30+ days of data",
                "days_logged": days_logged,
            },
        )

    all_logs = dlm.load_all_daily_logs(user_id)
    flat_records = [dlm.flatten_for_timeseries(lg) for lg in all_logs]

    result = stage7_run(flat_records, skip_groq=_skip_groq)
    return result


@app.get("/api/baselines")
async def get_baselines(user_id: str = Query(...)):
    """Stage 8: baseline creation (requires 30+ days)."""
    from stage8.baseline import run as stage8_run

    days_logged = dlm.count_days_logged(user_id)
    if days_logged < 30:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Baselines require 30+ days of data",
                "days_logged": days_logged,
            },
        )

    flat_dir = _prepare_flat_logs_for_stage8(user_id)
    result = stage8_run(user_id, daily_logs_dir=flat_dir)
    return result


@app.get("/api/risks")
async def get_risks(user_id: str = Query(...)):
    """Stage 9: neurological risk detection (requires 7+ days)."""
    from stage9.risk import run as stage9_run

    days_logged = dlm.count_days_logged(user_id)
    if days_logged < 7:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Risk analysis requires 7+ days of data",
                "days_logged": days_logged,
            },
        )

    all_logs = dlm.load_all_daily_logs(user_id)
    flat_records = [dlm.flatten_for_timeseries(lg) for lg in all_logs]

    baselines = _load_baselines(user_id)
    result = stage9_run(flat_records, baselines)
    return result


@app.get("/api/insights")
async def get_insights(user_id: str = Query(...)):
    """Stage 10: insight generation."""
    from stage10.insights import run as stage10_run

    all_logs = dlm.load_all_daily_logs(user_id)
    flat_records = [dlm.flatten_for_timeseries(lg) for lg in all_logs]

    baselines = _load_baselines(user_id)

    sig_corrs: list = []
    if len(flat_records) >= 30:
        try:
            from stage7.patterns import run as stage7_run
            stage7 = stage7_run(flat_records, skip_groq=_skip_groq)
            sig_corrs = stage7.get("significant_correlations", [])
        except Exception:
            pass

    risk: dict = {}
    if len(flat_records) >= 7:
        try:
            from stage9.risk import run as stage9_run
            risk = stage9_run(flat_records, baselines)
        except Exception:
            pass

    last_log = all_logs[-1] if all_logs else {}
    gut = last_log.get("daily_gut", {})
    sleep = (last_log.get("sleep") or {})
    totals = last_log.get("daily_totals", {})

    metabolic: dict = {}
    meals = last_log.get("meals", [])
    if meals:
        metabolic = meals[-1].get("stage5", {})

    pipeline_summary = {
        "baselines": baselines,
        "correlations": sig_corrs,
        "risk": risk,
        "gut": gut,
        "sleep": sleep,
        "metabolic": metabolic,
        "nutrition_totals": totals,
    }
    result = stage10_run(pipeline_summary, skip_groq=_skip_groq)
    return result


# ── Profile ─────────────────────────────────────────────────────────────


@app.get("/api/profile", response_model=UserProfileResponse)
async def get_profile(user_id: str = Query(...)):
    from stage0.profile import load as profile_load

    profile = profile_load(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail={"error": "User not found"})
    return profile


@app.put("/api/profile", response_model=UserProfileResponse)
async def update_profile(req: ProfileUpdateRequest):
    from stage0.profile import run as profile_run

    profile_data = req.model_dump(exclude={"user_id"})
    try:
        profile = profile_run(req.user_id, profile_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"errors": str(e).split(", ")})
    return profile


# ── Helpers ─────────────────────────────────────────────────────────────


def _infer_meal_id() -> str:
    """Auto-infer meal type from current time of day."""
    hour = datetime.now().hour
    if hour < 11:
        return "breakfast"
    if hour < 15:
        return "lunch"
    if hour < 19:
        return "snack"
    return "dinner"


def _totals_for_stage3(totals: dict) -> dict:
    """Map DailyTotals keys to Stage 3 expected keys (carbohydrates_g, etc.)."""
    return {
        "fiber_g": totals.get("fiber_g", 0.0),
        "fat_g": totals.get("fat_g", 0.0),
        "carbohydrates_g": totals.get("carbs_g", totals.get("carbohydrates_g", 0.0)),
        "omega3_mg": totals.get("omega3_mg", 0.0),
        "calories_kcal": totals.get("calories_kcal", 0.0),
    }


def _totals_for_stages(totals: dict) -> dict:
    """Map NutritionTotals to the dict shape that stages 4/5 expect."""
    return {
        "calories_kcal": totals.get("calories_kcal", 0.0),
        "carbohydrates_g": totals.get("carbs_g", totals.get("carbohydrates_g", 0.0)),
        "protein_g": totals.get("protein_g", 0.0),
        "fat_g": totals.get("fat_g", 0.0),
        "fiber_g": totals.get("fiber_g", 0.0),
        "glycemic_load": totals.get("glycemic_load", "unknown"),
        "tryptophan_mg": totals.get("tryptophan_mg", 0.0),
        "omega3_mg": totals.get("omega3_mg", 0.0),
        "iron_mg": totals.get("iron_mg", 0.0),
        "magnesium_mg": totals.get("magnesium_mg", 0.0),
        "vitamin_b6_mg": totals.get("b6_mg", totals.get("vitamin_b6_mg", 0.0)),
        "vitamin_b12_ug": totals.get("b12_mcg", totals.get("vitamin_b12_ug", 0.0)),
        "zinc_mg": totals.get("zinc_mg", 0.0),
    }


def _normalize_stage2_response(stage2: dict) -> dict:
    """Normalize Stage 2 output to match the response schema (NutritionTotals key names)."""
    totals = stage2.get("totals", {})
    normalized_totals = {
        "calories_kcal": totals.get("calories_kcal", 0.0),
        "carbs_g": totals.get("carbs_g", totals.get("carbohydrates_g", 0.0)),
        "protein_g": totals.get("protein_g", 0.0),
        "fat_g": totals.get("fat_g", 0.0),
        "fiber_g": totals.get("fiber_g", 0.0),
        "glycemic_load": totals.get("glycemic_load", "unknown"),
        "tryptophan_mg": totals.get("tryptophan_mg", 0.0),
        "omega3_mg": totals.get("omega3_mg", 0.0),
        "iron_mg": totals.get("iron_mg", 0.0),
        "magnesium_mg": totals.get("magnesium_mg", 0.0),
        "b6_mg": totals.get("b6_mg", totals.get("vitamin_b6_mg", 0.0)),
        "b12_mcg": totals.get("b12_mcg", totals.get("vitamin_b12_ug", 0.0)),
        "zinc_mg": totals.get("zinc_mg", 0.0),
    }
    return {
        "items": stage2.get("items", []),
        "totals": normalized_totals,
        "timestamp": stage2.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }


def _normalize_stage2_for_storage(stage2_data: dict) -> dict:
    """Ensure stage2 data stored in meals has normalized totals."""
    totals = stage2_data.get("totals", {})
    stage2_data["totals"] = {
        "calories_kcal": totals.get("calories_kcal", 0.0),
        "carbs_g": totals.get("carbs_g", totals.get("carbohydrates_g", 0.0)),
        "protein_g": totals.get("protein_g", 0.0),
        "fat_g": totals.get("fat_g", 0.0),
        "fiber_g": totals.get("fiber_g", 0.0),
        "glycemic_load": totals.get("glycemic_load", "unknown"),
        "tryptophan_mg": totals.get("tryptophan_mg", 0.0),
        "omega3_mg": totals.get("omega3_mg", 0.0),
        "iron_mg": totals.get("iron_mg", 0.0),
        "magnesium_mg": totals.get("magnesium_mg", 0.0),
        "b6_mg": totals.get("b6_mg", totals.get("vitamin_b6_mg", 0.0)),
        "b12_mcg": totals.get("b12_mcg", totals.get("vitamin_b12_ug", 0.0)),
        "zinc_mg": totals.get("zinc_mg", 0.0),
    }
    return stage2_data


def _load_baselines(user_id: str) -> dict:
    """Load baselines for a user, falling back to their profile."""
    from stage0.profile import load as profile_load

    baseline_path = BASELINES_DIR / f"{user_id}.json"
    baselines = read_json(baseline_path)
    if baselines:
        return baselines
    profile = profile_load(user_id)
    return profile or {}


def _prepare_flat_logs_for_stage8(user_id: str) -> Path:
    """Stage 8 reads flat JSON files from a directory.

    Convert structured logs to flat format in a temp subdirectory
    so stage 8 can consume them.
    """
    from utils.storage import ensure_dir, write_json

    all_logs = dlm.load_all_daily_logs(user_id)
    flat_dir = dlm.DAILY_LOGS_DIR / user_id / "_flat"
    ensure_dir(flat_dir)

    for lg in all_logs:
        flat = dlm.flatten_for_timeseries(lg)
        date_str = lg.get("date", "unknown")
        write_json(flat_dir / f"{date_str}.json", flat)

    return flat_dir


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
