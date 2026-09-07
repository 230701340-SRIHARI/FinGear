from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.finance_engine import get_income_tier_info

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("")
def get_timeline(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    txns = state.get("transactions", [])
    tier = get_income_tier_info(profile.monthly_income)
    
    events = list(state.get("events", []))
    
    today = date.today()
    current_month_str = today.strftime("%b %Y")
    
    # 1. Upcoming Next Salary Event
    salary_day = getattr(profile, "salary_day", 1) or 1
    next_month = today.month + 1 if today.day >= salary_day else today.month
    next_year = today.year + (1 if next_month > 12 else 0)
    next_month = 1 if next_month > 12 else next_month
    try:
        salary_date = date(next_year, next_month, min(salary_day, 28))
    except Exception:
        salary_date = today + timedelta(days=15)
        
    events.append({
        "id": "event-salary-upcoming",
        "period": salary_date.strftime("%d %b %Y"),
        "title": "Scheduled Salary Credit",
        "value": f"+₹{profile.monthly_income:,.0f}",
        "type": "Upcoming Income",
        "tone": "success",
        "description": f"Automated recurring income schedule for {profile.income_type or 'Salaried'} profile."
    })

    # 2. Upcoming EMI Due if user has debt
    if profile.monthly_debt_payment > 0:
        events.append({
            "id": "event-emi-upcoming",
            "period": f"10 {current_month_str}",
            "title": "Monthly Debt Obligation (EMI)",
            "value": f"-₹{profile.monthly_debt_payment:,.0f}",
            "type": "Liability Due",
            "tone": "warning",
            "description": f"Scheduled repayment toward total outstanding liabilities of ₹{profile.total_debt:,.0f}."
        })

    # 3. Active Transactions (recent)
    for t in txns[:6]:
        if t.get("deleted_at") or t.get("model_training_excluded"):
            continue
        amt = float(t.get("amount") or 0.0)
        is_income = t.get("type") == "income"
        raw_d = str(t.get("date") or t.get("transaction_date") or today.isoformat())[:10]
        try:
            d_obj = date.fromisoformat(raw_d)
            formatted_date = d_obj.strftime("%d %b %Y")
        except Exception:
            formatted_date = raw_d
            
        events.append({
            "id": f"txn-{t.get('id', raw_d)}",
            "period": formatted_date,
            "title": t.get("description") or t.get("category") or "Tracked Transaction",
            "value": f"{'+' if is_income else '-'}₹{amt:,.0f}",
            "type": "Verified Income" if is_income else f"Expense: {t.get('category', 'Needs')}",
            "tone": "success" if is_income else "info",
            "description": f"Classified under {t.get('category', 'Discretionary')}."
        })

    # 4. Active Goals Milestones
    for g in getattr(profile, "goals", []):
        t_amt = float(getattr(g, "target_amount", 0.0) or 0.0)
        c_amt = float(getattr(g, "current_amount", 0.0) or 0.0)
        t_date = getattr(g, "target_date", "") or "Target Horizon"
        if t_amt > 0:
            events.append({
                "id": f"goal-{getattr(g, 'name', 'goal')}",
                "period": str(t_date)[:10],
                "title": f"Goal Horizon: {getattr(g, 'name', 'Financial Goal')}",
                "value": f"Target: ₹{t_amt:,.0f}",
                "type": "Goal Target",
                "tone": "ai",
                "description": f"Currently at ₹{c_amt:,.0f} ({round((c_amt / t_amt) * 100, 1)}% achieved)."
            })

    # 5. Baseline Profile Setup Event
    events.append({
        "id": "event-profile-established",
        "period": (today - timedelta(days=30)).strftime("%b %Y"),
        "title": f"Digital Twin Initialized (Tier {tier['tier']}: {tier['name']})",
        "value": f"Income: ₹{profile.monthly_income:,.0f}",
        "type": "System Milestone",
        "tone": "ai",
        "description": f"Initialized with {tier['needs_pct']}% Needs, {tier['wants_pct']}% Wants, {tier['savings_pct']}% Savings baseline."
    })

    return {"events": events}
