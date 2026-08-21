from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.finance_engine import health_score

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def get_health(user_id: str = Depends(get_current_user_id)) -> dict:
    profile = FinancialProfile(**memory.state_copy(user_id)["profile"])
    score = health_score(profile)
    return {
        **score,
        "method": "Explainable rule-based health model",
        "why": "The score is calculated from emergency runway, savings discipline, debt safety, investment progress and spending control.",
    }
