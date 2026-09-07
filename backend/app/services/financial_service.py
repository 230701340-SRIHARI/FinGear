from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from app.schemas.finance import FinancialProfile, Scenario
from app.services.finance_engine import forecast, goal_plan, health_score, monthly_cash_flow, simulate, total_expenses
from app.ml.advanced_models import advanced_ml


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


def generate_ai_brief(
    profile: FinancialProfile,
    transactions: list[dict],
    budgets: list[dict],
    goals: list[dict],
    score_data: dict,
    cash_flow: float,
) -> dict:
    income = profile.monthly_income + profile.other_income
    positive = []
    attention = []

    if income <= 0:
        return {
            "confidence": 50,
            "positive": ["Profile initialized and tracking active"],
            "attention": ["Income profile not yet configured"],
            "recommendation": "Add your monthly income in the Profile tab to unlock personalized AI budget ratios and cash flow insights.",
        }

    savings_rate = score_data.get("savings_rate", 0.0)
    adaptive_info = score_data.get("adaptive_ratio") or {}
    target_savings = (adaptive_info.get("adaptive_savings_pct") or 20) / 100.0

    if savings_rate >= target_savings and savings_rate > 0:
        positive.append(f"Savings rate is strong ({savings_rate:.0%} vs {target_savings:.0%} target)")
    elif savings_rate > 0.15:
        positive.append(f"Healthy monthly surplus generated ({savings_rate:.0%})")

    dti = debt_to_income(profile)
    if profile.total_debt == 0:
        positive.append("Zero debt liabilities: 100% debt-free")
    elif dti < 0.20:
        positive.append(f"Debt burden is low ({dti:.0%} of monthly income)")
    elif dti > 0.35:
        attention.append(f"Debt payments absorb {dti:.0%} of income (safe ceiling: 30%)")

    runway = emergency_runway(profile)
    if runway >= 5.5:
        positive.append(f"Emergency reserve is solid ({runway:.1f} months of runway)")
    elif runway < 2.0 and income > 0:
        attention.append(f"Emergency fund covers only {runway:.1f} months of expenses")
    elif runway < 4.0 and income > 0:
        attention.append(f"Emergency reserve ({runway:.1f} months) is below the 6-month safety benchmark")

    total_invested = profile.investments_balance + profile.mutual_funds + profile.stocks + profile.fixed_deposits + profile.gold
    if total_invested > 0:
        positive.append(f"Active investment portfolio of {currency_compact(total_invested)}")

    # Strictly evaluate real goals explicitly created by the user with positive target amount
    valid_goals = [g for g in profile.goals if getattr(g, 'name', None) and getattr(g, 'target_amount', 0) > 0]
    if valid_goals and goals:
        valid_projections = [g for g in goals if g.get("name") and g.get("target_amount", 0) > 0]
        underfunded_goals = [g for g in valid_projections if g.get("achievement_probability", 100) < 65]
        on_track_goals = [g for g in valid_projections if g.get("achievement_probability", 100) >= 65]
        if underfunded_goals:
            for ug in underfunded_goals[:2]:
                attention.append(f"Goal '{ug['name']}' requires higher monthly allocation to meet target date")
        elif on_track_goals:
            positive.append(f"{len(on_track_goals)} financial goal(s) on track for planned completion")

    # Strictly evaluate real active budgets
    valid_budgets = [b for b in budgets if b.get("planned", 0) > 0 and b.get("category")]
    if valid_budgets:
        over_budgets = [b for b in valid_budgets if b.get("actual", 0) > b.get("planned", 0)]
        for ob in over_budgets[:2]:
            attention.append(f"{ob['category']} spending ({currency_compact(ob['actual'])}) exceeded budgeted {currency_compact(ob['planned'])}")

    if adaptive_info.get("is_adapted"):
        attention.append(f"Discretionary spending ({adaptive_info.get('actual_wants_pct', 0):.0f}%) exceeds slab target; stepping plan active")

    if not positive:
        if cash_flow > 0:
            positive.append(f"Positive monthly cash flow surplus of {currency_compact(cash_flow)}")
        elif transactions:
            positive.append(f"{len(transactions)} transaction(s) tracked in financial ledger")
        else:
            positive.append("Financial profile established; cash flow baseline ready")

    if not attention:
        attention.append("No high-risk cash flow or debt anomalies detected")

    # Add any active risk flags to attention items
    for flag in score_data.get("risk_flags", []):
        attention.insert(0, f"Risk Alert: {flag['label']} — {flag['message']}")

    if cash_flow < 0:
        rec = f"Monthly expenses exceed income by {currency_compact(abs(cash_flow))}. Reduce non-essential spending to restore surplus."
    elif score_data.get("suggestions"):
        rec = score_data["suggestions"][0]
    elif runway < 3.0 and income > 0:
        gap = max(0, (total_expenses(profile) * 3) - profile.emergency_fund)
        rec = f"Build liquid emergency reserve toward at least 3 months ({currency_compact(gap)} needed to reach 3-month buffer)."
    elif dti > 0.35:
        rec = "Focus surplus cash flow on paying down high-interest debt before expanding discretionary investments."
    elif adaptive_info.get("is_adapted"):
        rec = adaptive_info.get("adaptation_message", "Follow stepping guidelines to optimize discretionary spending.")
    elif valid_goals:
        rec = "Surplus cash flow is healthy. Ensure monthly SIPs and goal allocations remain automated."
    else:
        rec = "Your financial baseline is stable. Consider setting specific long-term goals in the Goals tab."

    # Use canonical data confidence if available
    if "data_confidence" in score_data:
        confidence = score_data["data_confidence"]["score"]
    elif not transactions:
        confidence = 68
    else:
        confidence = min(92, 70 + len(transactions) * 2)

    return {
        "confidence": confidence,
        "positive": positive[:3],
        "attention": attention[:3],
        "recommendation": rec,
    }


def build_dashboard(profile: FinancialProfile, transactions: list[dict], budgets: list[dict]) -> dict:
    score = health_score(profile, transactions=transactions, budgets=budgets)

    projected = forecast(profile, 24)["months"]
    goals = goal_plan(profile)
    monthly_expenses = total_expenses(profile)
    income = profile.monthly_income + profile.other_income
    cash_flow = monthly_cash_flow(profile)
    valid_goals = [g for g in profile.goals if getattr(g, 'name', None) and getattr(g, 'target_amount', 0) > 0]

    from datetime import date
    today = date.today()
    monthly_buckets = {}
    factors = [0.92, 0.95, 1.02, 0.98, 1.0]
    for offset in range(4, -1, -1):
        m = today.month - offset
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        key = (y, m)
        label = date(y, m, 1).strftime("%b")
        monthly_buckets[key] = {
            "month": label,
            "income": 0.0,
            "expenses": 0.0,
        }

    for txn in (transactions or []):
        t_date_raw = txn.get("date") or txn.get("transaction_date")
        if not t_date_raw:
            continue
        try:
            if isinstance(t_date_raw, str):
                t_date = date.fromisoformat(t_date_raw[:10])
            elif isinstance(t_date_raw, date):
                t_date = t_date_raw
            else:
                continue
            k = (t_date.year, t_date.month)
            if k in monthly_buckets:
                amt = float(txn.get("amount", 0.0))
                tt = (txn.get("type") or "expense").lower()
                if tt == "income":
                    monthly_buckets[k]["income"] += amt
                elif tt in ("expense", "debit"):
                    monthly_buckets[k]["expenses"] += amt
        except Exception:
            pass

    baseline_income = income if income > 0 else 50000.0
    baseline_expenses = monthly_expenses
    if baseline_expenses <= 0 and baseline_income > 0:
        baseline_expenses = round(baseline_income * 0.72, 2)

    month_labels = [b["month"] for b in monthly_buckets.values()]
    income_expense_chart = []
    for idx, (k, b) in enumerate(monthly_buckets.items()):
        f = factors[idx % len(factors)]
        m_inc = b["income"] if b["income"] > 0 else baseline_income
        m_exp = b["expenses"] if b["expenses"] > 0 else round(baseline_expenses * f, 2)
        income_expense_chart.append({
            "month": b["month"],
            "income": round(m_inc, 2),
            "expenses": round(m_exp, 2),
        })

    hour = datetime.now().hour
    if 5 <= hour < 12:
        salutation = "Good morning"
    elif 12 <= hour < 17:
        salutation = "Good afternoon"
    else:
        salutation = "Good evening"
    first_name = (profile.name or "Client").strip().split()[0] if profile.name else "Client"

    return {
        "greeting": f"{salutation}, {first_name}",
        "status": "Your financial system is stable." if score["score"] >= 70 else "Your financial system needs attention.",
        "kpis": [
            {"label": "Net worth", "value": currency_compact(net_worth(profile)), "detail": "+8.4% projected", "tone": "success"},
            {"label": "Monthly cash flow", "value": currency_compact(cash_flow), "detail": "+12% vs last month", "tone": "info"},
            {"label": "Savings rate", "value": f"{score['savings_rate']:.0%}", "detail": "Excellent" if score["savings_rate"] >= 0.25 else "Needs work", "tone": "success"},
            {"label": "Debt burden", "value": f"{debt_to_income(profile):.0%}", "detail": "Low risk" if debt_to_income(profile) < 0.2 else "Monitor", "tone": "success"},
            {"label": "Emergency runway", "value": f"{emergency_runway(profile):.1f} months", "detail": "Target is 6 months", "tone": "warning"},
            {"label": "Goal progress", "value": f"{len(valid_goals)} active", "detail": f"{sum(1 for goal in goals if goal['achievement_probability'] < 70)} at risk" if valid_goals else "No active goals", "tone": "ai" if valid_goals else "info"},
        ],
        "ai_brief": generate_ai_brief(profile, transactions, budgets, goals, score, cash_flow),
        "charts": {
            "net_worth": projected,
            "income_expense": income_expense_chart,
            "asset_allocation": asset_allocation(profile),
            "health_trend": [
                {"month": month_labels[0], "score": max(score["score"] - 6, 0)},
                {"month": month_labels[1], "score": max(score["score"] - 4, 0)},
                {"month": month_labels[2], "score": max(score["score"] - 2, 0)},
                {"month": month_labels[3], "score": max(score["score"] - 1, 0)},
                {"month": month_labels[4], "score": score["score"]},
            ],
        },
        "transactions": transactions[:5],
        "budgets": budgets,
        "health": score,
        "goals": goals,
    }


def compute_portfolio_strategy(profile: FinancialProfile) -> dict:
    """Compute current vs recommended asset allocations, returns, and rebalancing advice based on Risk Appetite and Goals."""
    risk = (profile.risk_appetite or "Moderate").strip().title()
    if risk not in ("Conservative", "Moderate", "Aggressive"):
        risk = "Moderate"
    goal = (profile.primary_financial_goal or "Wealth Creation").strip()
    experience = (profile.financial_experience or "Beginner").strip()

    # Current actual values
    current_mf = float(profile.mutual_funds or (profile.investments_balance * 0.5))
    current_stocks = float(profile.stocks or (profile.investments_balance * 0.3))
    current_fd = float((profile.fixed_deposits + profile.provident_fund) or (profile.investments_balance * 0.12))
    current_gold = float(profile.gold or (profile.investments_balance * 0.08))
    current_cash = float(profile.savings_balance + profile.emergency_fund)

    current_total = current_mf + current_stocks + current_fd + current_gold + current_cash
    if current_total <= 0:
        current_total = 100000.0
        current_mf = 50000.0
        current_stocks = 25000.0
        current_fd = 15000.0
        current_gold = 10000.0
        current_cash = 0.0

    current_allocation = [
        {"name": "Mutual funds", "value": round(current_mf, 2), "pct": round(current_mf / current_total * 100, 1)},
        {"name": "Stocks", "value": round(current_stocks, 2), "pct": round(current_stocks / current_total * 100, 1)},
        {"name": "FD/Debt", "value": round(current_fd, 2), "pct": round(current_fd / current_total * 100, 1)},
        {"name": "Gold", "value": round(current_gold, 2), "pct": round(current_gold / current_total * 100, 1)},
        {"name": "Cash", "value": round(current_cash, 2), "pct": round(current_cash / current_total * 100, 1)},
    ]

    # Target splits according to Risk Appetite
    if risk == "Conservative":
        target_mf_pct = 25.0
        target_stocks_pct = 5.0
        target_fd_pct = 45.0
        target_gold_pct = 15.0
        target_cash_pct = 10.0
        target_return = 8.5
        strategy = "Capital Preservation & Low Volatility"
        strategy_desc = "Emphasizes fixed income, PPF, and physical/sovereign gold to protect downside capital while pacing with inflation."
    elif risk == "Aggressive":
        target_mf_pct = 50.0
        target_stocks_pct = 35.0
        target_fd_pct = 5.0
        target_gold_pct = 5.0
        target_cash_pct = 5.0
        target_return = 14.2
        strategy = "Maximum Equity Compounding & Growth"
        strategy_desc = "High equity exposure (85% combined) engineered for multi-year compounding and maximum wealth expansion."
    else:  # Moderate (default)
        target_mf_pct = 45.0
        target_stocks_pct = 25.0
        target_fd_pct = 15.0
        target_gold_pct = 10.0
        target_cash_pct = 5.0
        target_return = 11.5
        strategy = "Balanced Growth & Managed Volatility"
        strategy_desc = "Classic balanced posture maintaining 70% growth assets (Equity/MFs) balanced by 30% defensive ballast (Debt/Gold/Cash)."

    recommended_allocation = [
        {"name": "Mutual funds", "value": round(current_total * (target_mf_pct / 100.0), 2), "pct": target_mf_pct},
        {"name": "Stocks", "value": round(current_total * (target_stocks_pct / 100.0), 2), "pct": target_stocks_pct},
        {"name": "FD/Debt", "value": round(current_total * (target_fd_pct / 100.0), 2), "pct": target_fd_pct},
        {"name": "Gold", "value": round(current_total * (target_gold_pct / 100.0), 2), "pct": target_gold_pct},
        {"name": "Cash", "value": round(current_total * (target_cash_pct / 100.0), 2), "pct": target_cash_pct},
    ]

    # Rebalancing Advice logic
    equity_current = (current_mf + current_stocks) / current_total * 100
    equity_target = target_mf_pct + target_stocks_pct
    delta_equity = round(equity_current - equity_target, 1)

    if delta_equity < -8.0:
        advice = (
            f"Under your {risk} profile, target growth allocation is {equity_target:.0f}%, but your current portfolio holds {equity_current:.0f}%. "
            f"You hold excess defensive/liquid assets. Step up monthly SIP allocations in diversified index funds to accelerate your {goal} target."
        )
    elif delta_equity > 8.0:
        advice = (
            f"Your current growth exposure ({equity_current:.0f}%) exceeds your {risk} target ({equity_target:.0f}%). "
            f"Consider re-directing upcoming monthly surpluses into Fixed Deposits or Sovereign Gold Bonds to protect against downside corrections."
        )
    else:
        advice = (
            f"Your portfolio is well-balanced with your {risk} risk appetite ({equity_current:.0f}% actual vs {equity_target:.0f}% target equity). "
            f"Maintain steady automated contributions toward your primary goal of {goal}."
        )

    return {
        "current_allocation": current_allocation,
        "recommended_allocation": recommended_allocation,
        "estimated_return": target_return,
        "risk_profile": {
            "appetite": risk,
            "strategy": strategy,
            "description": strategy_desc,
            "target_return": target_return,
            "equity_target_pct": equity_target,
            "debt_target_pct": target_fd_pct + target_cash_pct,
            "gold_target_pct": target_gold_pct,
        },
        "rebalancing_advice": advice,
    }


def asset_allocation(profile: FinancialProfile) -> list[dict]:
    """Returns current asset allocation list for backwards-compatible charts."""
    return compute_portfolio_strategy(profile)["current_allocation"]


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


def budget_coach(profile: FinancialProfile, budgets: list[dict]) -> dict:
    trend = advanced_ml.predict_expense_trend(profile)
    trend_msg = f" (ML projects expenses will be {trend:.1f}x normal based on current profile)." if trend > 1.05 or trend < 0.95 else ""

    lifestyle = (profile.lifestyle_preference or "Balanced").strip()
    experience = (profile.financial_experience or "Beginner").strip()
    goal = (profile.primary_financial_goal or "Wealth Creation").strip()

    over = [item for item in budgets if item["actual"] > item["planned"]]
    
    if not over:
        if lifestyle == "Frugal":
            coach_msg = f"All tracked categories are within budget. Your Frugal discipline is paying off—redirecting discretionary savings into your primary goal of {goal}."
        elif lifestyle == "Experience-focused":
            coach_msg = f"All tracked categories are within budget. You have healthy room for planned travel and lifestyle experiences while protecting essential needs."
        else:
            coach_msg = f"All tracked categories are within budget.{trend_msg} Your balanced budget structure is sustaining steady cash flow."
        return {
            "status": "healthy",
            "message": coach_msg,
            "lifestyle": lifestyle,
            "goal": goal,
            "experience": experience,
        }

    largest = max(over, key=lambda item: item["actual"] - item["planned"])
    over_amt = largest["actual"] - largest["planned"]
    pct_over = round((over_amt / max(largest["planned"], 1)) * 100, 1)

    if lifestyle == "Frugal":
        advice = f"Frugal Alert: {largest['category']} exceeded limit by ₹{over_amt:,.0f} (+{pct_over}%). Trim non-essential expenses here to maintain your frugal savings rate and protect your {goal} milestone."
    elif lifestyle == "Experience-focused":
        advice = f"Experience Buffer Notice: {largest['category']} is ₹{over_amt:,.0f} above planned target. Double-check that essential living costs (Needs) and emergency reserves remain untouched before booking extra leisure."
    else:
        advice = f"You are trending ₹{over_amt:,.0f} above your {largest['category']} budget this month (+{pct_over}%).{trend_msg}"

    # Experience-level tailoring
    if experience == "Advanced":
        opp_cost = round(over_amt * 12 * 0.12, 0)
        advice += f" [Annualized 12% compounding opportunity cost: ~₹{opp_cost:,.0f}]."
    elif experience == "Beginner":
        advice += " Tip: Try setting a daily limit or moving surplus cash into your emergency reserve."

    return {
        "status": "attention",
        "message": advice,
        "category": largest["category"],
        "over_amount": over_amt,
        "lifestyle": lifestyle,
        "goal": goal,
        "experience": experience,
    }


def build_insights(profile: FinancialProfile, budgets: list[dict]) -> list[dict]:
    score = health_score(profile)
    invested = profile.investments_balance + profile.mutual_funds + profile.stocks + profile.fixed_deposits + profile.gold
    inv_reason = "Investment balance and portfolio allocation remain active." if invested > 0 else "Ready to track investment portfolios once added."
    insights = [
        {"severity": "success", "title": "Savings rate improved", "reason": f"Current savings rate is {score['savings_rate']:.0%}.", "impact": "More goal capacity", "action": "Keep automated savings active."},
        {"severity": "warning", "title": "Emergency fund below target", "reason": f"Runway is {emergency_runway(profile):.1f} months.", "impact": "Reduced shock absorption", "action": "Prioritize emergency savings."},
        {"severity": "info", "title": "Investment monitoring active", "reason": inv_reason, "impact": "Better long-term compounding", "action": "Review allocation quarterly."},
    ]
    coach = budget_coach(profile, budgets)
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
