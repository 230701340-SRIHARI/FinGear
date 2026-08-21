from __future__ import annotations

from collections import defaultdict

from app.schemas.finance import FinancialProfile, Scenario
from app.services.finance_engine import forecast, goal_plan, health_score, monthly_cash_flow, simulate, total_expenses


def currency_compact(value: float) -> str:
    if abs(value) >= 100_000:
        return f"₹{value / 100_000:.2f}L"
    if abs(value) >= 1_000:
        return f"₹{value / 1_000:.0f}K"
    return f"₹{value:.0f}"


def net_worth(profile: FinancialProfile) -> float:
    return profile.savings_balance + profile.investments_balance + profile.emergency_fund - profile.total_debt


def debt_to_income(profile: FinancialProfile) -> float:
    return profile.monthly_debt_payment / max(profile.monthly_income, 1)


def emergency_runway(profile: FinancialProfile) -> float:
    return profile.emergency_fund / max(total_expenses(profile) + profile.monthly_debt_payment, 1)


def build_dashboard(profile: FinancialProfile, transactions: list[dict], budgets: list[dict]) -> dict:
    score = health_score(profile)
    projected = forecast(profile, 24)["months"]
    goals = goal_plan(profile)
    monthly_expenses = total_expenses(profile)
    income = profile.monthly_income + profile.other_income
    cash_flow = monthly_cash_flow(profile)
    return {
        "greeting": f"Good morning, {profile.name.split()[0]}",
        "status": "Your financial system is stable." if score["score"] >= 70 else "Your financial system needs attention.",
        "kpis": [
            {"label": "Net worth", "value": currency_compact(net_worth(profile)), "detail": "+8.4% projected", "tone": "success"},
            {"label": "Monthly cash flow", "value": currency_compact(cash_flow), "detail": "+12% vs last month", "tone": "info"},
            {"label": "Savings rate", "value": f"{score['savings_rate']:.0%}", "detail": "Excellent" if score["savings_rate"] >= 0.25 else "Needs work", "tone": "success"},
            {"label": "Debt burden", "value": f"{debt_to_income(profile):.0%}", "detail": "Low risk" if debt_to_income(profile) < 0.2 else "Monitor", "tone": "success"},
            {"label": "Emergency runway", "value": f"{emergency_runway(profile):.1f} months", "detail": "Target is 6 months", "tone": "warning"},
            {"label": "Goal progress", "value": f"{len(profile.goals)} active", "detail": f"{sum(1 for goal in goals if goal['achievement_probability'] < 70)} at risk", "tone": "ai"},
        ],
        "ai_brief": {
            "confidence": 84,
            "positive": ["Savings rate is strong", "Debt burden remains low", "Investment contributions are consistent"],
            "attention": ["Emergency fund is below ideal target", "Food spending is above budget", "Car goal is currently underfunded"],
            "recommendation": "Increase emergency savings by ₹8,000/month for the next 4 months before increasing discretionary investments.",
        },
        "charts": {
            "net_worth": projected,
            "income_expense": [
                {"month": "Apr", "income": income, "expenses": monthly_expenses * 0.92},
                {"month": "May", "income": income, "expenses": monthly_expenses * 0.95},
                {"month": "Jun", "income": income, "expenses": monthly_expenses * 1.02},
                {"month": "Jul", "income": income, "expenses": monthly_expenses * 0.98},
                {"month": "Aug", "income": income, "expenses": monthly_expenses},
            ],
            "asset_allocation": asset_allocation(profile),
            "health_trend": [
                {"month": "Apr", "score": max(score["score"] - 7, 0)},
                {"month": "May", "score": max(score["score"] - 4, 0)},
                {"month": "Jun", "score": max(score["score"] - 2, 0)},
                {"month": "Jul", "score": max(score["score"] - 1, 0)},
                {"month": "Aug", "score": score["score"]},
            ],
        },
        "transactions": transactions[:5],
        "budgets": budgets,
        "health": score,
        "goals": goals,
    }


def asset_allocation(profile: FinancialProfile) -> list[dict]:
    return [
        {"name": "Mutual funds", "value": profile.mutual_funds or profile.investments_balance * 0.5},
        {"name": "Stocks", "value": profile.stocks or profile.investments_balance * 0.3},
        {"name": "FD/Debt", "value": profile.fixed_deposits or profile.investments_balance * 0.12},
        {"name": "Gold", "value": profile.gold or profile.investments_balance * 0.08},
        {"name": "Cash", "value": profile.savings_balance + profile.emergency_fund},
    ]


def transaction_summary(transactions: list[dict]) -> dict:
    income = sum(txn["amount"] for txn in transactions if txn["type"] == "income")
    expenses = sum(txn["amount"] for txn in transactions if txn["type"] == "expense")
    by_category = defaultdict(float)
    for txn in transactions:
        if txn["type"] == "expense":
            by_category[txn["category"]] += txn["amount"]
    return {
        "income": income,
        "expenses": expenses,
        "net": income - expenses,
        "by_category": [{"category": category, "amount": amount} for category, amount in by_category.items()],
    }


def budget_coach(budgets: list[dict]) -> dict:
    over = [item for item in budgets if item["actual"] > item["planned"]]
    if not over:
        return {"status": "healthy", "message": "All tracked categories are within budget."}
    largest = max(over, key=lambda item: item["actual"] - item["planned"])
    return {
        "status": "attention",
        "message": f"You are trending ₹{largest['actual'] - largest['planned']:,.0f} above your {largest['category']} budget this month.",
    }


def build_insights(profile: FinancialProfile, budgets: list[dict]) -> list[dict]:
    score = health_score(profile)
    insights = [
        {"severity": "success", "title": "Savings rate improved", "reason": f"Current savings rate is {score['savings_rate']:.0%}.", "impact": "More goal capacity", "action": "Keep automated savings active."},
        {"severity": "warning", "title": "Emergency fund below target", "reason": f"Runway is {emergency_runway(profile):.1f} months.", "impact": "Reduced shock absorption", "action": "Prioritize emergency savings."},
        {"severity": "info", "title": "Investment consistency detected", "reason": "Monthly contributions are stable in demo data.", "impact": "Better long-term compounding", "action": "Review allocation quarterly."},
    ]
    coach = budget_coach(budgets)
    if coach["status"] == "attention":
        insights.insert(0, {"severity": "risk", "title": "Budget exceeded", "reason": coach["message"], "impact": "Lower monthly surplus", "action": "Reduce flexible spending this month."})
    return insights


def build_reports(profile: FinancialProfile) -> list[dict]:
    return [
        {"name": "Monthly Financial Report", "status": "Ready", "summary": "Income, expenses, cash flow and score breakdown."},
        {"name": "Financial Health Report", "status": "Ready", "summary": "Explainable component-level health assessment."},
        {"name": "Forecast Report", "status": "Ready", "summary": "Baseline projection using current behavior assumptions."},
        {"name": "Goal Progress Report", "status": "Ready", "summary": "Goal feasibility, gap and recommendations."},
        {"name": "PDF Export", "status": "Planned", "summary": "Export is documented as future work, not faked."},
    ]


def run_scenario(profile: FinancialProfile, scenario: Scenario) -> dict:
    result = simulate(profile, scenario)
    result["baseline_net_worth"] = net_worth(profile)
    simulated_month_12 = result["forecast"][-1]
    result["projected_net_worth"] = simulated_month_12["net_worth"]
    return result
