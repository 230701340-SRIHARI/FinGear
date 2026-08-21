from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("")
def get_timeline(user_id: str = Depends(get_current_user_id)) -> dict:
    return {"events": memory.state_copy(user_id)["events"]}
