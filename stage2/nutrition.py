"""Stage 2: Nutritional Information Calibration.

Converts food labels from Stage 1 into detailed nutritional composition.
Lookup hierarchy: IFCT 2017 → USDA FoodData Central → INDB → Groq fallback.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, TypedDict

import requests

from utils.config import FDC_API_KEY, NUTRITION_DB_DIR
from utils.groq_client import chat
from utils.storage import read_json
from utils.validators import validate_stage2_input

# --- NUTRIENT KEYS (all 13 tracked by the pipeline) ---
NUTRIENT_KEYS = [
    "calories_kcal",
    "carbohydrates_g",
    "protein_g",
    "fat_g",
    "fiber_g",
    "glycemic_load",
    "tryptophan_mg",
    "omega3_mg",
    "iron_mg",
    "magnesium_mg",
    "vitamin_b6_mg",
    "vitamin_b12_ug",
    "zinc_mg",
]

# USDA FDC nutrient ID → our field name
_USDA_NUTRIENT_MAP = {
    1008: "calories_kcal",
    1005: "carbohydrates_g",
    1003: "protein_g",
    1004: "fat_g",
    1079: "fiber_g",
    1210: "tryptophan_mg",
    1404: "omega3_mg",   # ALA (alpha-linolenic acid)
    1278: "omega3_mg",   # EPA (eicosapentaenoic acid) — additive
    1272: "omega3_mg",   # DHA (docosahexaenoic acid) — additive
    1089: "iron_mg",
    1090: "magnesium_mg",
    1175: "vitamin_b6_mg",
    1178: "vitamin_b12_ug",
    1095: "zinc_mg",
}

_DEFAULT_PORTION_G = 250.0

# --- lazy-loaded DB caches ---
_ifct_db: Optional[list] = None
_indb_db: Optional[list] = None


class NutritionRecord(TypedDict):
    food_item: str
    portion_g: float
    source_db: str
    calories_kcal: float
    carbohydrates_g: float
    protein_g: float
    fat_g: float
    fiber_g: float
    glycemic_load: str
    tryptophan_mg: float
    omega3_mg: float
    iron_mg: float
    magnesium_mg: float
    vitamin_b6_mg: float
    vitamin_b12_ug: float
    zinc_mg: float


# ─── Fuzzy matching helpers ────────────────────────────────────────────────────

def _tokens(s: str) -> set[str]:
    return set(re.sub(r"[^a-z0-9 ]", "", s.lower()).split())


def _token_overlap(a: str, b: str) -> float:
    """Token overlap ratio: intersection / smaller set size.

    'dosa' vs 'masala dosa' → 1/min(1,2) = 1.0 (full subset match).
    """
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


def _levenshtein(a: str, b: str) -> int:
    """Simple Levenshtein edit distance."""
    if len(a) < len(b):
        a, b = b, a
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[-1]


def _fuzzy_match(query: str, candidate: str) -> bool:
    """Return True if query fuzzy-matches candidate (token overlap ≥ 60% or edit distance ≤ 3)."""
    if _token_overlap(query, candidate) >= 0.60:
        return True
    # Only apply edit distance for short strings to avoid false positives
    if len(query) <= 12 and len(candidate) <= 12:
        return _levenshtein(query.lower(), candidate.lower()) <= 3
    return False


def _search_db(food_name: str, db: list) -> Optional[dict]:
    """Search a local DB list for a fuzzy match. Returns the raw row or None."""
    query = food_name.lower().strip()
    for row in db:
        names_to_check = [row["food_name"]] + row.get("aliases", [])
        for name in names_to_check:
            if _fuzzy_match(query, name):
                return row
    return None


# ─── Database loaders ─────────────────────────────────────────────────────────

def _load_ifct() -> list:
    global _ifct_db
    if _ifct_db is None:
        path = NUTRITION_DB_DIR / "ifct_2017.json"
        _ifct_db = read_json(path) or []
    return _ifct_db


def _load_indb() -> list:
    global _indb_db
    if _indb_db is None:
        path = NUTRITION_DB_DIR / "indb.json"
        _indb_db = read_json(path) or []
    return _indb_db


# ─── Portion scaling ──────────────────────────────────────────────────────────

def _scale(row: dict, portion_g: float) -> dict:
    """Scale per-100g nutrient values to the given portion size."""
    factor = portion_g / 100.0
    scaled = {}
    for key in NUTRIENT_KEYS:
        if key == "glycemic_load":
            scaled[key] = row.get("glycemic_load", "medium")
        else:
            val = row.get(key, 0.0)
            scaled[key] = round(float(val) * factor, 2)
    return scaled


def _gl_from_carbs(carbs_per_100g: float) -> str:
    """Estimate glycemic load category from carbs content (per 100g)."""
    if carbs_per_100g < 10:
        return "low"
    if carbs_per_100g < 20:
        return "medium"
    return "high"


# ─── USDA FoodData Central lookup ─────────────────────────────────────────────

def _lookup_usda(food_name: str, portion_g: float) -> Optional[dict]:
    """Query USDA FDC API. Returns scaled nutrient dict or None."""
    if not FDC_API_KEY:
        return None

    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    params = {
        "query": food_name,
        "api_key": FDC_API_KEY,
        "dataType": "SR Legacy,FNDDS",
        "pageSize": 1,
    }
    try:
        resp = requests.get(url, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        foods = data.get("foods", [])
        if not foods:
            return None

        food = foods[0]
        nutrients_raw = {n["nutrientId"]: n.get("value", 0.0) for n in food.get("foodNutrients", [])}

        # Aggregate omega-3 from multiple IDs
        omega3 = 0.0
        for nid in (1404, 1278, 1272):
            omega3 += nutrients_raw.get(nid, 0.0)
        # Convert omega-3 from g to mg
        omega3_mg = omega3 * 1000

        result = {}
        for nid, field in _USDA_NUTRIENT_MAP.items():
            if nid in (1278, 1272):  # handled above in aggregation
                continue
            if nid == 1404:
                result["omega3_mg"] = round(omega3_mg * portion_g / 100, 2)
            else:
                val = nutrients_raw.get(nid, 0.0)
                if field == "calories_kcal":
                    result[field] = round(float(val) * portion_g / 100, 2)
                elif field.endswith("_mg") or field.endswith("_ug"):
                    result[field] = round(float(val) * portion_g / 100, 2)
                else:
                    result[field] = round(float(val) * portion_g / 100, 2)

        # Estimate glycemic load from unscaled carbs
        carbs_per_100g = nutrients_raw.get(1005, 0.0)
        result["glycemic_load"] = _gl_from_carbs(carbs_per_100g)

        # Fill any missing keys with 0
        for key in NUTRIENT_KEYS:
            result.setdefault(key, 0.0 if key != "glycemic_load" else "low")

        return result

    except Exception as exc:
        print(f"[stage2] USDA lookup failed for '{food_name}': {exc}")
        return None


# ─── Groq fallback ────────────────────────────────────────────────────────────

def _lookup_groq(food_name: str, portion_g: float) -> dict:
    """Use Groq to estimate nutrition. Returns nutrient dict (never fails — returns zeros on error)."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a clinical nutritionist with expertise in Indian cuisine. "
                "Respond ONLY in valid JSON. No explanation, no markdown, no prose."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Estimate the nutritional content of '{food_name}' for a {portion_g}g portion.\n"
                "Return ONLY this JSON structure with numeric values:\n"
                "{\n"
                '  "calories_kcal": <number>,\n'
                '  "carbohydrates_g": <number>,\n'
                '  "protein_g": <number>,\n'
                '  "fat_g": <number>,\n'
                '  "fiber_g": <number>,\n'
                '  "glycemic_load": "<low|medium|high>",\n'
                '  "tryptophan_mg": <number>,\n'
                '  "omega3_mg": <number>,\n'
                '  "iron_mg": <number>,\n'
                '  "magnesium_mg": <number>,\n'
                '  "vitamin_b6_mg": <number>,\n'
                '  "vitamin_b12_ug": <number>,\n'
                '  "zinc_mg": <number>\n'
                "}\n"
                "Reference: Indian foods typically range 150-600 kcal per serving. "
                "Vegetarian dishes have vitamin_b12_ug=0 unless dairy is present."
            ),
        },
    ]

    try:
        raw = chat(messages, max_tokens=400, temperature=0.1, use_cache=True)
        # Extract JSON from the response (strip any surrounding text)
        json_match = re.search(r"\{[\s\S]*\}", raw)
        if not json_match:
            raise ValueError("No JSON found in Groq response")
        result = json.loads(json_match.group())
        # Ensure all keys present, fill missing with 0
        for key in NUTRIENT_KEYS:
            result.setdefault(key, 0.0 if key != "glycemic_load" else "medium")
        return result

    except Exception as exc:
        print(f"[stage2] Groq fallback failed for '{food_name}': {exc}")
        # Return zeros rather than crashing the pipeline
        return {k: (0.0 if k != "glycemic_load" else "unknown") for k in NUTRIENT_KEYS}


# ─── Per-item lookup ──────────────────────────────────────────────────────────

def _lookup_item(food_name: str, portion_g: float) -> NutritionRecord:
    """Resolve one food item through the 4-tier hierarchy."""

    # Tier 1: IFCT 2017
    row = _search_db(food_name, _load_ifct())
    if row:
        nutrients = _scale(row, portion_g)
        return NutritionRecord(food_item=food_name, portion_g=portion_g, source_db="IFCT_2017", **nutrients)

    # Tier 2: USDA FoodData Central
    usda = _lookup_usda(food_name, portion_g)
    if usda:
        return NutritionRecord(food_item=food_name, portion_g=portion_g, source_db="USDA_FDC", **usda)

    # Tier 3: INDB
    row = _search_db(food_name, _load_indb())
    if row:
        nutrients = _scale(row, portion_g)
        return NutritionRecord(food_item=food_name, portion_g=portion_g, source_db="INDB", **nutrients)

    # Tier 4: Groq fallback
    groq_nutrients = _lookup_groq(food_name, portion_g)
    return NutritionRecord(food_item=food_name, portion_g=portion_g, source_db="groq_estimate", **groq_nutrients)


# ─── Aggregation ──────────────────────────────────────────────────────────────

_GL_ORDER = {"low": 0, "medium": 1, "high": 2, "unknown": 1}
_GL_LABELS = ["low", "medium", "high"]


def _aggregate_totals(items: list[NutritionRecord]) -> dict:
    """Sum numeric nutrients across all items; take highest glycemic_load."""
    totals: dict = {k: 0.0 for k in NUTRIENT_KEYS if k != "glycemic_load"}
    max_gl = 0
    for item in items:
        for key in NUTRIENT_KEYS:
            if key == "glycemic_load":
                max_gl = max(max_gl, _GL_ORDER.get(item.get("glycemic_load", "medium"), 1))
            else:
                totals[key] = round(totals[key] + item.get(key, 0.0), 2)
    totals["glycemic_load"] = _GL_LABELS[min(max_gl, 2)]
    return totals


# ─── Public API ───────────────────────────────────────────────────────────────

def run(stage1_output: dict, portion_g: float = _DEFAULT_PORTION_G) -> dict:
    """
    Look up nutrition for every food item from Stage 1.

    Args:
        stage1_output: Stage 1 output dict containing 'food_items' list.
        portion_g: Default portion size in grams (applied per item). Override per item
                   by passing a dict {'food_item': portion_g} as portion_g.

    Returns:
        Dict with 'items' (list of NutritionRecord), 'totals' (aggregated nutrients),
        and 'timestamp'.
    """
    errors = validate_stage2_input(stage1_output)
    if errors:
        raise ValueError(f"Invalid Stage 2 input: {errors}")

    food_items: list[str] = stage1_output["food_items"]

    # portion_g can be a per-item dict or a scalar
    def _get_portion(name: str) -> float:
        if isinstance(portion_g, dict):
            return float(portion_g.get(name, _DEFAULT_PORTION_G))
        return float(portion_g)

    items: list[NutritionRecord] = []
    for food in food_items:
        record = _lookup_item(food.strip(), _get_portion(food))
        items.append(record)

    totals = _aggregate_totals(items)

    return {
        "items": items,
        "totals": totals,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
