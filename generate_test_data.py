import sys
import copy
from datetime import datetime, timedelta, timezone
import random
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "gutsense")

print(f"Connecting to MongoDB at {MONGO_URI}...")
client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

BASE_RECORD = {
  "user_id": "arnav",
  "date": "2026-03-13",
  "meals": [
    {
      "stage1": {
        "food_items": [
          "masala dosa",
          "sambar",
          "coconut chutney",
          "tomato chutney"
        ],
        "en_pred": "grilled_cheese_sandwich",
        "confidence": 0.99,
        "source": "groq",
        "timestamp": "2026-03-13T20:50:03.913097+00:00"
      },
      "stage2": {
        "items": [
          {
            "food_item": "masala dosa",
            "portion_g": 250,
            "source_db": "IFCT_2017",
            "calories_kcal": 382.5,
            "carbohydrates_g": 70,
            "protein_g": 8.75,
            "fat_g": 7.5,
            "fiber_g": 3,
            "glycemic_load": "medium",
            "tryptophan_mg": 80,
            "omega3_mg": 200,
            "iron_mg": 3,
            "magnesium_mg": 55,
            "vitamin_b6_mg": 0.2,
            "vitamin_b12_ug": 0,
            "zinc_mg": 1.5
          },
          {
            "food_item": "sambar",
            "portion_g": 250,
            "source_db": "IFCT_2017",
            "calories_kcal": 137.5,
            "carbohydrates_g": 20,
            "protein_g": 7.5,
            "fat_g": 3.75,
            "fiber_g": 5,
            "glycemic_load": "low",
            "tryptophan_mg": 55,
            "omega3_mg": 75,
            "iron_mg": 3.75,
            "magnesium_mg": 75,
            "vitamin_b6_mg": 0.25,
            "vitamin_b12_ug": 0,
            "zinc_mg": 1.25
          },
          {
            "food_item": "coconut chutney",
            "portion_g": 250,
            "source_db": "IFCT_2017",
            "calories_kcal": 450,
            "carbohydrates_g": 17.5,
            "protein_g": 5,
            "fat_g": 40,
            "fiber_g": 8.75,
            "glycemic_load": "low",
            "tryptophan_mg": 30,
            "omega3_mg": 50,
            "iron_mg": 2,
            "magnesium_mg": 62.5,
            "vitamin_b6_mg": 0.1,
            "vitamin_b12_ug": 0,
            "zinc_mg": 0.75
          },
          {
            "food_item": "tomato chutney",
            "portion_g": 250,
            "source_db": "IFCT_2017",
            "calories_kcal": 450,
            "carbohydrates_g": 17.5,
            "protein_g": 5,
            "fat_g": 40,
            "fiber_g": 8.75,
            "glycemic_load": "low",
            "tryptophan_mg": 30,
            "omega3_mg": 50,
            "iron_mg": 2,
            "magnesium_mg": 62.5,
            "vitamin_b6_mg": 0.1,
            "vitamin_b12_ug": 0,
            "zinc_mg": 0.75
          }
        ],
        "totals": {
          "calories_kcal": 1420,
          "carbohydrates_g": 125,
          "protein_g": 26.25,
          "fat_g": 91.25,
          "fiber_g": 25.5,
          "tryptophan_mg": 195,
          "omega3_mg": 375,
          "iron_mg": 10.75,
          "magnesium_mg": 255,
          "vitamin_b6_mg": 0.65,
          "vitamin_b12_ug": 0,
          "zinc_mg": 4.25,
          "glycemic_load": "medium"
        },
        "timestamp": "2026-03-13T20:50:03.992938+00:00"
      },
      "stage4": {
        "mood_score": 1,
        "mood_label": "happy",
        "cognitive_state": "clear",
        "cognitive_penalty": 0,
        "energy_level": "moderate",
        "anxiety_level": "none",
        "tryptophan_context_mg": 195,
        "hours_since_meal": 0,
        "timestamp": "2026-03-13T20:50:19.141270+00:00"
      },
      "stage5": {
        "estimated_glucose_spike": "moderate",
        "spike_delta_mg_dl": 36.4,
        "fiber_attenuation_factor": 0.8088,
        "energy_crash_probability": 0.15,
        "late_meal_penalty_applied": False,
        "insulin_demand_proxy": "moderate",
        "timestamp": "2026-03-13T20:50:19.141282+00:00"
      },
      "meal_id": "2026-03-13_breakfast_1773435021323",
      "meal_time": "08:20"
    }
  ],
  "digestion": {
    "bloating": "none",
    "stool_quality": 4,
    "gas_discomfort": "none",
    "digestion_quality": "good",
    "fermented_food_today": False
  },
  "daily_gut": {
    "microbiome_diversity_index": 0.25,
    "inflammation_risk_score": 0.5,
    "inflammation_risk_level": "moderate",
    "digestion_stability_score": 1,
    "scfa_production_proxy": "low",
    "fiber_intake_today_g": 0,
    "fermented_food_consumed": False,
    "timestamp": "2026-03-13T20:50:16.093236+00:00"
  },
  "sleep": {
    "sleep_hours": 7.5,
    "sleep_debt": 0,
    "cumulative_debt_7d": 0,
    "circadian_regularity_index": 1,
    "neurological_stress_proxy": 0.5,
    "sleep_stability": "high",
    "timestamp": "2026-03-13T20:55:22.461692+00:00"
  },
  "daily_totals": {
    "magnesium_mg": 255,
    "calories_kcal": 1420,
    "tryptophan_mg": 195,
    "vitamin_b6_mg": 0.65,
    "glycemic_load": "medium",
    "iron_mg": 10.75,
    "carbohydrates_g": 125,
    "omega3_mg": 375,
    "fiber_g": 25.5,
    "fat_g": 91.25,
    "zinc_mg": 4.25,
    "vitamin_b12_ug": 0,
    "protein_g": 26.25
  }
}

def generate_random_time(date_str, hour, minute):
    return f"{date_str}T{hour:02d}:{minute:02d}:00.000000+00:00"

def get_varied_record(base_record, target_date):
    record = copy.deepcopy(base_record)
    date_str = target_date.strftime("%Y-%m-%d")
    
    # 1. Update basic fields
    record["date"] = date_str
    record["_id"] = f"{record['user_id']}_{date_str}"
    
    # 2. Random variation to test trends:
    # Let's add some randomized patterns
    is_weekend = target_date.weekday() >= 5
    
    # Sleep pattern
    if is_weekend:
        sleep_hours = random.uniform(8.0, 10.0)
    else:
        sleep_hours = random.uniform(5.5, 7.5)
    
    record["sleep"]["sleep_hours"] = round(sleep_hours, 1)
    record["sleep"]["sleep_debt"] = max(0, 7.5 - sleep_hours)
    
    # Fiber/MDI pattern
    fiber = random.randint(5, 35)
    record["daily_totals"]["fiber_g"] = fiber
    
    # Let's say high fiber = high MDI
    mdi = min(1.0, max(0.1, (fiber / 35.0) + random.uniform(-0.1, 0.1)))
    record["daily_gut"]["microbiome_diversity_index"] = round(mdi, 2)
    record["daily_gut"]["fiber_intake_today_g"] = fiber
    
    # Mood pattern (correlation with sleep and fiber)
    mood_score = 0
    if sleep_hours > 7:
        mood_score += 1
    elif sleep_hours < 6:
        mood_score -= 1
        
    if fiber > 25:
        mood_score += 1
    elif fiber < 15:
        mood_score -= 1
        
    record["meals"][0]["stage4"]["mood_score"] = max(-2, min(2, mood_score))
    mood_labels = {-2: "sad", -1: "worried", 0: "neutral", 1: "happy", 2: "very_happy"}
    record["meals"][0]["stage4"]["mood_label"] = mood_labels.get(mood_score, "neutral")

    # Fast forward timestamps
    record["meals"][0]["stage1"]["timestamp"] = generate_random_time(date_str, 8, 30)
    record["meals"][0]["stage2"]["timestamp"] = generate_random_time(date_str, 8, 30)
    record["meals"][0]["stage4"]["timestamp"] = generate_random_time(date_str, 9, 0)
    record["meals"][0]["stage5"]["timestamp"] = generate_random_time(date_str, 9, 5)
    record["meals"][0]["meal_id"] = f"{date_str}_breakfast_{random.randint(1000,9999)}"
    record["meals"][0]["meal_time"] = f"08:{random.randint(10,59)}"
    
    record["daily_gut"]["timestamp"] = generate_random_time(date_str, 20, 0)
    record["sleep"]["timestamp"] = generate_random_time(date_str, 6, 30)
    
    return record


def main():
    today = datetime.now()
    
    print("Generating and inserting past 30 days of data...")
    count = 0
    
    for i in range(30, 0, -1):
        target_date = today - timedelta(days=i)
        record = get_varied_record(BASE_RECORD, target_date)
        
        # Upsert log into MongoDB
        db.daily_logs.update_one(
            {"_id": record["_id"]},
            {"$set": record},
            upsert=True
        )
        count += 1
        print(f"Generated data for {record['date']} (Sleep: {record['sleep']['sleep_hours']}h | Mood: {record['meals'][0]['stage4']['mood_score']} | Fiber: {record['daily_totals']['fiber_g']}g)")
        
    print(f"\n✅ Successfully inserted {count} records into '{MONGO_DB_NAME}.daily_logs'.")

if __name__ == "__main__":
    main()
