from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import CopilotRequest, FinancialProfile
from app.services.copilot import answer_question

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/chat")
def chat(payload: CopilotRequest, user_id: str = Depends(get_current_user_id)) -> dict:
    result = answer_question(payload)
    memory.add_conversation(user_id, payload.question, result["answer"])
    return result


@router.get("/context")
def context(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    return {
        "income": profile.monthly_income,
        "expenses": sum(item.amount for item in profile.monthly_expenses),
        "savings": profile.savings_balance,
        "debt": profile.total_debt,
        "goals": len(profile.goals),
        "conversations": state["copilot_conversations"],
    }
