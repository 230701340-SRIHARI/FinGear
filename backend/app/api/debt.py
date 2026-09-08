from datetime import date, timedelta
from fastapi import APIRouter, Body, Depends, HTTPException

from app.core.security import get_current_user_id
from app.repositories import memory

router = APIRouter(prefix="/debt", tags=["debt"])


@router.get("")
def get_debt(user_id: str = Depends(get_current_user_id)) -> dict:
    # 1. Automatically process any due monthly payments for active debts with auto-deduct enabled
    memory.process_monthly_debts(user_id)

    state = memory.state_copy(user_id)
    debts = state.get("debts", [])
    profile = state.get("profile", {})

    # If profile has total_debt > 0 but debts is empty, seed a default debt item with rich tenure
    if not debts and float(profile.get("total_debt", 0.0)) > 0:
        tot = float(profile["total_debt"])
        emi = float(profile.get("monthly_debt_payment") or round(tot * 0.03, 2))
        total_tenure = 36
        elapsed = 12
        remaining = total_tenure - elapsed
        orig_principal = round(tot * 1.35, 2)
        start_dt = (date.today() - timedelta(days=elapsed * 30)).strftime("%Y-%m-01")
        end_dt = (date.today() + timedelta(days=remaining * 30)).strftime("%Y-%m-01")

        seeded = memory.add_debt(user_id, {
            "name": "HDFC Auto / Vehicle Loan",
            "loan_type": "Car / Vehicle Loan",
            "lender": "HDFC Bank",
            "principal": orig_principal,
            "outstanding": tot,
            "interest_rate": 9.5,
            "emi": emi,
            "total_tenure_months": total_tenure,
            "tenure_elapsed_months": elapsed,
            "remaining_months": remaining,
            "start_date": start_dt,
            "end_date": end_dt,
            "emi_day": 5,
            "auto_deduct": True,
            "status": "active",
        })
        debts = [seeded]

    active_debts = [d for d in debts if d.get("status") != "paid_off"]
    total = sum(float(item.get("outstanding", 0.0)) for item in active_debts)
    emi = sum(float(item.get("emi", 0.0)) for item in active_debts)
    income = float(profile.get("monthly_income", 0.0))

    return {
        "total": total,
        "monthly_emi": emi,
        "debt_to_income": round(emi / max(income, 1.0), 3),
        "debt_free_months": max((int(item.get("remaining_months", 0)) for item in active_debts), default=0),
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


@router.post("/{debt_id}/pay-emi")
def pay_debt_emi(debt_id: str, payload: dict = Body(default={}), user_id: str = Depends(get_current_user_id)) -> dict:
    """Execute / record scheduled monthly EMI payment for this loan."""
    try:
        result = memory.pay_debt_emi(user_id, debt_id, payload)
        return {
            "message": "Monthly EMI payment applied successfully",
            "debt": result["debt"],
            "receipt": result["receipt"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{debt_id}/prepay")
def prepay_debt(debt_id: str, payload: dict = Body(...), user_id: str = Depends(get_current_user_id)) -> dict:
    amount = float(payload.get("amount", 0.0))
    strategy = str(payload.get("strategy", "reduce_tenure"))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Prepayment amount must be greater than zero")
    try:
        updated = memory.prepay_debt(user_id, debt_id, amount, strategy=strategy)
        return {"message": "Prepayment applied successfully", "debt": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/process-monthly")
def process_monthly_debts(user_id: str = Depends(get_current_user_id)) -> dict:
    """Explicitly trigger auto-deduct / auto-progress for all active debts due this month."""
    processed = memory.process_monthly_debts(user_id)
    return {
        "message": f"Processed {len(processed)} monthly debt EMI payments",
        "processed": processed,
    }

