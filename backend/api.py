from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.auth import router as auth_router
from backend.routes.pipeline import router as pipeline_router

app = FastAPI(title="GutSense API", description="API backing the GutSense Mobile App")

# CORS for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
# Some aliasing handled in the frontend 
app.include_router(auth_router, prefix="/api", tags=["Auth Profile Methods"])
app.include_router(pipeline_router, prefix="/api", tags=["Pipeline Execution"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
