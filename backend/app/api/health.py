from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.ml.health_model import ExplainableHealthModel
from app.repositories import memory
from app.schemas.finance import FinancialProfile

router = APIRouter(prefix="/health", tags=["health"])
health_engine = ExplainableHealthModel()


@router.get("")
def get_health(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    transactions = state.get("transactions", [])
    budgets = state.get("budgets", [])
    return health_engine.score(profile, transactions=transactions, budgets=budgets)
