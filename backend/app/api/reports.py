from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import build_reports

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def get_reports(user_id: str = Depends(get_current_user_id)) -> dict:
    return {"reports": build_reports(FinancialProfile(**memory.state_copy(user_id)["profile"]))}
