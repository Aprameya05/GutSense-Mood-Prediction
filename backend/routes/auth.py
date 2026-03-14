from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from backend.database import get_db
from backend.auth_utils import get_password_hash, verify_password, create_access_token, decode_access_token

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    db = get_db()
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

class ProfileUpdate(BaseModel):
    user_id: str
    password: str
    age: int = 30
    sex: str = "male"
    height_cm: float = 170
    weight_kg: float = 70
    diet_type: str = "omnivore"
    activity_level: str = "moderate"
    sleep_schedule: str = "23:00-07:00"
    known_conditions: list[str] = []
    supplements: list[str] = []
    medications: list[str] = []

@router.post("/register")
async def register_user(profile: ProfileUpdate):
    db = get_db()
    user_dict = profile.model_dump()
    if not user_dict.get("user_id"):
        raise HTTPException(status_code=400, detail="user_id is required")
        
    existing = await db.users.find_one({"user_id": user_dict["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
        
    # Standardize on MongoDB's built-in ID strategy
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    
    # Calculate simple BMR/TDEE for registration mock (real backend uses stage0.profile)
    from stage0.profile import _calculate_bmr, ACTIVITY_MULTIPLIERS
    bmr = _calculate_bmr(
        user_dict["weight_kg"], user_dict["height_cm"], user_dict["age"], user_dict["sex"]
    )
    mult = ACTIVITY_MULTIPLIERS.get(user_dict["activity_level"], 1.2)
    tdee = round(bmr * mult, 1)
    user_dict.update({
        "bmr_kcal": bmr,
        "tdee_kcal": tdee,
        "activity_multiplier": mult,
        "created_at": "now"
    })
    
    # We will use the generated mongodb _id, but keep user_id for semantic references
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user_dict["user_id"]})
    
    user_dict.pop("_id", None)
    user_dict.pop("hashed_password", None)
    return {"access_token": access_token, "token_type": "bearer", "user": user_dict}
    
    # Remove _id before returning
    user_dict.pop("_id", None)
    return user_dict

@router.post("/login")
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    # OAuth2 specifies 'username' for the request body, we map it to user_id
    user = await db.users.find_one({"user_id": form_data.username})
    if not user or not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Incorrect user ID or password")
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    
    user.pop("_id", None)
    user.pop("hashed_password", None)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    user = dict(current_user)
    user.pop("_id", None)
    user.pop("hashed_password", None)
    return user

@router.put("/profile")
async def update_profile(profile_updates: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["user_id"]
    
    # Strip dangerous fields
    profile_updates.pop("password", None)
    profile_updates.pop("_id", None)
    profile_updates.pop("hashed_password", None)
    profile_updates.pop("user_id", None) # Cannot change own user ID
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": profile_updates}
    )
    
    updated_user = await db.users.find_one({"user_id": user_id})
    updated_user.pop("_id", None)
    updated_user.pop("hashed_password", None)
    return updated_user
