from fastapi import APIRouter, Body, Depends, HTTPException

from app.core.security import get_current_user_id
from app.repositories import memory

router = APIRouter(prefix="/debt", tags=["debt"])


@router.get("")
def get_debt(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    debts = state.get("debts", [])
    profile = state.get("profile", {})

    # If profile has total_debt > 0 but debts is empty, seed a default debt item
    if not debts and float(profile.get("total_debt", 0.0)) > 0:
        tot = float(profile["total_debt"])
        emi = float(profile.get("monthly_debt_payment") or round(tot * 0.03, 2))
        seeded = memory.add_debt(user_id, {
            "name": "Personal / Vehicle Loan",
            "principal": tot,
            "outstanding": tot,
            "interest_rate": 10.5,
            "emi": emi,
            "remaining_months": max(12, int(tot / max(1.0, emi))),
        })
        debts = [seeded]

    total = sum(float(item.get("outstanding", 0.0)) for item in debts)
    emi = sum(float(item.get("emi", 0.0)) for item in debts)
    income = float(profile.get("monthly_income", 0.0))

    return {
        "total": total,
        "monthly_emi": emi,
        "debt_to_income": round(emi / max(income, 1.0), 3),
        "debt_free_months": max((int(item.get("remaining_months", 0)) for item in debts), default=0),
        "items": debts,
        "simulation": {"extra_emi": 2_000, "interest_saved_estimate": 9_800, "months_saved": 5},
    }


@router.post("")
def add_debt(payload: dict = Body(...), user_id: str = Depends(get_current_user_id)) -> dict:
    debt = memory.add_debt(user_id, payload)
    return {"message": "Debt added successfully", "debt": debt}


@router.put("/{debt_id}")
def update_debt(debt_id: str, payload: dict = Body(...), user_id: str = Depends(get_current_user_id)) -> dict:
    try:
        updated = memory.update_debt(user_id, debt_id, payload)
        return {"message": "Debt updated successfully", "debt": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{debt_id}")
def delete_debt(debt_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    memory.delete_debt(user_id, debt_id)
    return {"message": "Debt deleted successfully"}


@router.post("/{debt_id}/prepay")
def prepay_debt(debt_id: str, payload: dict = Body(...), user_id: str = Depends(get_current_user_id)) -> dict:
    amount = float(payload.get("amount", 0.0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Prepayment amount must be greater than zero")
    try:
        updated = memory.prepay_debt(user_id, debt_id, amount)
        return {"message": "Prepayment applied successfully", "debt": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
