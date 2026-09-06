"""PostgreSQL-first persistence for per-user AI model weights."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

from app.database.models import AIModelWeights
from app.database.postgres import SessionLocal
from app.ml.ai_engine.anomaly_detector import AutoencoderWeights
from app.ml.ai_engine.forecast_brain import ForecastWeights

WEIGHTS_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent.parent / "ai_weights"


def _user_weight_path(user_id: str) -> Path:
    return WEIGHTS_DIR / f"{user_id}.json"


def _decode(forecast_values: list, category_values: dict) -> tuple[ForecastWeights, dict[str, AutoencoderWeights]]:
    return (
        ForecastWeights.from_list(forecast_values),
        {name: AutoencoderWeights.from_list(values) for name, values in category_values.items()},
    )


def _load_database(user_id: str):
    if not SessionLocal:
        return None
    session = SessionLocal()
    try:
        row = session.get(AIModelWeights, str(user_id))
        if not row:
            return None
        return _decode(row.forecast_weights or [], row.category_weights or {})
    except SQLAlchemyError:
        session.rollback()
        return None
    finally:
        session.close()


def _save_database(user_id: str, forecast_weights: ForecastWeights, category_weights: dict[str, AutoencoderWeights]) -> bool:
    if not SessionLocal:
        return False
    session = SessionLocal()
    try:
        row = session.get(AIModelWeights, str(user_id))
        if row is None:
            row = AIModelWeights(user_key=str(user_id))
            session.add(row)
        row.forecast_weights = forecast_weights.to_list()
        row.category_weights = {name: weights.to_list() for name, weights in category_weights.items()}
        session.commit()
        return True
    except SQLAlchemyError:
        session.rollback()
        return False
    finally:
        session.close()


def save_weights(user_id: str, forecast_weights: ForecastWeights, category_weights: dict[str, AutoencoderWeights]) -> None:
    """Persist weights to PostgreSQL; retain JSON fallback for offline development."""
    if _save_database(user_id, forecast_weights, category_weights):
        return

    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    data = {
        "forecast_weights": forecast_weights.to_list(),
        "multiverse_weights": {name: weights.to_list() for name, weights in category_weights.items()},
        "last_sync": int(time.time() * 1000),
    }
    with _user_weight_path(user_id).open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def load_weights(user_id: str) -> tuple[ForecastWeights, dict[str, AutoencoderWeights]] | None:
    """Load PostgreSQL weights first, then migrate/read legacy JSON weights."""
    database_weights = _load_database(user_id)
    if database_weights:
        return database_weights

    path = _user_weight_path(user_id)
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        decoded = _decode(data.get("forecast_weights", []), data.get("multiverse_weights", {}))
        if SessionLocal:
            _save_database(user_id, decoded[0], decoded[1])
        return decoded
    except (json.JSONDecodeError, OSError):
        return None


def delete_weights(user_id: str) -> bool:
    deleted = False
    if SessionLocal:
        session = SessionLocal()
        try:
            row = session.get(AIModelWeights, str(user_id))
            if row:
                session.delete(row)
                session.commit()
                deleted = True
        except SQLAlchemyError:
            session.rollback()
        finally:
            session.close()

    path = _user_weight_path(user_id)
    if path.exists():
        path.unlink()
        deleted = True
    return deleted


def get_weight_info(user_id: str) -> dict:
    if SessionLocal:
        session = SessionLocal()
        try:
            row = session.get(AIModelWeights, str(user_id))
            if row:
                return {
                    "storage": "postgresql",
                    "exists": True,
                    "forecast_param_count": len(row.forecast_weights or []),
                    "multiverse_categories": list((row.category_weights or {}).keys()),
                    "total_params": len(row.forecast_weights or []) + sum(len(values) for values in (row.category_weights or {}).values()),
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                }
        except SQLAlchemyError:
            session.rollback()
        finally:
            session.close()

    path = _user_weight_path(user_id)
    if not path.exists():
        return {"storage": "fallback-file", "exists": False}
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return {
            "storage": "fallback-file",
            "exists": True,
            "last_sync": data.get("last_sync"),
            "forecast_param_count": len(data.get("forecast_weights", [])),
            "multiverse_categories": list(data.get("multiverse_weights", {}).keys()),
            "total_params": len(data.get("forecast_weights", [])) + sum(len(values) for values in data.get("multiverse_weights", {}).values()),
            "file_size_bytes": path.stat().st_size,
        }
    except (json.JSONDecodeError, OSError):
        return {"storage": "fallback-file", "exists": True, "error": "Corrupt weight file"}