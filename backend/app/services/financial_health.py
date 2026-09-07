"""
FinGear Canonical Financial Health Scoring System
Based on the Financial Health Network framework.

An explainable, adaptive, transaction-driven scoring engine that measures:
1. Spending Sustainability (30%)
2. Emergency Resilience (25%)
3. Debt Manageability (20%)
4. Future Readiness (15%)
5. Payment Discipline & Protection (10%)
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Optional

from app.schemas.finance import FinancialProfile, Goal


# ── MUTUALLY EXCLUSIVE CATEGORY BUCKETS ──────────────────────────────────────

BUCKET_NEEDS = {
    "Housing", "Rent", "Groceries", "Utilities", "Healthcare", "Medicines",
    "Insurance", "Insurance Premium", "Education", "Transport", "Fuel",
    "Public Transport", "Mandatory EMI", "EMI", "Bills"
}

BUCKET_WANTS = {
    "Dining", "Dining Out", "Food Delivery", "Entertainment", "OTT",
    "Shopping", "Travel", "Hobbies", "Lifestyle", "Premium Upgrades", "Other"
}

BUCKET_SAVINGS = {
    "Investment", "Savings", "Emergency Fund", "FD", "Fixed Deposit",
    "SIP", "Mutual Funds", "Stocks", "PPF", "NPS", "Retirement",
    "Extra Loan Repayment", "Extra Debt Prepayment", "Extra Principal"
}

BUCKET_INCOME = {
    "Salary", "Freelance", "Freelance Payment", "Business", "Business Income",
    "Rent Received", "Interest", "Bonus", "Income"
}


def classify_category(category: str, txn_type: str = "expense") -> str:
    """Classify a transaction into one of the 4 mutually exclusive buckets."""
    if txn_type == "income":
        return "Income"
    
    cat = (category or "").strip()
    if cat in BUCKET_SAVINGS:
        return "Savings"
    if cat in BUCKET_NEEDS:
        return "Needs"
    if cat in BUCKET_WANTS:
        return "Wants"
    
    # Handle specific common names
    lower = cat.lower()
    if any(w in lower for w in ["grocer", "rent", "utilit", "medic", "doctor", "health", "insur", "school", "college", "fuel", "bus", "train", "metro", "emi"]):
        return "Needs"
    if any(w in lower for w in ["invest", "sip", "deposit", "mutual", "stock", "fund", "ppf", "nps", "saving"]):
        return "Savings"
    if any(w in lower for w in ["food", "dining", "restaur", "movie", "ott", "netflix", "prime", "shop", "flight", "hotel", "travel", "hobby", "swiggy", "zomato"]):
        return "Wants"

    return "Wants"


# ── INCOME TIERS ─────────────────────────────────────────────────────────────

@dataclass
class IncomeTier:
    tier: int
    name: str
    income_range: str
    needs_pct: float     # Target Needs % (NT)
    wants_pct: float     # Target Wants % (WT)
    savings_pct: float   # Target Savings % (ST)
    min_emergency: float # Minimum emergency floor
    description: str
    focus: str


INCOME_TIERS = [
    IncomeTier(
        tier=1,
        name="Survival",
        income_range="₹15k–₹30k",
        needs_pct=65.0,
        wants_pct=15.0,
        savings_pct=20.0,
        min_emergency=25_000.0,
        description="Fixed living costs dominate income. Focus on essential stability and building initial ₹25,000 emergency buffer.",
        focus="Build ₹25,000 emergency fund in liquid savings before market investments."
    ),
    IncomeTier(
        tier=2,
        name="Baseline",
        income_range="₹30k–₹50k",
        needs_pct=50.0,
        wants_pct=30.0,
        savings_pct=20.0,
        min_emergency=0.0,
        description="Classic 50:30:20 budgeting structure. Covers standard fixed expenses while funding moderate wants and starting SIPs.",
        focus="Maintain 20% consistent savings in index mutual funds or PPF while building 3 months of emergency runway."
    ),
    IncomeTier(
        tier=3,
        name="Accumulation",
        income_range="₹50k–₹80k",
        needs_pct=45.0,
        wants_pct=25.0,
        savings_pct=30.0,
        min_emergency=0.0,
        description="Income expansion allows fixed costs to compress to 45%. Squeeze wants to 25% and elevate wealth building to 30%.",
        focus="Direct 30% into diversified equity mutual funds, ELSS, and liquid reserves."
    ),
    IncomeTier(
        tier=4,
        name="Reverse Budget",
        income_range="₹80k–₹1.25L",
        needs_pct=40.0,
        wants_pct=20.0,
        savings_pct=40.0,
        min_emergency=0.0,
        description="Pay yourself first. Invest 40% before lifestyle inflation expands discretionary expenses.",
        focus="Automate 40% savings into direct equity, diversified funds, and debt instruments."
    ),
    IncomeTier(
        tier=5,
        name="Wealth Building",
        income_range="₹1.25L+",
        needs_pct=35.0,
        wants_pct=15.0,
        savings_pct=50.0,
        min_emergency=0.0,
        description="Aggressive compounding phase. Savings rate is dominant category (50%+). Supports FIRE and early financial freedom.",
        focus="Max out tax efficiency, global asset allocation, and multi-asset wealth compounding."
    ),
]


def get_tier_by_income(income: float) -> IncomeTier:
    """Determine income tier based on net monthly income."""
    inc = float(income or 0.0)
    if inc < 30_000:
        return INCOME_TIERS[0]
    elif inc < 50_000:
        return INCOME_TIERS[1]
    elif inc < 80_000:
        return INCOME_TIERS[2]
    elif inc < 125_000:
        return INCOME_TIERS[3]
    else:
        return INCOME_TIERS[4]


# ── DATA EXTRACTION & ANALYSIS (LAST 3 CLOSED MONTHS / 90 DAYS) ───────────────

def _extract_recent_metrics(profile: FinancialProfile, transactions: list[dict] | None) -> dict:
    """
    Extract base definitions from the most recent 3 closed months / 90 days.
    I   = average net monthly income
    NE  = average monthly Needs expenditure
    WA  = average monthly Wants expenditure
    SV  = average monthly saving + investment + extra debt repayment
    EMI = mandatory monthly debt repayment
    OD  = total outstanding debt
    EF  = liquid emergency fund
    """
    profile_income = float(profile.monthly_income or 0.0) + float(profile.other_income or 0.0)
    profile_emi = float(profile.monthly_debt_payment or 0.0)
    profile_debt = float(profile.total_debt or 0.0)
    
    # EF: Only liquid funds count (savings balance + emergency fund). Equity, gold, locked retirement do not count.
    profile_ef = max(float(profile.emergency_fund or 0.0), float(profile.savings_balance or 0.0))

    valid_txns = [
        t for t in (transactions or [])
        if not t.get("deleted_at") and not t.get("model_training_excluded")
    ]

    # Check distinct dates in transactions
    distinct_dates = set()
    for t in valid_txns:
        d = str(t.get("date") or t.get("transaction_date") or "")[:10]
        if d:
            distinct_dates.add(d)
    
    days_count = len(distinct_dates)

    if not valid_txns:
        # Fallback to profile definitions when transactions are not yet logged
        needs_sum = 0.0
        wants_sum = 0.0
        savings_sum = 0.0

        all_exp = profile.detailed_expenses or profile.monthly_expenses or []
        for item in all_exp:
            cat_type = classify_category(item.category, "expense")
            amt = float(item.amount or 0.0)
            if cat_type == "Needs":
                needs_sum += amt
            elif cat_type == "Savings":
                savings_sum += amt
            else:
                wants_sum += amt

        # Mandatory EMI is a Need
        needs_sum += profile_emi
        # Voluntary savings: any remaining surplus or explicitly logged investments
        voluntary_savings = max(0.0, profile_income - needs_sum - wants_sum)
        if savings_sum == 0.0:
            savings_sum = voluntary_savings

        return {
            "I": max(profile_income, 1.0),
            "NE": needs_sum,
            "WA": wants_sum,
            "SV": savings_sum,
            "EMI": profile_emi,
            "OD": profile_debt,
            "EF": profile_ef,
            "days_count": 0,
            "txns_count": 0,
            "is_from_transactions": False,
            "monthly_contributions_count": 3 if profile_income > 0 else 0,
            "on_time_bills_ratio": 1.0,
            "missed_bills_in_90d": 0,
        }

    # Aggregate transactions over the last 90 days
    today = date.today()
    cutoff_date = today - timedelta(days=90)

    income_total = 0.0
    needs_total = 0.0
    wants_total = 0.0
    savings_total = 0.0
    months_with_savings = set()
    months_tracked = set()
    category_totals = defaultdict(float)

    for t in valid_txns:
        raw_d = str(t.get("date") or t.get("transaction_date") or "")[:10]
        try:
            t_date = date.fromisoformat(raw_d)
            if t_date < cutoff_date:
                continue
        except Exception:
            pass

        amt = float(t.get("amount") or 0.0)
        t_type = t.get("type", "expense")
        cat = t.get("category", "")
        bucket = classify_category(cat, t_type)
        m_key = raw_d[:7] if len(raw_d) >= 7 else "current"
        months_tracked.add(m_key)

        if bucket == "Income":
            income_total += amt
        elif bucket == "Needs":
            needs_total += amt
            category_totals[cat] += amt
        elif bucket == "Savings":
            savings_total += amt
            category_totals[cat] += amt
            months_with_savings.add(m_key)
        else:
            wants_total += amt
            category_totals[cat] += amt

    active_months_divisor = max(len(months_tracked), 1)

    all_exp = profile.detailed_expenses or profile.monthly_expenses or []
    if days_count < 30 and all_exp:
        # Blend profile fixed commitments with active tracked transactions
        untracked_needs = 0.0
        untracked_wants = 0.0
        untracked_savings = 0.0
        for item in all_exp:
            cat = item.category
            amt = float(item.amount or 0.0)
            bucket = classify_category(cat, "expense")
            if cat not in category_totals:
                if bucket == "Needs":
                    untracked_needs += amt
                elif bucket == "Savings":
                    untracked_savings += amt
                else:
                    untracked_wants += amt

        avg_needs = (needs_total / active_months_divisor) + untracked_needs + profile_emi
        avg_wants = (wants_total / active_months_divisor) + untracked_wants
        avg_savings = (savings_total / active_months_divisor) + untracked_savings
    else:
        avg_needs = (needs_total / active_months_divisor) + profile_emi
        avg_wants = wants_total / active_months_divisor
        avg_savings = (savings_total / active_months_divisor)

    # Calculate monthly income
    avg_income = (income_total / active_months_divisor) if income_total > 0 else profile_income

    # If voluntary surplus wasn't booked as transaction transfers, calculate surplus
    surplus = max(0.0, avg_income - avg_needs - avg_wants)
    if avg_savings == 0.0 and surplus > 0:
        avg_savings = surplus

    return {
        "I": max(avg_income, 1.0),
        "NE": avg_needs,
        "WA": avg_wants,
        "SV": avg_savings,
        "EMI": profile_emi,
        "OD": profile_debt,
        "EF": profile_ef,
        "days_count": max(days_count, 1),
        "txns_count": len(valid_txns),
        "is_from_transactions": True,
        "monthly_contributions_count": min(len(months_with_savings) or (1 if avg_savings > 0 else 0), 3),
        "on_time_bills_ratio": 1.0,
        "missed_bills_in_90d": 0,
    }


# ── SCORING COMPONENTS ───────────────────────────────────────────────────────

def compute_financial_health_score(
    profile: FinancialProfile,
    transactions: list[dict] | None = None,
    budgets: list[dict] | None = None
) -> dict:
    """
    Computes the complete, explainable FinGear Financial Health Score.
    
    Financial Health Score =
      0.30 × Spending Sustainability
    + 0.25 × Emergency Resilience
    + 0.20 × Debt Manageability
    + 0.15 × Future Readiness
    + 0.10 × Payment Discipline & Protection
    """
    metrics = _extract_recent_metrics(profile, transactions)
    profile_income = float(profile.monthly_income or 0.0) + float(profile.other_income or 0.0)
    I = metrics["I"]
    NE = metrics["NE"]
    WA = metrics["WA"]
    SV = metrics["SV"]
    EMI = metrics["EMI"]
    OD = metrics["OD"]
    EF = metrics["EF"]
    days_count = metrics["days_count"]

    tier = get_tier_by_income(I)
    NT = tier.needs_pct / 100.0
    WT = tier.wants_pct / 100.0
    ST = tier.savings_pct / 100.0

    N = NE / I
    W = WA / I
    S = SV / I

    # ── A. Spending Sustainability (30 points) ──────────────────────────────
    # NeedsFit = min(100, 100 * NT / N)
    needs_fit = 100.0 if N <= NT else min(100.0, 100.0 * (NT / max(N, 0.001)))
    # WantsFit = min(100, 100 * WT / W)
    wants_fit = 100.0 if W <= WT else min(100.0, 100.0 * (WT / max(W, 0.001)))
    # SavingsFit = min(100, 100 * S / ST)
    savings_fit = min(100.0, 100.0 * (S / max(ST, 0.001)))

    allocation_fit = (0.25 * needs_fit) + (0.30 * wants_fit) + (0.45 * savings_fit)
    monthly_surplus = I - NE - WA
    
    # SurplusFit = min(100, 100 * max(MonthlySurplus, 0) / (ST * I))
    target_surplus_saving = ST * I
    surplus_fit = min(100.0, 100.0 * (max(monthly_surplus, 0.0) / max(target_surplus_saving, 1.0)))

    spending_sustainability = (0.75 * allocation_fit) + (0.25 * surplus_fit)

    # ── B. Emergency Resilience (25 points) ──────────────────────────────────
    # EssentialMonthlyOutflow = NE
    essential_monthly_outflow = max(NE, 1.0)
    
    # Risk target months
    income_type = (profile.income_type or "Salaried").lower()
    dependents = int(profile.dependents or 0)
    if "business" in income_type or "self" in income_type or "freelance" in income_type:
        risk_target_months = 6.0 if ("business" in income_type or dependents > 0) else 5.0
    elif dependents > 2:
        risk_target_months = 5.0
    elif dependents > 0:
        risk_target_months = 4.0
    else:
        risk_target_months = 3.0

    # For Survival tier, apply a minimum of ₹25,000
    if tier.tier == 1:
        emergency_target = max(25_000.0, essential_monthly_outflow * risk_target_months)
    else:
        emergency_target = essential_monthly_outflow * risk_target_months

    emergency_resilience = min(100.0, 100.0 * (EF / max(emergency_target, 1.0)))

    # ── C. Debt Manageability (20 points) ────────────────────────────────────
    emi_ratio = EMI / I
    debt_to_annual_income = OD / (12.0 * I)

    # EMIScore: <= 15% -> 100, 25% -> 60, >= 40% -> 0
    emi_score = min(100.0, max(0.0, 100.0 * (0.40 - emi_ratio) / 0.25))

    # OutstandingDebtScore: <= 0.5x -> 100, >= 1.5x -> 0
    debt_score = min(100.0, max(0.0, 100.0 * (1.50 - debt_to_annual_income)))

    # Payment history metric if present
    on_time_emi = metrics["on_time_bills_ratio"]
    debt_manageability = (0.60 * emi_score) + (0.30 * debt_score) + (0.10 * (on_time_emi * 100.0))

    # ── D. Future Readiness (15 points) ──────────────────────────────────────
    target_monthly_saving = ST * I
    saving_target_achievement = min(100.0, 100.0 * (SV / max(target_monthly_saving, 1.0)))

    active_goals = [
        g for g in (profile.goals or [])
        if getattr(g, "target_amount", 0) > 0 and getattr(g, "name", None)
    ]

    # Goal feasibility: average probability of achieving all active goals
    if active_goals:
        goal_probs = []
        for g in active_goals:
            cur = float(getattr(g, "current_amount", 0.0))
            tgt = float(getattr(g, "target_amount", 1.0))
            mos = max(int(getattr(g, "target_months", 12)), 1)
            monthly_contrib = float(getattr(g, "monthly_contribution", 0.0))
            gap = max(tgt - cur, 0.0)
            req = gap / mos
            if monthly_contrib >= req:
                prob = 100.0
            elif req > 0:
                prob = min(100.0, max(10.0, (monthly_contrib / req) * 100.0))
            else:
                prob = 100.0
            goal_probs.append(prob)
        goal_feasibility = sum(goal_probs) / len(goal_probs)
    else:
        goal_feasibility = 0.0

    # Investment consistency: months with contributions out of 3
    investment_consistency = min(100.0, 100.0 * (metrics["monthly_contributions_count"] / 3.0))

    if active_goals:
        future_readiness = (0.50 * saving_target_achievement) + (0.30 * goal_feasibility) + (0.20 * investment_consistency)
    else:
        # Proportional redistribution of 30% goal weight (5:2 ratio between savings and consistency)
        future_readiness = ((0.50 / 0.70) * saving_target_achievement) + ((0.20 / 0.70) * investment_consistency)

    # ── E. Payment Discipline and Protection (10 points) ────────────────────
    payment_score = metrics["on_time_bills_ratio"] * 100.0

    # PlanningScore:
    # 100 -> budget, emergency target, and at least one goal are active
    # 65  -> any two are active
    # 30  -> zero or one are active
    active_plans_count = 0
    if budgets and any(b.get("planned", 0) > 0 for b in budgets):
        active_plans_count += 1
    elif profile.monthly_expenses:
        active_plans_count += 1
        
    if profile.emergency_target > 0 or EF >= emergency_target * 0.5:
        active_plans_count += 1
    if active_goals:
        active_plans_count += 1

    if active_plans_count >= 3:
        planning_score = 100.0
    elif active_plans_count == 2:
        planning_score = 65.0
    else:
        planning_score = 30.0

    # ProtectionScore:
    # 100 -> essential insurance/coverage details are recorded
    # 50  -> coverage information is unknown
    # 0   -> user records no coverage
    has_insurance_expense = any(
        "insur" in (item.category or "").lower() and item.amount > 0
        for item in (profile.detailed_expenses or profile.monthly_expenses or [])
    )
    if has_insurance_expense:
        protection_score = 100.0
    elif profile.provident_fund > 0 or profile.fixed_deposits > 0:
        protection_score = 50.0  # Basic statutory coverage exists
    else:
        protection_score = 50.0  # Default unknown

    payment_discipline_protection = (
        (0.60 * payment_score)
        + (0.25 * planning_score)
        + (0.15 * protection_score)
    )

    # ── RAW COMPONENT WEIGHTING ──────────────────────────────────────────────
    raw_score = (
        (0.30 * spending_sustainability)
        + (0.25 * emergency_resilience)
        + (0.20 * debt_manageability)
        + (0.15 * future_readiness)
        + (0.10 * payment_discipline_protection)
    )

    # ── SAFETY CAPS & GUARDRAILS ─────────────────────────────────────────────
    # Negative monthly surplus -> final score cannot exceed 59
    # EMI >= 40% of income     -> final score cannot exceed 49
    cap_applied = None
    final_score = raw_score

    if monthly_surplus < 0:
        if final_score > 59.0:
            final_score = 59.0
            cap_applied = "Negative Monthly Surplus Guardrail (Cap: 59/100)"

    if emi_ratio >= 0.40:
        if final_score > 49.0:
            final_score = 49.0
            cap_applied = "Critical Debt Burden Guardrail (Cap: 49/100)"

    final_score_rounded = int(round(max(0.0, min(100.0, final_score))))

    # ── RISK FLAGS ───────────────────────────────────────────────────────────
    risk_flags = []
    # Emergency fund < 1 month -> High Resilience Risk
    emergency_runway_months = EF / essential_monthly_outflow
    if emergency_runway_months < 1.0:
        risk_flags.append({
            "code": "HIGH_RESILIENCE_RISK",
            "label": "High Resilience Risk",
            "message": f"Liquid emergency reserves cover only {emergency_runway_months:.1f} months of essential needs (minimum 1.0 month required for base shock absorption)."
        })
    
    # Missed EMI/bill in last 90 days -> High Payment Risk
    if metrics["missed_bills_in_90d"] > 0:
        risk_flags.append({
            "code": "HIGH_PAYMENT_RISK",
            "label": "High Payment Risk",
            "message": "Missed bill or EMI obligation detected in the last 90 days."
        })

    # High-interest unsecured debt -> High Debt Risk
    if emi_ratio >= 0.35 or (OD > 0 and OD > 1.2 * (12.0 * I)):
        risk_flags.append({
            "code": "HIGH_DEBT_RISK",
            "label": "High Debt Risk",
            "message": f"Debt servicing requires {emi_ratio:.0%} of monthly income. Priority must be debt reduction."
        })

    # ── HEALTH GRADE ─────────────────────────────────────────────────────────
    if final_score_rounded >= 80:
        grade = "Financially Healthy"
        grade_meaning = "Stable spending, resilience, debt control, and future progress"
    elif final_score_rounded >= 60:
        grade = "Stable, improving"
        grade_meaning = "Generally sound, but one or more dimensions need improvement"
    elif final_score_rounded >= 40:
        grade = "Needs Attention"
        grade_meaning = "Material cash-flow, savings, debt, or planning weakness"
    else:
        grade = "Financially Vulnerable"
        grade_meaning = "Immediate financial resilience or affordability concern"

    # ── DATA CONFIDENCE (SEPARATE BADGE) ─────────────────────────────────────
    # DataConfidence = 0.40 * HistoryCompleteness + 0.40 * CategorisationCompleteness + 0.20 * IncomeVerificationCompleteness
    history_completeness = min(100.0, max(30.0, (days_count / 30.0) * 100.0)) if metrics["is_from_transactions"] else 40.0
    
    if metrics["txns_count"] > 0:
        categorized_txns = sum(
            1 for t in (transactions or [])
            if t.get("category") and t.get("category") not in ("Other", "Uncategorized")
        )
        categorisation_completeness = (categorized_txns / max(metrics["txns_count"], 1)) * 100.0
    else:
        categorisation_completeness = 75.0 if profile.monthly_expenses else 30.0

    income_verification = 100.0 if (metrics["is_from_transactions"] and I > 0) else (85.0 if profile_income > 0 else 20.0)

    data_confidence_score = round(
        (0.40 * history_completeness)
        + (0.40 * categorisation_completeness)
        + (0.20 * income_verification)
    )
    data_confidence_score = max(10, min(100, data_confidence_score))

    is_provisional = days_count < 7 and not (profile_income > 0 and (profile.monthly_expenses or metrics["txns_count"] > 0))
    if data_confidence_score >= 80 and not is_provisional:
        confidence_level = "High confidence"
        confidence_badge = f"High Confidence ({data_confidence_score}%)"
    elif data_confidence_score >= 50 and not is_provisional:
        confidence_level = "Moderate confidence"
        confidence_badge = f"Moderate Confidence ({data_confidence_score}%)"
    else:
        confidence_level = "Provisional score"
        confidence_badge = f"Provisional Score ({data_confidence_score}%)"

    # ── ADAPTIVE RECOMMENDATION ENGINE ───────────────────────────────────────
    recommendations = []
    
    # 1. Excess Wants Stepping Rule:
    actual_wants_amount = WA
    target_wants_amount = WT * I
    excess_wants_amount = max(0.0, actual_wants_amount - target_wants_amount)
    
    monthly_wants_reduction = 0.0
    if excess_wants_amount > 0:
        # FinGear should not demand an overnight correction.
        # It recommends reducing Wants by min(ExcessWants / 3, 5% of income) per month
        monthly_wants_reduction = min(excess_wants_amount / 3.0, 0.05 * I)
        recommendations.append(
            f"Adaptive Wants Reduction: Discretionary wants ({W:.0%}) exceed Tier {tier.tier} ({tier.name}) target of {WT:.0%}. "
            f"Step down spending by ₹{monthly_wants_reduction:,.0f}/month (capped at 5% income) and redirect to emergency reserves or SIPs."
        )

    # 2. Required Saving Increase:
    required_saving_increase = max(0.0, target_monthly_saving - SV)
    if required_saving_increase > 100.0:
        recommendations.append(
            f"Savings Velocity Gap: Target saving for Tier {tier.tier} is ₹{target_monthly_saving:,.0f}/month ({ST:.0%}). "
            f"Increase monthly contributions by ₹{required_saving_increase:,.0f} to reach your tier benchmark."
        )

    # 3. Emergency Fund Recovery:
    emergency_gap = max(0.0, emergency_target - EF)
    if emergency_gap > 0:
        monthly_emergency_contrib = max(monthly_wants_reduction, monthly_surplus * 0.5, 2000.0)
        months_to_target = round(emergency_gap / monthly_emergency_contrib, 1)
        recommendations.append(
            f"Emergency Reserve Target: Build reserve toward ₹{emergency_target:,.0f} ({risk_target_months:.0f} months of essential needs). "
            f"At ₹{monthly_emergency_contrib:,.0f}/mo allocation, you will achieve resilience in ~{months_to_target:.0f} months."
        )

    if not recommendations:
        recommendations.append("Your financial structure is well balanced with your income tier. Maintain automatic SIPs and quarterly rebalancing.")

    # Stepping ratio representation
    adaptive_wants_pct = round(max(WT * 100.0, (W * 100.0) - ((monthly_wants_reduction / I) * 100.0)), 1)
    adaptive_needs_pct = round(min(75.0, max(NT * 100.0, N * 100.0)), 1)
    adaptive_savings_pct = round(max(10.0, 100.0 - adaptive_needs_pct - adaptive_wants_pct), 1)

    return {
        "score": final_score_rounded,
        "raw_score": round(raw_score, 1),
        "grade": grade,
        "grade_meaning": grade_meaning,
        "cap_applied": cap_applied,
        "risk_flags": risk_flags,
        "method": "Explainable Adaptive Financial Health Engine",
        "model_name": "Financial Health Network Framework (Multi-Tier Adaptive)",
        "why": f"Evaluated under Tier {tier.tier} ({tier.name}) benchmarks using real cash-flows and resilience guardrails.",
        "components": [
            {
                "id": "spending_sustainability",
                "label": "Spending Sustainability",
                "weight_pct": 30,
                "value": int(round(spending_sustainability)),
                "max_points": 30,
                "contribution": round(0.30 * spending_sustainability, 1),
                "reason": f"Needs fit: {needs_fit:.0f}%, Wants fit: {wants_fit:.0f}%, Savings fit: {savings_fit:.0f}%, Monthly surplus: ₹{monthly_surplus:,.0f}.",
                "submetrics": {
                    "needs_fit": round(needs_fit, 1),
                    "wants_fit": round(wants_fit, 1),
                    "savings_fit": round(savings_fit, 1),
                    "surplus_fit": round(surplus_fit, 1),
                    "monthly_surplus": round(monthly_surplus, 2),
                }
            },
            {
                "id": "emergency_resilience",
                "label": "Emergency Resilience",
                "weight_pct": 25,
                "value": int(round(emergency_resilience)),
                "max_points": 25,
                "contribution": round(0.25 * emergency_resilience, 1),
                "reason": f"Liquid reserves cover {emergency_runway_months:.1f} months (Target: {risk_target_months:.0f} months / ₹{emergency_target:,.0f}).",
                "submetrics": {
                    "liquid_funds": round(EF, 2),
                    "emergency_target": round(emergency_target, 2),
                    "runway_months": round(emergency_runway_months, 1),
                    "target_months": risk_target_months,
                }
            },
            {
                "id": "debt_manageability",
                "label": "Debt Manageability",
                "weight_pct": 20,
                "value": int(round(debt_manageability)),
                "max_points": 20,
                "contribution": round(0.20 * debt_manageability, 1),
                "reason": f"EMI is {emi_ratio:.0%} of income (safe: <15%); Outstanding debt is {debt_to_annual_income:.2f}x annual income.",
                "submetrics": {
                    "emi_ratio_pct": round(emi_ratio * 100, 1),
                    "debt_to_annual_income": round(debt_to_annual_income, 2),
                    "emi_score": round(emi_score, 1),
                    "debt_score": round(debt_score, 1),
                }
            },
            {
                "id": "future_readiness",
                "label": "Future Readiness",
                "weight_pct": 15,
                "value": int(round(future_readiness)),
                "max_points": 15,
                "contribution": round(0.15 * future_readiness, 1),
                "reason": f"Target saving achievement: {saving_target_achievement:.0f}%; Consistency: {investment_consistency:.0f}%; Active goals: {len(active_goals)}.",
                "submetrics": {
                    "saving_target_achievement": round(saving_target_achievement, 1),
                    "goal_feasibility": round(goal_feasibility, 1),
                    "investment_consistency": round(investment_consistency, 1),
                    "active_goals_count": len(active_goals),
                }
            },
            {
                "id": "payment_discipline_protection",
                "label": "Payment Discipline & Protection",
                "weight_pct": 10,
                "value": int(round(payment_discipline_protection)),
                "max_points": 10,
                "contribution": round(0.10 * payment_discipline_protection, 1),
                "reason": f"90-day on-time rate: {payment_score:.0f}%; Planning score: {planning_score:.0f}%; Protection score: {protection_score:.0f}%.",
                "submetrics": {
                    "payment_score": round(payment_score, 1),
                    "planning_score": round(planning_score, 1),
                    "protection_score": round(protection_score, 1),
                }
            }
        ],
        "tier_info": {
            "tier": tier.tier,
            "name": tier.name,
            "range": tier.income_range,
            "needs_pct": tier.needs_pct,
            "wants_pct": tier.wants_pct,
            "savings_pct": tier.savings_pct,
            "needs_amount": round(I * NT, 2),
            "wants_amount": round(I * WT, 2),
            "savings_amount": round(I * ST, 2),
            "emergency_target": round(emergency_target, 2),
            "focus": tier.focus,
            "details": tier.description,
        },
        "adaptive_ratio": {
            "tier": tier.tier,
            "tier_name": tier.name,
            "income": round(I, 2),
            "ideal_needs_pct": tier.needs_pct,
            "ideal_wants_pct": tier.wants_pct,
            "ideal_savings_pct": tier.savings_pct,
            "actual_needs_pct": round(N * 100, 1),
            "actual_wants_pct": round(W * 100, 1),
            "actual_savings_pct": round(S * 100, 1),
            "adaptive_needs_pct": adaptive_needs_pct,
            "adaptive_wants_pct": adaptive_wants_pct,
            "adaptive_savings_pct": adaptive_savings_pct,
            "needs_amount": round(NE, 2),
            "wants_amount": round(WA, 2),
            "savings_amount": round(SV, 2),
            "emergency_target": round(emergency_target, 2),
            "is_adapted": monthly_wants_reduction > 0,
            "adaptation_message": recommendations[0] if recommendations else tier.focus,
        },
        "data_confidence": {
            "score": data_confidence_score,
            "level": confidence_level,
            "badge": confidence_badge,
            "is_provisional": is_provisional,
            "days_tracked": days_count,
            "txns_tracked": metrics["txns_count"],
            "breakdown": {
                "history_completeness": round(history_completeness, 1),
                "categorisation_completeness": round(categorisation_completeness, 1),
                "income_verification": round(income_verification, 1),
            },
            "note": "Minimum requirement: 30 days of transaction data. Under this, the badge displays 'Provisional Financial Health Score'."
        },
        "suggestions": recommendations,
        "monthly_cash_flow": round(monthly_surplus, 2),
        "savings_rate": round(S, 4),
        "explanation": {
            "score": final_score_rounded,
            "grade": grade,
            "tier_name": tier.name,
            "ideal_ratio": f"{tier.needs_pct:.0f}:{tier.wants_pct:.0f}:{tier.savings_pct:.0f}",
            "actual_ratio": f"{N * 100:.0f}:{W * 100:.0f}:{S * 100:.0f}",
            "summary": f"Health score evaluated at {final_score_rounded}/100 using Tier {tier.tier} ({tier.name}) benchmarks and 5 weighted outcomes.",
            "adaptation_message": recommendations[0] if recommendations else tier.focus,
        }
    }
