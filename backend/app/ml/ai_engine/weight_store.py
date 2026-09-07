"""
Weight Serialization & Persistence — PostgreSQL-first per-user weight storage with JSON file fallback.

Schema:
{
  "forecast_weights": [w0, w1, ..., w6, bias],           # 8 floats
  "multiverse_weights": {
    "FOOD":     [17 floats],
    "SHOPPING": [17 floats],
    "OTHERS":   [17 floats]
  },
  "last_sync": 1776154800000                              # epoch ms
}
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from app.ml.ai_engine.forecast_brain import ForecastWeights
from app.ml.ai_engine.anomaly_detector import AutoencoderWeights, UNIVERSE_NAMES
from app.database.postgres import SessionLocal
from app.database.models import AIModelWeight

# Weight files directory: relative to backend root
WEIGHTS_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent.parent / "ai_weights"


def _user_weight_path(user_id: str) -> Path:
    return WEIGHTS_DIR / f"{user_id}.json"


def save_weights(
    user_id: str,
    forecast_weights: ForecastWeights,
    multiverse_weights: dict[str, AutoencoderWeights],
) -> None:
    """Persist all AI weights for a user to PostgreSQL (primary) and JSON disk (fallback)."""
    forecast_list = forecast_weights.to_list()
    multiverse_dict = {
        name: weights.to_list()
        for name, weights in multiverse_weights.items()
    }

    # 1. Primary: Try PostgreSQL DB persistence
    if SessionLocal:
        try:
            db = SessionLocal()
            try:
                weight_obj = db.query(AIModelWeight).filter(AIModelWeight.user_key == user_id).first()
                if not weight_obj:
                    weight_obj = AIModelWeight(
                        user_key=user_id,
                        forecast_weights=forecast_list,
                        category_weights=multiverse_dict,
                    )
                    db.add(weight_obj)
                else:
                    weight_obj.forecast_weights = forecast_list
                    weight_obj.category_weights = multiverse_dict
                db.commit()
            finally:
                db.close()
        except Exception as err:
            print(f"[weight_store] DB save warning: {err}")

    # 2. Disk fallback sync
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    data = {
        "forecast_weights": forecast_list,
        "multiverse_weights": multiverse_dict,
        "last_sync": int(time.time() * 1000),
    }
    path = _user_weight_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_weights(user_id: str) -> tuple[ForecastWeights, dict[str, AutoencoderWeights]] | None:
    """Load persisted AI weights for a user from PostgreSQL DB or JSON file fallback."""
    # 1. Primary: Try PostgreSQL database
    if SessionLocal:
        try:
            db = SessionLocal()
            try:
                weight_obj = db.query(AIModelWeight).filter(AIModelWeight.user_key == user_id).first()
                if weight_obj:
                    forecast = ForecastWeights.from_list(weight_obj.forecast_weights or [])
                    multiverse = {}
                    mw = weight_obj.category_weights or {}
                    for name, w_list in mw.items():
                        multiverse[name] = AutoencoderWeights.from_list(w_list)
                    for name in UNIVERSE_NAMES:
                        if name not in multiverse:
                            multiverse[name] = AutoencoderWeights()
                    return forecast, multiverse
            finally:
                db.close()
        except Exception as err:
            print(f"[weight_store] DB load warning: {err}")

    # 2. JSON disk fallback
    path = _user_weight_path(user_id)
    if not path.exists():
        return None

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError):
        return None

    forecast = ForecastWeights.from_list(data.get("forecast_weights", []))
    multiverse = {}
    mw = data.get("multiverse_weights", {})
    for name, w_list in mw.items():
        multiverse[name] = AutoencoderWeights.from_list(w_list)
    for name in UNIVERSE_NAMES:
        if name not in multiverse:
            multiverse[name] = AutoencoderWeights()

    return forecast, multiverse


def delete_weights(user_id: str) -> bool:
    """Factory reset: delete weight records for a user from DB and disk."""
    deleted = False
    if SessionLocal:
        try:
            db = SessionLocal()
            try:
                db.query(AIModelWeight).filter(AIModelWeight.user_key == user_id).delete()
                db.commit()
                deleted = True
            finally:
                db.close()
        except Exception as err:
            print(f"[weight_store] DB delete warning: {err}")

    path = _user_weight_path(user_id)
    if path.exists():
        path.unlink()
        deleted = True
    return deleted


def get_weight_info(user_id: str) -> dict:
    """Get weight metadata without full deserialization."""
    db_status = "inactive"
    if SessionLocal:
        try:
            db = SessionLocal()
            try:
                weight_obj = db.query(AIModelWeight).filter(AIModelWeight.user_key == user_id).first()
                if weight_obj:
                    db_status = "active (PostgreSQL)"
            finally:
                db.close()
        except Exception:
            pass

    path = _user_weight_path(user_id)
    if not path.exists():
        return {"exists": False, "path": str(path), "db_storage": db_status}

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "exists": True,
            "path": str(path),
            "db_storage": db_status,
            "last_sync": data.get("last_sync"),
            "forecast_param_count": len(data.get("forecast_weights", [])),
            "multiverse_categories": list(data.get("multiverse_weights", {}).keys()),
            "total_params": (
                len(data.get("forecast_weights", []))
                + sum(len(v) for v in data.get("multiverse_weights", {}).values())
            ),
            "file_size_bytes": path.stat().st_size,
        }
    except (json.JSONDecodeError, IOError):
        return {"exists": True, "path": str(path), "error": "Corrupt weight file"}
