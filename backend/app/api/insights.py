from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import build_insights

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def get_insights(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    return {"insights": build_insights(FinancialProfile(**state["profile"]), state["budgets"])}
