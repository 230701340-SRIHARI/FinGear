from collections import defaultdict
from datetime import date
from fastapi import APIRouter, Depends, Body
from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import budget_coach
from app.services.finance_engine import get_income_tier_info
from app.services.categories import canonical_category

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("")
def get_budget(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    txns = state.get("transactions", [])
    
    # Determine active month for monthly budget tracking
    today = date.today()
    curr_month = today.strftime("%Y-%m")
    months_with_txns = sorted({str(t.get("date", ""))[:7] for t in txns if t.get("type", "expense") == "expense" and t.get("date")})
    if curr_month in months_with_txns:
        target_month = curr_month
    elif months_with_txns:
        target_month = months_with_txns[-1]
    else:
        target_month = curr_month

    # Calculate actual spending for the active monthly cycle
    actual_by_cat = defaultdict(float)
    for t in txns:
        if not t.get("deleted_at") and not t.get("model_training_excluded") and t.get("type", "expense") == "expense":
            t_month = str(t.get("date", ""))[:7]
            if t_month == target_month:
                cat = canonical_category(t.get("category", "Other"))
                amt = float(t.get("amount") or 0.0)
                actual_by_cat[cat] += amt

    saved_budgets = state.get("budgets", [])
    planned_by_cat = defaultdict(float)

    if saved_budgets:
        for item in saved_budgets:
            cat = canonical_category(item.get("category"))
            planned_by_cat[cat] += float(item.get("planned", 0.0))
    else:
        profile_expenses = profile.detailed_expenses or profile.monthly_expenses or []
        for item in profile_expenses:
            cat = canonical_category(item.category)
            planned_by_cat[cat] += float(item.amount or 0.0)

    categories = planned_by_cat.keys() | actual_by_cat.keys()
    budgets = [
        {
            "category": cat,
            "planned": round(planned_by_cat.get(cat, actual_by_cat.get(cat, 0.0)), 2),
            "actual": round(actual_by_cat.get(cat, 0.0), 2),
        }
        for cat in sorted(categories)
    ]

    if not saved_budgets:
        memory.update_budgets(user_id, budgets)

    planned = sum(float(item.get("planned", 0.0)) for item in budgets)
    actual_total = sum(float(item.get("actual", 0.0)) for item in budgets)
    tier_info = get_income_tier_info(profile.monthly_income, profile=profile)
    
    return {
        "income": profile.monthly_income,
        "planned": round(planned, 2),
        "actual": round(actual_total, 2),
        "remaining": round(max(profile.monthly_income - planned, 0.0), 2),
        "items": budgets,
        "coach": budget_coach(profile, budgets),
        "tier_info": tier_info,
        "period_month": target_month,
    }


@router.post("")
def save_budgets(payload: dict = Body(...), user_id: str = Depends(get_current_user_id)) -> dict:
    items = payload.get("items", [])
    updated = memory.update_budgets(user_id, items)
    return {"status": "saved", "items": updated}
