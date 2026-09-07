from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def get_profile(user_id: str = Depends(get_current_user_id)) -> dict:
    return memory.state_copy(user_id)["profile"]


from app.services.financial_health import get_tier_by_income


@router.put("")
def update_profile(profile: FinancialProfile, user_id: str = Depends(get_current_user_id)) -> dict:
    data = profile.model_dump()
    tier = get_tier_by_income(data.get("monthly_income", 0))
    data["monthly_income_tier"] = tier.tier
    data["target_needs_ratio"] = tier.needs_pct
    data["target_wants_ratio"] = tier.wants_pct
    data["target_savings_ratio"] = tier.savings_pct
    return memory.update_profile(user_id, data)

