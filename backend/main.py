from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import bcrypt
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pymongo import MongoClient

# Ensure repo-root CWD so `utils.config` Path("data") points correctly.
REPO_ROOT = Path(__file__).resolve().parent.parent
os.chdir(REPO_ROOT)
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from utils.config import DAILY_LOGS_DIR  # noqa: E402
from utils.storage import ensure_dir, read_json, write_json  # noqa: E402


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
_mongo_client: MongoClient | None = None
_mongo_error: str | None = None

try:
    _mongo_client = MongoClient(MONGODB_URI)
    _mongo_client.admin.command("ping")
except Exception as exc:
    _mongo_error = f"MongoDB connection failed: {exc}"


app = FastAPI(title="GutSense Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Stage4MoodInput(BaseModel):
    mood_emoji: str = "\U0001f610"
    mood_rating: int = Field(default=5, ge=1, le=10)
    cognitive_state: str = "clear"
    energy_level: str = "moderate"
    anxiety_level: str = "none"


class Stage3DigestionInput(BaseModel):
    bloating: str = "none"
    stool_quality: int = Field(default=4, ge=1, le=7)
    gas_discomfort: str = "none"
    fermented_food_today: bool = False


class Stage6SleepInput(BaseModel):
    sleep_onset: str | None = None  # HH:MM
    wake_time: str | None = None  # HH:MM
    sleep_quality: str = "good"
    night_awakenings: int = 0
    caffeine_after_14h: bool = False
    screen_before_bed_min: int = 30
    last_meal_to_bed_hours: float = 3.0


class PipelineRunRequest(BaseModel):
    user_id: str
    mood: Stage4MoodInput = Stage4MoodInput()
    digestion: Stage3DigestionInput = Stage3DigestionInput()
    sleep: Stage6SleepInput = Stage6SleepInput()
    skip_groq: bool = False


class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user_id: str
    email: EmailStr
    name: str


def _get_users_collection():
    if _mongo_error is not None or _mongo_client is None:
        raise HTTPException(status_code=500, detail=_mongo_error or "MongoDB not configured")
    db = _mongo_client["gutsense"]
    return db["users"]


def _get_food_logs_collection():
    if _mongo_error is not None or _mongo_client is None:
        raise HTTPException(status_code=500, detail=_mongo_error or "MongoDB not configured")
    db = _mongo_client["gutsense"]
    return db["food_logs"]


def _get_profiles_collection():
    if _mongo_error is not None or _mongo_client is None:
        raise HTTPException(status_code=500, detail=_mongo_error or "MongoDB not configured")
    db = _mongo_client["gutsense"]
    return db["profiles"]



def _load_daily_log_count() -> int:
    if not DAILY_LOGS_DIR.exists():
        return 0
    return len(list(DAILY_LOGS_DIR.glob("*.json")))


def _load_daily_records() -> list[dict[str, Any]]:
    if not DAILY_LOGS_DIR.exists():
        return []
    records: list[dict[str, Any]] = []
    for f in sorted(DAILY_LOGS_DIR.glob("*.json")):
        data = read_json(f)
        if data:
            records.append(data)
    return records


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mongo": "up" if _mongo_error is None else f"error: {_mongo_error}",
    }


@app.post("/auth/register", response_model=AuthResponse)
def register_user(payload: AuthRegisterRequest) -> AuthResponse:
    users = _get_users_collection()
    email = payload.email.lower()

    if users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode(
        "utf-8"
    )

    doc = {
        "email": email,
        "name": payload.name,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
    }
    inserted = users.insert_one(doc)

    return AuthResponse(user_id=str(inserted.inserted_id), email=email, name=payload.name)


@app.post("/auth/login", response_model=AuthResponse)
def login_user(payload: AuthLoginRequest) -> AuthResponse:
    users = _get_users_collection()
    email = payload.email.lower()

    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    stored_hash = user.get("password_hash", "")
    if not stored_hash or not bcrypt.checkpw(
        payload.password.encode("utf-8"), stored_hash.encode("utf-8")
    ):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return AuthResponse(user_id=str(user["_id"]), email=email, name=user.get("name", ""))


@app.post("/profile/{user_id}")
def create_profile(user_id: str, profile_data: dict[str, Any]) -> dict[str, Any]:
    try:
        from stage0.profile import run as stage0_run

        profile = stage0_run(user_id, profile_data)
        
        # Save to MongoDB
        profiles_col = _get_profiles_collection()
        profiles_col.update_one(
            {"user_id": user_id},
            {"$set": profile},
            upsert=True
        )
        return profile
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/profile/{user_id}")
def get_profile(user_id: str) -> dict[str, Any]:
    profiles_col = _get_profiles_collection()
    profile = profiles_col.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile:
        from stage0.profile import load as stage0_load
        profile = stage0_load(user_id)
        if profile:
            # Migrate local JSON to MongoDB
            profiles_col.update_one(
                {"user_id": user_id},
                {"$set": profile},
                upsert=True
            )

    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.get("/daily_logs")
def list_daily_logs() -> dict[str, Any]:
    ensure_dir(DAILY_LOGS_DIR)
    dates = [p.stem for p in sorted(DAILY_LOGS_DIR.glob("*.json"))]
    return {"count": len(dates), "dates": dates}


@app.get("/daily_logs/{date}")
def get_daily_log(date: str) -> dict[str, Any]:
    path = DAILY_LOGS_DIR / f"{date}.json"
    data = read_json(path)
    if not data:
        raise HTTPException(status_code=404, detail="Daily log not found")
    return data


@app.post("/food-logs")
async def pipeline_run(
    image: UploadFile = File(...),
    request_json: str = Form(...),
) -> dict[str, Any]:
    """
    Multipart endpoint.

    - image: UploadFile
    - request_json: JSON string matching PipelineRunRequest
    """
    try:
        req = PipelineRunRequest.model_validate_json(request_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request_json: {e}")

    # Stage 0: load profile
    profiles_col = _get_profiles_collection()
    stage0 = profiles_col.find_one({"user_id": req.user_id}, {"_id": 0})
    if not stage0:
        from stage0.profile import load as load_profile
        stage0 = load_profile(req.user_id)
        if not stage0:
            raise HTTPException(status_code=400, detail="No profile found for user_id. Create one first.")

    # Save uploaded image temporarily and run Stage 1
    suffix = Path(image.filename or "meal.jpg").suffix or ".jpg"
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
            tmp.write(await image.read())

        from pipeline import analyze_food_image

        stage1 = analyze_food_image(str(tmp_path))
    finally:
        try:
            if "tmp_path" in locals() and tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass

    meal_timestamp = datetime.now(timezone.utc).isoformat()
    stage1["timestamp"] = meal_timestamp

    # Stage 2
    from stage2.nutrition import run as stage2_run

    stage2 = stage2_run(stage1)

    # Stage 3
    from stage3.gut_proxy import run as stage3_run

    digestion_report = {
        "bloating": req.digestion.bloating,
        "stool_quality": req.digestion.stool_quality,
        "digestion_quality": "good",
        "fermented_food_today": req.digestion.fermented_food_today,
        "gas_discomfort": req.digestion.gas_discomfort,
    }
    stage3 = stage3_run(stage2, digestion_report)

    # Stage 4
    from stage4.mood import run as stage4_run

    mood_input = {
        "mood_emoji": req.mood.mood_emoji,
        "mood_rating": req.mood.mood_rating,
        "cognitive_state": req.mood.cognitive_state,
        "energy_level": req.mood.energy_level,
        "anxiety_level": req.mood.anxiety_level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    stage4 = stage4_run(mood_input, stage2, meal_timestamp)

    # Stage 5
    from stage5.metabolic import run as stage5_run

    stage5 = stage5_run(stage2, meal_timestamp, stage0)

    # Stage 6 (optional)
    stage6 = None
    if req.sleep.sleep_onset and req.sleep.wake_time:
        from stage6.sleep import run as stage6_run

        past_records = _load_daily_records()
        sleep_history = [
            r for r in past_records
            if "sleep_onset" in r and "sleep_debt" in r
        ][-7:]

        sleep_input = {
            "sleep_onset": req.sleep.sleep_onset,
            "wake_time": req.sleep.wake_time,
            "sleep_quality": req.sleep.sleep_quality,
            "night_awakenings": req.sleep.night_awakenings,
            "caffeine_after_14h": req.sleep.caffeine_after_14h,
            "screen_before_bed_min": req.sleep.screen_before_bed_min,
            "last_meal_to_bed_hours": req.sleep.last_meal_to_bed_hours,
        }
        stage6 = stage6_run(sleep_input, sleep_history_7d=sleep_history or None)

    # Save daily log (same aggregation intent as run_pipeline.py)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily: dict[str, Any] = {
        **stage3,
        **stage4,
        **stage5,
        **(stage6 or {}),
        "food_items": stage1.get("food_items", []),
        "calories_kcal": stage2.get("totals", {}).get("calories_kcal", 0),
        "fiber_g": stage2.get("totals", {}).get("fiber_g", 0),
        "tryptophan_mg": stage2.get("totals", {}).get("tryptophan_mg", 0),
        "glycemic_load": stage2.get("totals", {}).get("glycemic_load", "unknown"),
        "fermented_food_consumed": stage3.get("fermented_food_consumed", False),
        "late_meal": stage5.get("late_meal_penalty_applied", False),
        "date": today,
    }
    ensure_dir(DAILY_LOGS_DIR)
    write_json(DAILY_LOGS_DIR / f"{today}.json", daily)

    # Stage 7/8/9 gating (same thresholds as CLI runner)
    stage7 = None
    stage8 = None
    stage9 = None
    day_count = _load_daily_log_count()
    all_records = _load_daily_records()

    if day_count >= 30:
        from stage7.patterns import run as stage7_run
        from stage8.baseline import run as stage8_run

        stage7 = stage7_run(all_records, skip_groq=req.skip_groq)
        stage8 = stage8_run(req.user_id)

    baselines = stage8 or stage0
    if len(all_records) >= 7:
        from stage9.risk import run as stage9_run

        stage9 = stage9_run(all_records, baselines)

    # Stage 10
    from stage10.insights import run as stage10_run

    pipeline_summary = {
        "baselines": stage8 or {},
        "correlations": (stage7 or {}).get("significant_correlations", []),
        "risk": stage9 or {},
        "gut": stage3,
        "sleep": stage6 or {},
        "metabolic": stage5,
        "nutrition_totals": stage2.get("totals", {}),
    }
    stage10 = stage10_run(pipeline_summary, skip_groq=req.skip_groq)

    response_data = {
        "stage0": stage0,
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
        "stage4": stage4,
        "stage5": stage5,
        "stage6": stage6,
        "stage7": stage7,
        "stage8": stage8,
        "stage9": stage9,
        "stage10": stage10,
        "daily_log_written": str(DAILY_LOGS_DIR / f"{today}.json"),
        "days_accumulated": day_count,
    }

    try:
        logs_col = _get_food_logs_collection()
        db_record = {
            "user_id": req.user_id,
            "timestamp": datetime.now(timezone.utc),
            **response_data
        }
        logs_col.insert_one(db_record)
    except Exception as e:
        print(f"Failed to save food log to MongoDB: {e}")

    return response_data


@app.get("/food-logs/{user_id}")
def get_food_logs(user_id: str, search: str | None = None) -> dict[str, Any]:
    logs_col = _get_food_logs_collection()
    query: dict[str, Any] = {"user_id": user_id}
    if search:
        query["$or"] = [
            {"stage1.food_items": {"$regex": search, "$options": "i"}},
            {"stage1.en_pred": {"$regex": search, "$options": "i"}}
        ]
    
    docs = list(logs_col.find(query).sort("timestamp", -1))
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"count": len(docs), "logs": docs}


@app.get("/analytics/{user_id}")
def get_analytics(user_id: str) -> dict[str, Any]:
    logs_col = _get_food_logs_collection()
    docs = list(logs_col.find({"user_id": user_id}).sort("timestamp", 1))
    
    total_logs = len(docs)
    avg_mood = 0.0
    mood_trends = []
    
    if total_logs > 0:
        moods = [d.get("stage4", {}).get("mood_rating", 5) for d in docs if "stage4" in d]
        if moods:
            avg_mood = sum(moods) / len(moods)
            
        for d in docs:
            ts = d.get("timestamp")
            m = d.get("stage4", {}).get("mood_rating", 5)
            if ts:
                mood_trends.append({"date": ts.isoformat() if isinstance(ts, datetime) else ts, "mood": m})
                
    return {
        "user_id": user_id,
        "total_logs": total_logs,
        "avg_mood_rating": avg_mood,
        "mood_trends": mood_trends[-30:],
        "recent_insights": docs[-1].get("stage10", {}).get("insights", []) if docs else []
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

