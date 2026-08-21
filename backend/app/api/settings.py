from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.database.postgres import get_database_status
from app.repositories import memory

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(user_id: str = Depends(get_current_user_id)) -> dict:
    user = memory.get_user(user_id)
    return {
        "account": memory.public_user(user),
        "appearance": {"theme": "dark-futuristic", "light_mode": "available"},
        "notifications": {"budget_alerts": True, "goal_alerts": True, "ai_insights": True},
        "ai_preferences": {"copilot": "context-aware", "advice_mode": "educational"},
        "database": get_database_status(),
    }


@router.get("/security")
def get_security(user_id: str = Depends(get_current_user_id)) -> dict:
    return {
        "password": "Configured with PBKDF2 password hashing",
        "sessions": [{"device": "Current browser", "status": "Active"}],
        "two_factor": "Planned",
        "api_security": "JWT bearer tokens protect private routes",
        "privacy": "Every financial entity is scoped to a user id in the intended PostgreSQL schema.",
    }
