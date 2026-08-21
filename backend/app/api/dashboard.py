from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import build_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    return build_dashboard(profile, state["transactions"], state["budgets"])
