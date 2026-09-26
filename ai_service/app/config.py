"""
SmartCity AI - Configuration Module
Loads settings from environment variables with strong defaults.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "SmartCity AI Intelligence Layer - Gorakhpur"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    
    # Internal authentication key for Node.js -> Python communication
    INTERNAL_API_KEY: str = os.getenv(
        "INTERNAL_API_KEY", 
        "smartcity_ai_internal_token_gorakhpur_2026"
    )
    
    # Node.js backend URL
    NODE_BACKEND_URL: str = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")
    
    # Model Artifacts Directory
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    MODELS_DIR: Path = BASE_DIR / "artifacts" / "models"
    
    # Guardrail & Safety limits
    MAX_ASSISTANT_TOOL_CALLS: int = 5
    REQUEST_TIMEOUT_SECONDS: float = 8.0

settings = Settings()

# Ensure artifacts directory exists
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
