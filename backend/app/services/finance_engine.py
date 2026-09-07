from __future__ import annotations

from dataclasses import dataclass
from math import exp

from app.schemas.finance import ExpenseItem, FinancialProfile, Goal, Scenario


@dataclass
class ScoreComponent:
    label: str
    value: int
    reason: str


def total_expenses(profile: FinancialProfile) -> float:
    return sum(item.amount for item in profile.monthly_expenses)


def monthly_cash_flow(profile: FinancialProfile) -> float:
    return profile.monthly_income - total_expenses(profile) - profile.monthly_debt_payment


def clamp(value: float, low: float = 0, high: float = 100) -> int:
    return int(max(low, min(high, round(value))))


from app.services.financial_health import (
    BUCKET_INCOME,
    BUCKET_NEEDS,
    BUCKET_SAVINGS,
    BUCKET_WANTS,
    classify_category,
    compute_financial_health_score,
    get_tier_by_income,
)


def get_income_tier_info(income: float) -> dict:
    inc = float(income or 0.0)
    tier = get_tier_by_income(inc)
    needs_amt = round(inc * (tier.needs_pct / 100.0), 2)
    wants_amt = round(inc * (tier.wants_pct / 100.0), 2)
    savings_amt = round(inc * (tier.savings_pct / 100.0), 2)
    
    # Risk-based emergency target (Survival has ₹25,000 floor)
    emergency_target = tier.min_emergency if tier.tier == 1 else round(needs_amt * 3.0, 2)
    if tier.tier == 1 and emergency_target < 25_000:
        emergency_target = 25_000.0

    return {
        "tier": tier.tier,
        "name": tier.name,
        "range": tier.income_range,
        "needs_pct": tier.needs_pct,
        "wants_pct": tier.wants_pct,
        "savings_pct": tier.savings_pct,
        "needs_amount": needs_amt,
        "wants_amount": wants_amt,
        "savings_amount": savings_amt,
        "emergency_target": emergency_target,
        "focus": tier.focus,
        "details": tier.description,
    }


NEEDS_CATEGORIES = BUCKET_NEEDS
WANTS_CATEGORIES = BUCKET_WANTS
SAVINGS_CATEGORIES = BUCKET_SAVINGS




def compute_adaptive_503020(profile: FinancialProfile, transactions: list[dict] | None = None) -> dict:
    return compute_financial_health_score(profile, transactions=transactions)["adaptive_ratio"]


def health_score(
    profile: FinancialProfile,
    transactions: list[dict] | None = None,
    budgets: list[dict] | None = None
) -> dict:
    return compute_financial_health_score(profile, transactions=transactions, budgets=budgets)



def forecast(profile: FinancialProfile, months: int = 24) -> dict:
    from app.ml.forecasting import ForecastEngine
    result = ForecastEngine().predict(profile, months=months)
    return {"months": result.months}


def goal_plan(profile: FinancialProfile) -> list[dict]:
    cash_flow = max(monthly_cash_flow(profile), 0)
    available_for_goals = cash_flow * 0.55
    results = []
    for goal in profile.goals:
        results.append(_goal_projection(goal, available_for_goals, profile))
    return results


def _goal_projection(goal: Goal, available_monthly: float, profile: FinancialProfile = None) -> dict:
    gap = max(goal.target_amount - goal.current_amount, 0)
    required_monthly = gap / goal.target_months
    planned_monthly = goal.monthly_contribution if goal.monthly_contribution > 0 else available_monthly
    probability = 100 / (1 + exp(-(planned_monthly - required_monthly) / max(required_monthly * 0.25, 1)))
    
    if profile:
        from app.ml.advanced_models import advanced_ml
        ml_feasibility = advanced_ml.predict_goal_feasibility(profile) * 100
        probability = (probability * 0.6) + (ml_feasibility * 0.4)
    
    expected_months = None if planned_monthly <= 0 else round(gap / planned_monthly)
    projected_amount_at_deadline = round(min(goal.target_amount, goal.current_amount + (planned_monthly * goal.target_months)), 2)
    shortfall = round(max(0.0, goal.target_amount - projected_amount_at_deadline), 2)
    monthly_deficit = round(max(0.0, required_monthly - planned_monthly), 2)
    delay_months = max(0, (expected_months or goal.target_months) - goal.target_months)

    return {
        "name": goal.name,
        "target_amount": round(goal.target_amount, 2),
        "current_amount": round(goal.current_amount, 2),
        "target_months": goal.target_months,
        "target_date": goal.target_date,
        "monthly_contribution": round(goal.monthly_contribution, 2),
        "gap": round(gap, 2),
        "required_monthly": round(required_monthly, 2),
        "available_monthly": round(available_monthly, 2),
        "planned_monthly": round(planned_monthly, 2),
        "achievement_probability": clamp(probability),
        "expected_months": expected_months,
        "status": "On track" if probability >= 70 else "Needs more savings",
        "projected_amount_at_deadline": projected_amount_at_deadline,
        "shortfall": shortfall,
        "monthly_deficit": monthly_deficit,
        "delay_months": delay_months,
        "paths": {
            "path_a_extra_monthly": monthly_deficit,
            "path_b_sip_boost": round(monthly_deficit * 0.5, 2),
            "path_b_expense_cut": round(monthly_deficit * 0.5, 2),
            "path_c_delay_months": delay_months,
            "path_c_expected_months": expected_months or goal.target_months,
        }
    }


def simulate(profile: FinancialProfile, scenario: Scenario) -> dict:
    scenario_expenses = [item.model_copy() for item in profile.monthly_expenses]
    if scenario.expense_change > 0:
        scenario_expenses.append(ExpenseItem(category="Scenario change", amount=scenario.expense_change))
    elif scenario.expense_change < 0 and scenario_expenses:
        largest_index = max(range(len(scenario_expenses)), key=lambda index: scenario_expenses[index].amount)
        largest = scenario_expenses[largest_index]
        scenario_expenses[largest_index] = largest.model_copy(update={"amount": max(largest.amount + scenario.expense_change, 0)})
    if scenario.extra_monthly_investment > 0:
        scenario_expenses.append(ExpenseItem(category="Extra investment", amount=scenario.extra_monthly_investment))

    simulated_goals = [g.model_copy() for g in profile.goals]
    if scenario.target_goal_name:
        for sg in simulated_goals:
            if sg.name == scenario.target_goal_name:
                extra_cash = scenario.income_change - scenario.expense_change + scenario.extra_monthly_investment
                sg.monthly_contribution += extra_cash
                break

    simulated = profile.model_copy(
        update={
            "monthly_income": max(profile.monthly_income + scenario.income_change, 1),
            "monthly_expenses": scenario_expenses,
            "monthly_debt_payment": profile.monthly_debt_payment + scenario.new_monthly_loan_payment,
            "investments_balance": profile.investments_balance + scenario.extra_monthly_investment,
            "goals": simulated_goals,
        }
    )
    base = health_score(profile)
    changed = health_score(simulated)
    return {
        "base_score": base["score"],
        "simulated_score": changed["score"],
        "score_delta": changed["score"] - base["score"],
        "base_cash_flow": base["monthly_cash_flow"],
        "simulated_cash_flow": changed["monthly_cash_flow"],
        "cash_flow_delta": changed["monthly_cash_flow"] - base["monthly_cash_flow"],
        "recommendation": _scenario_recommendation(changed["score"] - base["score"], changed["monthly_cash_flow"]),
        "forecast": forecast(simulated, months=12)["months"],
        "goals": goal_plan(simulated),
        "scenario": scenario.model_dump(),
    }


def _scenario_recommendation(score_delta: int, cash_flow: float) -> str:
    if cash_flow < 0:
        return "High risk: this scenario creates negative monthly cash flow."
    if score_delta < -10:
        return "Proceed carefully: the decision weakens financial health significantly."
    if score_delta < 0:
        return "Manageable, but monitor cash flow and goal delays."
    return "Positive or stable scenario based on current assumptions."
