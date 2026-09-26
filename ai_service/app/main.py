"""
SmartCity AI - Master FastAPI Application Entry Point
Modular AI Intelligence Layer for Gorakhpur Municipal Operations.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.config import settings
from app.api.routes import (
    health,
    traffic,
    waste,
    water,
    healthcare,
    emergency,
    parking,
    environment,
    assistant
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[AI Service] SmartCity AI Intelligence Layer v{settings.VERSION} starting...")
    print(f"[AI Service] Environment: {settings.ENVIRONMENT} | Port: {settings.PORT}")
    print("[AI Service] Internal API Key Authentication: Active")
    yield
    print("[AI Service] Shutting down AI Intelligence Service.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-style modular AI Intelligence Layer for Gorakhpur Smart City.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modular routers
app.include_router(health.router)
app.include_router(traffic.router)
app.include_router(waste.router)
app.include_router(water.router)
app.include_router(healthcare.router)
app.include_router(emergency.router)
app.include_router(parking.router)
app.include_router(environment.router)
app.include_router(assistant.router)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
