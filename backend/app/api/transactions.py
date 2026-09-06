import base64
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile

from app.core.security import get_current_user_id
from app.ml.ai_engine import ai_engine
from app.repositories import memory
from app.schemas.finance import Transaction
from app.services.financial_service import transaction_summary

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(user_id: str = Depends(get_current_user_id)) -> dict:
    transactions = memory.state_copy(user_id)["transactions"]
    return {"transactions": transactions, "recently_deleted": memory.deleted_transactions(user_id), "summary": transaction_summary(transactions)}


@router.post("")
def create_transaction(transaction: Transaction, user_id: str = Depends(get_current_user_id)) -> dict:
    txn_data = transaction.model_dump()
    created = memory.add_transaction(user_id, txn_data)
    memory.update_income_from_transaction(user_id, txn_data)

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
    return {"transactions": transactions, "recently_deleted": memory.deleted_transactions(user_id), "summary": transaction_summary(transactions)}


@router.post("/{transaction_id}/restore")
def restore_transaction(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    restored = memory.restore_transaction(user_id, transaction_id)
    if not restored:
        raise HTTPException(status_code=404, detail="Deleted transaction not found or older than 60 days")
    return restored


@router.post("/{transaction_id}/bill")
async def upload_bill(transaction_id: str, bill: UploadFile = File(...), user_id: str = Depends(get_current_user_id)) -> dict:
    if bill.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF bills are supported")
    content = await bill.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Bills must be smaller than 10 MB")
    for transaction in memory.get_state(user_id)["transactions"]:
        if str(transaction.get("id")) == str(transaction_id):
            transaction["bill_name"] = bill.filename or "bill.pdf"
            transaction["bill_size"] = len(content)
            transaction["bill_content"] = base64.b64encode(content).decode("ascii")
            transaction["bill_uploaded_at"] = datetime.utcnow().isoformat()
            return transaction
    raise HTTPException(status_code=404, detail="Transaction not found")


@router.get("/{transaction_id}/bill")
def download_bill(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> Response:
    for transaction in memory.state_copy(user_id)["transactions"]:
        if str(transaction.get("id")) == str(transaction_id) and transaction.get("bill_content"):
            return Response(
                content=base64.b64decode(transaction["bill_content"]),
                media_type="application/pdf",
                headers={"Content-Disposition": f'inline; filename="{transaction.get("bill_name", "bill.pdf")}"'},
            )
    raise HTTPException(status_code=404, detail="Bill not found")


@router.delete("/{transaction_id}/bill")
def delete_bill(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    for transaction in memory.get_state(user_id)["transactions"]:
        if str(transaction.get("id")) == str(transaction_id):
            if not transaction.get("bill_content"):
                raise HTTPException(status_code=404, detail="Bill not found")
            transaction.pop("bill_name", None)
            transaction.pop("bill_size", None)
            transaction.pop("bill_content", None)
            transaction.pop("bill_uploaded_at", None)
            return transaction
    raise HTTPException(status_code=404, detail="Transaction not found")

