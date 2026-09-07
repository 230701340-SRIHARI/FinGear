from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user_id
from app.ml.forecasting import ForecastEngine
from app.repositories import memory
from app.schemas.finance import FinancialProfile

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("")
def get_forecast(period: int = Query(default=24, ge=6, le=60), user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    result = ForecastEngine().predict(profile, months=period, transactions=state.get("transactions", []))
    return result.__dict__
