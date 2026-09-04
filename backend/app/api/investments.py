from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.ml.advanced_models import advanced_ml
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import asset_allocation

router = APIRouter(prefix="/investments", tags=["investments"])


@router.get("")
def get_investments(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    total = sum(item["value"] for item in state["investments"])
    monthly = sum(item["monthly_contribution"] for item in state["investments"])
    return {
        "total": total,
        "monthly_contribution": monthly,
        "estimated_return": round(advanced_ml.predict_investment_return(profile), 1),
        "items": state["investments"],
        "allocation": asset_allocation(profile),
        "disclaimer": "Projection, not guaranteed return.",
    }
