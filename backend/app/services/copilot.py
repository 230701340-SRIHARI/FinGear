from openai import OpenAI

from app.core.config import settings
from app.schemas.finance import CopilotRequest
from app.services.finance_engine import forecast, goal_plan, health_score


def answer_question(payload: CopilotRequest) -> dict:
    score = health_score(payload.profile)
    goals = goal_plan(payload.profile)
    profile_summary = {
        "monthly_income": payload.profile.monthly_income,
        "health_score": score,
        "goals": goals,
        "forecast_12_months": forecast(payload.profile, 12)["months"][-1],
    }

    if not settings.openai_api_key:
        return {
            "answer": (
                "Recommendation\n"
                "AI Copilot is running in local explainability mode. Add OPENAI_API_KEY in backend/.env to enable LLM responses.\n\n"
                "Why?\n"
                f"- Current financial health score: {score['score']}/100\n"
                f"- Monthly cash flow: {score['monthly_cash_flow']}\n"
                f"- Active goals: {len(goals)}\n\n"
                "Impact\n"
                "The dashboard, simulator, forecast and health analysis remain fully functional without the AI API.\n\n"
                "Confidence\n"
                "High for rule-based calculations; LLM reasoning is unavailable until configured."
            ),
            "source": "local-rules",
        }

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are FinGear AI, a cautious personal finance assistant. "
                        "Use only the supplied financial profile summary. Structure every answer with: "
                        "Recommendation, Why, Impact, Confidence, Assumptions. "
                        "Do not invent financial numbers. Do not claim to be a licensed financial advisor."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Financial profile summary: {profile_summary}\nQuestion: {payload.question}",
                },
            ],
        )
        return {"answer": response.output_text, "source": "openai"}
    except Exception:
        return {
            "answer": (
                "Recommendation\n"
                "AI Copilot is temporarily unavailable, but local financial analysis is still active.\n\n"
                "Why?\n"
                "The OpenAI API call could not be completed from the backend.\n\n"
                "Impact\n"
                f"Your current score is {score['score']}/100 and monthly cash flow is {score['monthly_cash_flow']}.\n\n"
                "Confidence\n"
                "Medium, based on local calculations only.\n\n"
                "Assumptions\n"
                "Income, expenses, debt and goal data are taken from the current profile."
            ),
            "source": "local-fallback",
        }
