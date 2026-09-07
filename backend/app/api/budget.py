from collections import defaultdict
from fastapi import APIRouter, Depends, Body
from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import budget_coach
from app.services.finance_engine import get_income_tier_info

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("")
def get_budget(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    txns = state.get("transactions", [])
    
    # Calculate actual spending from all non-deleted expense transactions
    actual_by_cat = defaultdict(float)
    for t in txns:
        if not t.get("deleted_at") and not t.get("model_training_excluded") and t.get("type", "expense") == "expense":
            cat = t.get("category", "Other")
            amt = float(t.get("amount") or 0.0)
            actual_by_cat[cat] += amt

    budgets = state.get("budgets", [])
    
    # If no budgets exist, seed from profile expenses
    if not budgets:
        profile_expenses = profile.detailed_expenses or profile.monthly_expenses or []
        seeded = []
        seen = set()
        for item in profile_expenses:
            cat = item.category
            amt = float(item.amount or 0.0)
            seen.add(cat)
            seeded.append({
                "category": cat,
                "planned": amt,
                "actual": round(actual_by_cat.get(cat, 0.0), 2)
            })
        
        # Also include any category that has transactions but wasn't in profile
        for cat, amt in actual_by_cat.items():
            if cat not in seen:
                seeded.append({
                    "category": cat,
                    "planned": round(amt, 2),
                    "actual": round(amt, 2)
                })
        
        budgets = seeded
        memory.update_budgets(user_id, budgets)
    else:
        # Update existing budgets with live actuals from transactions
        seen = set()
        updated = []
        for item in budgets:
            cat = item["category"]
            seen.add(cat)
            updated.append({
                "category": cat,
                "planned": float(item.get("planned", 0.0)),
                "actual": round(actual_by_cat.get(cat, float(item.get("actual", 0.0))), 2)
            })
        
        # Include any newly logged transaction category not yet in budget list
        for cat, amt in actual_by_cat.items():
            if cat not in seen:
                updated.append({
                    "category": cat,
                    "planned": round(amt, 2),
                    "actual": round(amt, 2)
                })
        budgets = updated

    planned = sum(float(item.get("planned", 0.0)) for item in budgets)
    actual_total = sum(float(item.get("actual", 0.0)) for item in budgets)
    tier_info = get_income_tier_info(profile.monthly_income)
    
    return {
        "income": profile.monthly_income,
        "planned": round(planned, 2),
        "actual": round(actual_total, 2),
        "remaining": round(max(profile.monthly_income - planned, 0.0), 2),
        "items": budgets,
        "coach": budget_coach(profile, budgets),
        "tier_info": tier_info,
    }


@router.post("")
def save_budgets(payload: dict = Body(...), user_id: str = Depends(get_current_user_id)) -> dict:
    items = payload.get("items", [])
    updated = memory.update_budgets(user_id, items)
    return {"status": "saved", "items": updated}
