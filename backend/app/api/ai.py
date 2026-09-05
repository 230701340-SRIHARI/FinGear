"""
AI Engine API Router — Endpoints for the AI Intelligence Engine.

Routes:
  GET  /ai/status                         — Overall AI engine status
  GET  /ai/forecast                       — Tomorrow's predicted spend + projections
  GET  /ai/anomalies                      — Flagged anomalous transactions
  POST /ai/anomalies/{txn_id}/acknowledge — Human-in-the-loop feedback
  GET  /ai/weights                        — Current weight state (debug)
  POST /ai/reset                          — Factory reset all AI weights
"""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.ml.ai_engine import ai_engine
from app.repositories import memory

router = APIRouter(prefix="/ai", tags=["ai-engine"])


@router.get("/status")
def ai_status(user_id: str = Depends(get_current_user_id)) -> dict:
    """Overall AI engine status: data maturity, forecast readiness, anomaly phases."""
    state = memory.state_copy(user_id)
    transactions = state["transactions"]
    return ai_engine.get_status(user_id, transactions)


@router.get("/forecast")
def ai_forecast(user_id: str = Depends(get_current_user_id)) -> dict:
    """Tomorrow's predicted spend, monthly projections, model confidence."""
    state = memory.state_copy(user_id)
    profile = state["profile"]
    return ai_engine.get_forecast(
        user_id=user_id,
        transactions=state["transactions"],
        current_balance=profile.get("savings_balance", 0),
        monthly_income=profile.get("monthly_income", 0),
        monthly_pot_contributions=sum(
            e.get("amount", 0) for e in profile.get("monthly_expenses", [])
            if e.get("category") in ("Investment", "Savings")
        ),
    )


@router.get("/anomalies")
def ai_anomalies(user_id: str = Depends(get_current_user_id)) -> dict:
    """List of flagged anomalous transactions with ensemble scores."""
    transactions = memory.state_copy(user_id)["transactions"]
    anomalies = ai_engine.get_anomalies(user_id, transactions)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.post("/anomalies/{txn_id}/acknowledge")
def ai_acknowledge(txn_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    """
    Human-in-the-loop: acknowledge an anomaly.
    Marks the transaction as acknowledged and retrains the autoencoder.
    """
    # Mark transaction as acknowledged in memory
    memory.acknowledge_transaction(user_id, txn_id)

    # Get the acknowledged transaction
    transactions = memory.state_copy(user_id)["transactions"]
    txn = next((t for t in transactions if str(t.get("id")) == str(txn_id)), None)

    if not txn:
        return {"acknowledged": False, "message": "Transaction not found."}

    return ai_engine.acknowledge_anomaly(user_id, txn)


@router.get("/weights")
def ai_weights(user_id: str = Depends(get_current_user_id)) -> dict:
    """Current serialized weight state for debugging and transparency."""
    return ai_engine.get_weights(user_id)


@router.post("/reset")
def ai_reset(user_id: str = Depends(get_current_user_id)) -> dict:
    """Factory reset: delete all AI weights and state for current user."""
    # Reset acknowledged flags on transactions
    state = memory.get_state(user_id)
    for txn in state.get("transactions", []):
        txn.pop("acknowledged", None)
        txn.pop("anomaly_score", None)
        txn.pop("anomaly_flag", None)

    return ai_engine.factory_reset(user_id)
