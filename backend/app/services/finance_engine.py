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


def health_score(profile: FinancialProfile) -> dict:
    expenses = total_expenses(profile)
    cash_flow = monthly_cash_flow(profile)
    savings_rate = max(cash_flow, 0) / profile.monthly_income
    debt_ratio = profile.monthly_debt_payment / profile.monthly_income
    emergency_months = profile.emergency_fund / max(expenses + profile.monthly_debt_payment, 1)
    investment_ratio = profile.investments_balance / max(profile.monthly_income * 12, 1)
    spending_ratio = expenses / profile.monthly_income

    components = [
        ScoreComponent(
            "Emergency fund",
            clamp((emergency_months / 6) * 100),
            f"Covers {emergency_months:.1f} months of expenses; target is 6 months.",
        ),
        ScoreComponent(
            "Savings discipline",
            clamp((savings_rate / 0.25) * 100),
            f"Monthly free cash flow is {savings_rate:.0%} of income; target is 25%.",
        ),
        ScoreComponent(
            "Debt safety",
            clamp(100 - (debt_ratio / 0.4) * 100),
            f"Debt payments use {debt_ratio:.0%} of income; safer range is below 30-40%.",
        ),
        ScoreComponent(
            "Investment progress",
            clamp((investment_ratio / 1.0) * 100),
            "Compares current investments with one year of income.",
        ),
        ScoreComponent(
            "Spending control",
            clamp(100 - max(0, spending_ratio - 0.55) / 0.45 * 100),
            f"Core expenses use {spending_ratio:.0%} of income.",
        ),
    ]
    score = round(sum(component.value for component in components) / len(components))
    suggestions = []
    if emergency_months < 3:
        suggestions.append("Build emergency fund toward at least 3 months first.")
    if savings_rate < 0.15:
        suggestions.append("Reduce flexible expenses or automate savings to improve cash flow.")
    if debt_ratio > 0.35:
        suggestions.append("Avoid new loans until debt payments fall below 35% of income.")
    if investment_ratio < 0.5:
        suggestions.append("Increase consistent investing once emergency savings are stable.")
    if not suggestions:
        suggestions.append("Profile is stable; focus on goal planning and investment consistency.")

    return {
        "score": score,
        "grade": "Excellent" if score >= 80 else "Good" if score >= 65 else "Needs attention",
        "components": [component.__dict__ for component in components],
        "suggestions": suggestions,
        "monthly_cash_flow": round(cash_flow, 2),
        "savings_rate": round(savings_rate, 4),
    }


def forecast(profile: FinancialProfile, months: int = 24) -> dict:
    cash_flow = monthly_cash_flow(profile)
    monthly_growth = 0.006
    rows = []
    savings = profile.savings_balance
    investments = profile.investments_balance
    for month in range(1, months + 1):
        savings += max(cash_flow, 0) * 0.55
        investments = investments * (1 + monthly_growth) + max(cash_flow, 0) * 0.45
        net_worth = savings + investments - profile.total_debt
        rows.append(
            {
                "month": month,
                "savings": round(savings, 2),
                "investments": round(investments, 2),
                "net_worth": round(net_worth, 2),
                "cash_flow": round(cash_flow, 2),
            }
        )
    return {"months": rows}


def goal_plan(profile: FinancialProfile) -> list[dict]:
    cash_flow = max(monthly_cash_flow(profile), 0)
    available_for_goals = cash_flow * 0.55
    results = []
    for goal in profile.goals:
        results.append(_goal_projection(goal, available_for_goals))
    return results


def _goal_projection(goal: Goal, available_monthly: float) -> dict:
    gap = max(goal.target_amount - goal.current_amount, 0)
    required_monthly = gap / goal.target_months
    planned_monthly = goal.monthly_contribution if goal.monthly_contribution > 0 else available_monthly
    probability = 100 / (1 + exp(-(planned_monthly - required_monthly) / max(required_monthly * 0.25, 1)))
    expected_months = None if planned_monthly <= 0 else round(gap / planned_monthly)
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

    simulated = profile.model_copy(
        update={
            "monthly_income": max(profile.monthly_income + scenario.income_change, 1),
            "monthly_expenses": scenario_expenses,
            "monthly_debt_payment": profile.monthly_debt_payment + scenario.new_monthly_loan_payment,
            "investments_balance": profile.investments_balance + scenario.extra_monthly_investment,
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
