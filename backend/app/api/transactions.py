from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
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
    return memory.add_transaction(user_id, transaction.model_dump())


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    memory.delete_transaction(user_id, transaction_id)
    transactions = memory.state_copy(user_id)["transactions"]
    return {"transactions": transactions, "summary": transaction_summary(transactions)}
