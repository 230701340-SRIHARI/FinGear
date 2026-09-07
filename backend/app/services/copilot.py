from openai import OpenAI

from app.core.config import settings
from app.schemas.finance import CopilotRequest
from app.services.finance_engine import forecast, goal_plan, health_score
from app.services.financial_service import compute_portfolio_strategy


def answer_question(payload: CopilotRequest) -> dict:
    prof = payload.profile
    score = health_score(prof)
    goals = goal_plan(prof)
    strategy = compute_portfolio_strategy(prof)

    experience = (prof.financial_experience or "Beginner").strip().title()
    risk = (prof.risk_appetite or "Moderate").strip().title()
    lifestyle = (prof.lifestyle_preference or "Balanced").strip().title()
    primary_goal = (prof.primary_financial_goal or "Wealth Creation").strip()

    profile_summary = {
        "monthly_income": prof.monthly_income,
        "health_score": score,
        "goals": goals,
        "forecast_12_months": forecast(prof, 12)["months"][-1],
        "financial_experience": experience,
        "risk_appetite": risk,
        "lifestyle_preference": lifestyle,
        "primary_financial_goal": primary_goal,
        "recommended_asset_return": strategy["estimated_return"],
        "recommended_rebalancing": strategy["rebalancing_advice"],
    }

    # If OpenAI API is not configured, run FinGear Intelligent Local Persona Engine
    if not settings.openai_api_key:
        q_lower = payload.question.lower()
        cash_flow = score.get("monthly_cash_flow", 0.0)
        score_val = score.get("score", 75)

        # Persona-tailored advice construction
        if "sip" in q_lower or "invest" in q_lower or "stock" in q_lower or "mutual" in q_lower:
            if risk == "Conservative":
                rec = f"Focus incremental capital on stable debt mutual funds, PPF, or Sovereign Gold Bonds. Given your Conservative risk profile, maintain max 30% total exposure in equities to preserve capital."
            elif risk == "Aggressive":
                rec = f"You can comfortably step up your equity index or flexi-cap SIP. With your Aggressive risk appetite, a target 85% growth allocation accelerates long-term compounding toward your {primary_goal}."
            else:
                rec = f"Allocate 70% of new investment capital into diversified equity index funds and 30% into debt/gold ballast, matching your Moderate balanced strategy."
        elif "debt" in q_lower or "loan" in q_lower or "emi" in q_lower:
            rec = f"Accelerate payoff on highest-interest debts first (Avalanche method). Eliminating liabilities directly supports your primary goal of {primary_goal} and lowers fixed living costs."
        elif "emergency" in q_lower or "safety" in q_lower or "buffer" in q_lower:
            rec = f"Keep your liquid emergency reserve in an accessible high-yield savings account or liquid FD. Based on your {risk} risk posture, target 4-6 months of essential living expenses."
        else:
            rec = f"Prioritize your primary goal of '{primary_goal}' by optimizing your {lifestyle.lower()} budget structure and maintaining your {risk.lower()} asset allocation ({strategy['risk_profile']['strategy']})."

        # Experience-tailored analytical depth
        if experience == "Advanced":
            why_text = (
                f"- Health score: {score_val}/100 | Cash flow: ₹{cash_flow:,.0f}/mo | Active Goals: {len(goals)}\n"
                f"- Risk Appetite: {risk} (Targeting {strategy['risk_profile']['equity_target_pct']}% equity, expected return ~{strategy['estimated_return']}% p.a.)\n"
                f"- Lifestyle: {lifestyle} | Rebalancing status: {strategy['rebalancing_advice']}"
            )
            impact_text = f"Optimizes portfolio Sharpe ratio, mitigates downside beta, and secures cash flow velocity toward {primary_goal}."
        elif experience == "Intermediate":
            why_text = (
                f"- Current financial health score is {score_val}/100 with ₹{cash_flow:,.0f} positive monthly surplus.\n"
                f"- Calibrated for your {lifestyle} lifestyle and {risk} risk tolerance ({strategy['risk_profile']['strategy']}).\n"
                f"- Directly tracks progress for your top goal: {primary_goal}."
            )
            impact_text = f"Steady execution keeps your 12-month net worth trajectory on target while maintaining safety margins."
        else:  # Beginner
            why_text = (
                f"- Your monthly income and expenses leave ₹{cash_flow:,.0f} in cash flow every month.\n"
                f"- We designed this recommendation simply for your {lifestyle} lifestyle so you don't feel overwhelmed.\n"
                f"- Step 1: Secure your safety buffer; Step 2: Work toward {primary_goal}."
            )
            impact_text = f"Gives you peace of mind with clear, step-by-step progress without complex financial jargon."

        return {
            "answer": (
                f"Recommendation\n{rec}\n\n"
                f"Why?\n{why_text}\n\n"
                f"Impact\n{impact_text}\n\n"
                f"Confidence\nHigh (Generated by FinGear Persona Engine calibrated for {experience} level, {risk} risk, and {lifestyle} lifestyle)."
            ),
            "source": "local-rules",
        }

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        system_content = (
            "You are FinGear AI, an expert, empathetic, and prudent financial copilot. "
            f"User Profile Persona:\n"
            f"- Financial Experience: {experience} (If Beginner: speak plainly with zero jargon and simple analogies. If Intermediate: focus on milestones and cash flow. If Advanced: use financial analytics like CAGR, Sharpe ratio, and tax optimization).\n"
            f"- Risk Appetite: {risk} (Strictly respect this when recommending investments: Conservative = capital preservation/FD/Gold; Aggressive = high equity/SIP compounding; Moderate = 70/30 balanced growth).\n"
            f"- Lifestyle Preference: {lifestyle} (Frugal = tighten discretionary wants and maximize savings; Experience-focused = leave room for leisure/travel while protecting needs; Balanced = standard sustainable living).\n"
            f"- Primary Financial Goal: {primary_goal} (Align all actions toward accelerating this specific goal).\n\n"
            "Format every answer strictly into sections: Recommendation, Why, Impact, Confidence, Assumptions. "
            "Never invent false financial numbers. Do not claim to be a licensed advisor."
        )

        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"Financial profile summary: {profile_summary}\nQuestion: {payload.question}"},
            ],
        )
        return {"answer": response.output_text, "source": "openai"}
    except Exception as exc:
        return {
            "answer": (
                "Recommendation\n"
                f"Continue executing your plan toward {primary_goal} according to your {risk} risk allocation.\n\n"
                "Why?\n"
                f"Health score: {score['score']}/100 with ₹{score['monthly_cash_flow']:,.0f} surplus. "
                "OpenAI service timed out; fallback local engine is keeping your financial calculations active.\n\n"
                "Impact\n"
                f"Your {risk} allocation and {lifestyle} budget targets remain fully safeguarded."
            ),
            "source": "local-fallback",
        }
