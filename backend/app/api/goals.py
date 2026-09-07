from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile, Goal, GoalCreate
from app.services.finance_engine import goal_plan

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("")
def get_goals(user_id: str = Depends(get_current_user_id)) -> dict:
    profile = FinancialProfile(**memory.state_copy(user_id)["profile"])
    return {"goals": profile.goals, "analysis": goal_plan(profile)}


@router.post("")
def create_goal(goal: GoalCreate, user_id: str = Depends(get_current_user_id)) -> dict:
    target_date = _parse_target_date(goal.target_date)
    if target_date <= date.today():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Target date must be in the future.")
    if goal.current_amount > goal.target_amount:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Current amount cannot exceed target amount.")

    target_months = _months_until(target_date)
    goal_payload = goal.model_dump()
    goal_payload["target_date"] = target_date.isoformat()
    goal_payload["target_months"] = target_months
    stored_goal = Goal(**goal_payload).model_dump()
    created_goal = memory.add_goal(user_id, stored_goal)
    profile = FinancialProfile(**memory.state_copy(user_id)["profile"])
    return {"created_goal": created_goal, "goals": profile.goals, "analysis": goal_plan(profile)}


@router.put("/{goal_name}")
def update_goal(goal_name: str, goal: GoalCreate, user_id: str = Depends(get_current_user_id)) -> dict:
    target_date = _parse_target_date(goal.target_date)
    if target_date <= date.today():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Target date must be in the future.")
    if goal.current_amount > goal.target_amount:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Current amount cannot exceed target amount.")

    target_months = _months_until(target_date)
    goal_payload = goal.model_dump()
    goal_payload["target_date"] = target_date.isoformat()
    goal_payload["target_months"] = target_months
    stored_goal = Goal(**goal_payload).model_dump()
    try:
        updated_goal = memory.update_goal(user_id, goal_name, stored_goal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    profile = FinancialProfile(**memory.state_copy(user_id)["profile"])
    return {"updated_goal": updated_goal, "goals": profile.goals, "analysis": goal_plan(profile)}


@router.delete("/{goal_name}")
def delete_goal(goal_name: str, user_id: str = Depends(get_current_user_id)) -> dict:
    memory.delete_goal(user_id, goal_name)
    profile = FinancialProfile(**memory.state_copy(user_id)["profile"])
    return {"goals": profile.goals, "analysis": goal_plan(profile)}


def _parse_target_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Target date must use YYYY-MM-DD format.") from exc


def _months_until(target_date: date) -> int:
    today = date.today()
    months = (target_date.year - today.year) * 12 + target_date.month - today.month
    if target_date.day > today.day:
        months += 1
    return max(months, 1)
