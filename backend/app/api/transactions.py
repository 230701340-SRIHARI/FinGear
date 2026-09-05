from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.ml.ai_engine import ai_engine
from app.repositories import memory
from app.schemas.finance import Transaction
from app.services.financial_service import transaction_summary

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(user_id: str = Depends(get_current_user_id)) -> dict:
    transactions = memory.state_copy(user_id)["transactions"]
    return {"transactions": transactions, "summary": transaction_summary(transactions)}


@router.post("")
def create_transaction(transaction: Transaction, user_id: str = Depends(get_current_user_id)) -> dict:
    txn_data = transaction.model_dump()
    created = memory.add_transaction(user_id, txn_data)

    # AI Engine: process new transaction for anomaly detection and online training
    all_transactions = memory.state_copy(user_id)["transactions"]
    anomaly_result = ai_engine.process_transaction(user_id, created, all_transactions)

    # Attach anomaly info to the stored transaction if flagged
    if anomaly_result.is_anomaly:
        memory.flag_transaction_anomaly(user_id, created["id"], anomaly_result.score)
        created["anomaly_flag"] = True
        created["anomaly_score"] = anomaly_result.score

    return created


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    memory.delete_transaction(user_id, transaction_id)
    transactions = memory.state_copy(user_id)["transactions"]
    return {"transactions": transactions, "summary": transaction_summary(transactions)}

