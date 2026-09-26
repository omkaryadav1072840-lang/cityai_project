"""
SmartCity AI - Grounded City Assistant Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant_service import AssistantService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/assistant", tags=["Assistant AI"])

@router.post("/chat", response_model=AssistantQueryResponse, dependencies=[Depends(verify_internal_key)])
async def chat_with_city_assistant(payload: AssistantQueryRequest):
    return AssistantService.process_query(payload)
