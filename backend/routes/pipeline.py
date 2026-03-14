import os
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.database import get_db
from backend.routes.auth import get_current_user
import shutil
import tempfile

router = APIRouter()

# Dependency for DB injection in pipeline handlers 
def db_dep():
    return get_db()
    
# --- Models ---
class MealSaveRequest(BaseModel):
    date: str
    meal_id: str = None
    meal_data: dict

class DigestionSubmitRequest(BaseModel):
    date: str
    digestion: dict

class MoodSubmitRequest(BaseModel):
    date: str
    meal_timestamp: str
    stage2_totals: dict
    stage0_profile: dict
    mood_input: dict

class SleepLogRequest(BaseModel):
    date: str
    sleep_input: dict

# --- Routes ---

@router.post("/meals/log")
async def log_meal_image(image: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Stage 1 inference route"""
    from pipeline import analyze_food_image
    
    # Save the upload to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
        shutil.copyfileobj(image.file, temp)
        temp_path = temp.name

    try:
        stage1 = analyze_food_image(temp_path)
        timestamp = datetime.now(timezone.utc).isoformat()
        stage1["timestamp"] = timestamp
        
        # We can also pre-run stage2 to return both
        from stage2.nutrition import run as stage2_run
        stage2 = stage2_run(stage1)
        
        return {"stage1": stage1, "stage2": stage2}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/meals/save")
async def save_meal(req: MealSaveRequest, current_user: dict = Depends(get_current_user)):
    """
    Saves a finalized meal (including Stages 1, 2, 4, 5 outputs) to MongoDB daily_logs
    """
    db = get_db()
    user_id = current_user["user_id"]
    
    # Get or create today's daily log
    doc_id = f"{user_id}_{req.date}"
    daily_log = await db.daily_logs.find_one({"_id": doc_id})
    
    # Deduplicate or replace if meal_id already exists in array (if using editing later)
    meal_entry = req.meal_data
    meal_entry["meal_id"] = req.meal_id or f"meal_{datetime.now().timestamp()}"
    meal_entry["meal_time"] = datetime.now().strftime("%H:%M")

    if not daily_log:
        daily_log = {
            "_id": doc_id,
            "user_id": user_id,
            "date": req.date,
            "meals": [meal_entry],
            "sleep": None,
            "daily_gut": None,
            "daily_totals": meal_entry.get("stage2", {}).get("totals", {}), # Start with first meal
            "daily_mood_summary": {"avg_mood_score": meal_entry.get("stage4", {}).get("mood_score", 0)}
        }
        await db.daily_logs.insert_one(daily_log)
    else:
        # Sum up new totals
        new_totals = meal_entry.get("stage2", {}).get("totals", {})
        old_totals = daily_log.get("daily_totals", {})
        
        # Simple manual sum for immediate dict
        updated_totals = {}
        for k in set(old_totals.keys()).union(new_totals.keys()):
            val1 = old_totals.get(k, 0)
            val2 = new_totals.get(k, 0)
            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                updated_totals[k] = val1 + val2
            else:
                 updated_totals[k] = val2 if val2 else val1 # overwrite strings

        all_meals = daily_log.get("meals", []) + [meal_entry]
        mood_scores = [m.get("stage4", {}).get("mood_score") for m in all_meals if m.get("stage4") and "mood_score" in m["stage4"]]
        avg_mood = sum(mood_scores) / len(mood_scores) if mood_scores else 0

        await db.daily_logs.update_one(
            {"_id": doc_id},
            {"$push": {"meals": meal_entry}, "$set": {"daily_totals": updated_totals, "daily_mood_summary": {"avg_mood_score": avg_mood}}}
        )
        
    return {"status": "success", "meal_id": meal_entry["meal_id"]}

@router.post("/digestion/submit")
async def submit_digestion(req: DigestionSubmitRequest, current_user: dict = Depends(get_current_user)):
    """Runs stage 3 gut proxy"""
    from stage3.gut_proxy import run as stage3_run
    db = get_db()
    user_id = current_user["user_id"]
    doc_id = f"{user_id}_{req.date}"
    daily_log = await db.daily_logs.find_one({"_id": doc_id})
    
    totals = {"totals": daily_log.get("daily_totals", {})} if daily_log else {"totals": {}}
    
    stage3 = stage3_run(totals, req.digestion)
    
    # Store the input digestion and output daily_gut
    update_data = {
        "digestion": req.digestion,
        "daily_gut": stage3
    }
    
    if not daily_log:
         await db.daily_logs.insert_one({"_id": doc_id, "user_id": user_id, "date": req.date, "meals": [], **update_data})
    else:
         await db.daily_logs.update_one({"_id": doc_id}, {"$set": update_data})
         
    return {"stage3": stage3}

@router.post("/mood/submit")
async def submit_mood(req: MoodSubmitRequest, current_user: dict = Depends(get_current_user)):
    """Runs stage 4 and stage 5"""
    from stage4.mood import run as stage4_run
    from stage5.metabolic import run as stage5_run
    
    stage4 = stage4_run(req.mood_input, {"totals": req.stage2_totals}, req.meal_timestamp)
    stage5 = stage5_run({"totals": req.stage2_totals}, req.meal_timestamp, req.stage0_profile)
    
    return {"stage4": stage4, "stage5": stage5}

@router.post("/sleep/log")
async def log_sleep(req: SleepLogRequest, current_user: dict = Depends(get_current_user)):
    """Runs stage 6 sleep synthesis"""
    from stage6.sleep import run as stage6_run
    db = get_db()
    
    # Ideally pull history using Mongo. We'll do a simplified run here if history isn't strictly requested.
    # To implement _load_sleep_history_7d accurately via Mongo, see phase8 docs. I will implement a placeholder.
    # Query last 7 documents:
    cursor = db.daily_logs.find({"user_id": current_user["user_id"], "date": {"$lt": req.date}}).sort("date", -1).limit(7)
    logs = await cursor.to_list(length=7)
    sleep_history = [log.get("sleep") for log in logs if log.get("sleep")]
    
    stage6 = stage6_run(req.sleep_input, sleep_history_7d=sleep_history or None)
    
    doc_id = f'{current_user["user_id"]}_{req.date}'
    daily_log = await db.daily_logs.find_one({"_id": doc_id})
    if not daily_log:
         await db.daily_logs.insert_one({"_id": doc_id, "user_id": current_user["user_id"], "date": req.date, "meals": [], "sleep": stage6})
    else:
         await db.daily_logs.update_one({"_id": doc_id}, {"$set": {"sleep": stage6}})
         
    return stage6

@router.get("/daily-log/{date}")
async def get_daily_log(date: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc_id = f'{current_user["user_id"]}_{date}'
    log = await db.daily_logs.find_one({"_id": doc_id})
    if not log:
        # Return empty structured log
        return {
           "date": date, "meals": [], "sleep": None, "daily_gut": None,
           "daily_totals": {
              "calories_kcal": 0, "carbs_g": 0, "protein_g": 0, "fat_g": 0, "fiber_g": 0
           }
        }
    log.pop("_id", None)
    return log

@router.get("/latest-log")
async def get_latest_log(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.daily_logs.find({"user_id": current_user["user_id"]}).sort("date", -1).limit(1)
    logs = await cursor.to_list(length=1)
    if not logs:
        # Return empty structured log
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return {
           "date": date, "meals": [], "sleep": None, "daily_gut": None,
           "daily_totals": {
              "calories_kcal": 0, "carbs_g": 0, "protein_g": 0, "fat_g": 0, "fiber_g": 0
           }
        }
    log = logs[0]
    log.pop("_id", None)
    return log

@router.get("/history")
async def get_history(from_date: str, to_date: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.daily_logs.find({
        "user_id": current_user["user_id"],
        "date": {"$gte": from_date, "$lte": to_date}
    }).sort("date", 1)
    logs = await cursor.to_list(length=100)
    for l in logs:
        l.pop("_id", None)
    return {"logs": logs, "count": len(logs)}

# --- Refactored Phase 6 Analytical Routes (stages 7-10) ---

async def _get_flat_records_mongo(user_id: str):
    db = get_db()
    cursor = db.daily_logs.find({"user_id": user_id}).sort("date", -1).limit(7)
    logs = await cursor.to_list(length=7)
    logs.reverse()
    
    from utils.flatten import extract_flat_record
    return [extract_flat_record(log) for log in logs]

@router.get("/trends")
async def get_trends(current_user: dict = Depends(get_current_user)):
    records = await _get_flat_records_mongo(current_user["user_id"])
    if len(records) < 7:
         raise HTTPException(status_code=400, detail="Not enough data yet (7 days required)")
    from stage7.patterns import run as stage7_run
    return stage7_run(records, skip_groq=False)

@router.get("/baselines")
async def get_baselines(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.daily_logs.find({"user_id": current_user["user_id"]}).sort("date", -1).limit(7)
    logs = await cursor.to_list(length=7)
    logs.reverse()
    
    if len(logs) < 7:
        raise HTTPException(status_code=400, detail="Not enough data yet (7 days required)")
        
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    from stage8.baseline import run as stage8_run
    
    return stage8_run(current_user["user_id"], records=logs)

@router.get("/risks")
async def get_risks(current_user: dict = Depends(get_current_user)):
    db = get_db()
    records = await _get_flat_records_mongo(current_user["user_id"])
    if len(records) < 7:
         raise HTTPException(status_code=400, detail="Not enough data yet (7 days required)")
         
    # Fetch user baselines (we need stage 8 result or profile)
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    # Use profile as fallback if baselines not created
    
    from stage9.risk import run as stage9_run
    return stage9_run(records, user)

@router.get("/insights")
async def get_insights(current_user: dict = Depends(get_current_user)):
    db = get_db()
    records = await _get_flat_records_mongo(current_user["user_id"])
    if len(records) < 7:
         raise HTTPException(status_code=400, detail="Not enough data yet (7 days required for full insights)")
         
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_log = await db.daily_logs.find_one({"_id": f'{current_user["user_id"]}_{today_date}'}) or {}

    from stage7.patterns import run as stage7_run
    from stage8.baseline import run as stage8_run
    from stage9.risk import run as stage9_run
    from stage10.insights import run as stage10_run

    stage7 = stage7_run(records, skip_groq=False)
    stage8 = stage8_run(current_user["user_id"], records=records)
    stage9 = stage9_run(records, stage8)

    pipeline_summary = {
        "baselines": stage8,
        "correlations": stage7.get("significant_correlations", []),
        "risk": stage9,
        "gut": today_log.get("daily_gut", {}),
        "sleep": today_log.get("sleep", {}),
        "metabolic": {},
        "nutrition_totals": today_log.get("daily_totals", {}),
    }

    return stage10_run(pipeline_summary, skip_groq=False)
