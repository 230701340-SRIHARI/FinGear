from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory

router = APIRouter(prefix="/debt", tags=["debt"])


@router.get("")
def get_debt(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    debts = state["debts"]
    total = sum(item["outstanding"] for item in debts)
    emi = sum(item["emi"] for item in debts)
    income = state["profile"]["monthly_income"]
    return {
        "total": total,
        "monthly_emi": emi,
        "debt_to_income": emi / max(income, 1),
        "debt_free_months": max((item["remaining_months"] for item in debts), default=0),
        "items": debts,
        "simulation": {"extra_emi": 2_000, "interest_saved_estimate": 9_800, "months_saved": 5},
    }
