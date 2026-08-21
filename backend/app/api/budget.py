from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.services.financial_service import budget_coach

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("")
def get_budget(user_id: str = Depends(get_current_user_id)) -> dict:
    budgets = memory.state_copy(user_id)["budgets"]
    planned = sum(item["planned"] for item in budgets)
    actual = sum(item["actual"] for item in budgets)
    return {"income": memory.state_copy(user_id)["profile"]["monthly_income"], "planned": planned, "actual": actual, "remaining": max(memory.state_copy(user_id)["profile"]["monthly_income"] - planned, 0), "items": budgets, "coach": budget_coach(budgets)}
