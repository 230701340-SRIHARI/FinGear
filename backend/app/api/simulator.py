from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.repositories import memory
from app.schemas.finance import FinancialProfile, SimulationRequest
from app.services.financial_service import run_scenario

router = APIRouter(prefix="/simulator", tags=["simulator"])


@router.post("/run")
def run_simulation(payload: SimulationRequest, user_id: str = Depends(get_current_user_id)) -> dict:
    result = run_scenario(payload.profile, payload.scenario)
    memory.add_simulation(user_id, result)
    return result


@router.get("/history")
def simulation_history(user_id: str = Depends(get_current_user_id)) -> dict:
    return {"history": memory.state_copy(user_id)["simulation_history"]}
