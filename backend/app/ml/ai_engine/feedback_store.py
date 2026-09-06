from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.models import AITrainingFeedback
from app.database.postgres import SessionLocal


def record(user_id: str, transaction_id: str, decision: str) -> bool:
    if not SessionLocal:
        return False
    session = SessionLocal()
    try:
        key = (str(user_id), str(transaction_id))
        row = session.get(AITrainingFeedback, key)
        if row is None:
            row = AITrainingFeedback(user_key=key[0], transaction_key=key[1])
            session.add(row)
        row.decision = decision
        session.commit()
        return True
    except SQLAlchemyError:
        session.rollback()
        return False
    finally:
        session.close()


def excluded_transaction_ids(user_id: str) -> set[str]:
    if not SessionLocal:
        return set()
    session = SessionLocal()
    try:
        rows = session.scalars(
            select(AITrainingFeedback.transaction_key).where(
                AITrainingFeedback.user_key == str(user_id),
                AITrainingFeedback.decision == "excluded",
            )
        )
        return {str(transaction_id) for transaction_id in rows}
    except SQLAlchemyError:
        session.rollback()
        return set()
    finally:
        session.close()


def clear(user_id: str) -> None:
    if not SessionLocal:
        return
    session = SessionLocal()
    try:
        session.query(AITrainingFeedback).filter(AITrainingFeedback.user_key == str(user_id)).delete()
        session.commit()
    except SQLAlchemyError:
        session.rollback()
    finally:
        session.close()