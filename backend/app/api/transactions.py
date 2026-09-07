from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
import os
import shutil
import hashlib
from datetime import datetime

from app.core.security import get_current_user_id
from app.ml.ai_engine import ai_engine
from app.repositories import memory
from app.schemas.finance import Transaction
from app.services.financial_service import transaction_summary

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(user_id: str = Depends(get_current_user_id)) -> dict:
    memory.process_recurring_transactions(user_id)
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


@router.get("/deleted/list")
def list_deleted_transactions(user_id: str = Depends(get_current_user_id)) -> dict:
    deleted = memory.get_deleted_transactions_60days(user_id)
    return {"deleted_transactions": deleted}


@router.post("/income-suite")
def update_income_suite(payload: dict, user_id: str = Depends(get_current_user_id)) -> dict:
    amount = float(payload.get("amount", 0))
    apply_to_all_months = bool(payload.get("apply_to_all_months", True))
    txn_id = payload.get("transaction_id")
    updated_profile = memory.update_monthly_income_suite(user_id, amount, apply_to_all_months, transaction_id=txn_id)
    return {"profile": updated_profile, "status": "updated"}


@router.post("/{transaction_id}/restore")
def restore_transaction(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    memory.restore_transaction(user_id, transaction_id)
    transactions = memory.state_copy(user_id)["transactions"]
    return {"transactions": transactions, "summary": transaction_summary(transactions)}


@router.post("/upload-bill")
async def upload_bill(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)) -> dict:
    os.makedirs("uploads", exist_ok=True)
    filename = file.filename.replace(" ", "_")
    file_location = f"uploads/{datetime.now().timestamp()}_{filename}"
    content = await file.read()
    with open(file_location, "wb") as f:
        f.write(content)
    return {"bill_url": f"/{file_location}", "filename": file.filename}


@router.post("/{transaction_id}/bill")
async def attach_transaction_bill(transaction_id: str, file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)) -> dict:
    if file.content_type not in ("application/pdf", "application/octet-stream") and not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only application/pdf files are accepted.")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds maximum 10MB limit.")

    os.makedirs("uploads", exist_ok=True)
    filename = file.filename.replace(" ", "_")
    storage_key = f"uploads/{datetime.now().timestamp()}_{filename}"
    
    with open(storage_key, "wb") as f:
        f.write(content)

    checksum = hashlib.sha256(content).hexdigest()

    bill_metadata = {
        "original_filename": file.filename,
        "storage_key": storage_key,
        "mime_type": "application/pdf",
        "file_size": len(content),
        "checksum": checksum,
        "uploaded_at": datetime.now().isoformat(),
        "url": f"/{storage_key}"
    }

    try:
        updated_bill = memory.attach_bill_to_transaction(user_id, transaction_id, bill_metadata)
        return {"attached": True, "bill": updated_bill}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{transaction_id}/bill")
def get_transaction_bill(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    bill = memory.get_transaction_bill(user_id, transaction_id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found for this transaction.")
    return {"bill": bill}


@router.delete("/{transaction_id}/bill")
def delete_transaction_bill(transaction_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    success = memory.delete_transaction_bill(user_id, transaction_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found or could not be removed.")
    return {"removed": True, "message": "Bill reference removed successfully."}


@router.get("/recurring")
def get_recurring_transactions(user_id: str = Depends(get_current_user_id)) -> dict:
    return {"recurring": memory.get_recurring_transactions(user_id)}


@router.post("/recurring")
def add_recurring_transaction(payload: dict, user_id: str = Depends(get_current_user_id)) -> dict:
    created = memory.add_recurring_transaction(user_id, payload)
    return {"recurring": created}


@router.put("/recurring/{recurring_id}")
def update_recurring_transaction(recurring_id: str, payload: dict, user_id: str = Depends(get_current_user_id)) -> dict:
    try:
        updated = memory.update_recurring_transaction(user_id, recurring_id, payload)
        return {"recurring": updated}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/recurring/{recurring_id}")
def delete_recurring_transaction(recurring_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    memory.delete_recurring_transaction(user_id, recurring_id)
    return {"status": "deleted"}


@router.post("/recurring/process")
def process_recurring_transactions(user_id: str = Depends(get_current_user_id)) -> dict:
    processed = memory.process_recurring_transactions(user_id)
    return {"processed": processed}
