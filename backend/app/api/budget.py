from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.services.financial_service import budget_coach

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("")
def get_budget(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    budgets = state["budgets"]
    from app.schemas.finance import FinancialProfile
    profile = FinancialProfile(**state["profile"])
    planned = sum(item["planned"] for item in budgets)
    actual = sum(item["actual"] for item in budgets)
    return {"income": profile.monthly_income, "planned": planned, "actual": actual, "remaining": max(profile.monthly_income - planned, 0), "items": budgets, "coach": budget_coach(profile, budgets)}
