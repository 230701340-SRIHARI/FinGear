from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def get_profile(user_id: str = Depends(get_current_user_id)) -> dict:
    return memory.state_copy(user_id)["profile"]


@router.put("")
def update_profile(profile: FinancialProfile, user_id: str = Depends(get_current_user_id)) -> dict:
    return memory.update_profile(user_id, profile.model_dump())
