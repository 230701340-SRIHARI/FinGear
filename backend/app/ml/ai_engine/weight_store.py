"""
Weight Serialization & Persistence — JSON file-based per-user weight storage.

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

# Weight files directory: relative to backend root
WEIGHTS_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent.parent / "ai_weights"


def _user_weight_path(user_id: str) -> Path:
    return WEIGHTS_DIR / f"{user_id}.json"


def save_weights(
    user_id: str,
    forecast_weights: ForecastWeights,
    multiverse_weights: dict[str, AutoencoderWeights],
) -> None:
    """Persist all AI weights for a user to disk."""
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    data = {
        "forecast_weights": forecast_weights.to_list(),
        "multiverse_weights": {
            name: multiverse_weights[name].to_list()
            for name in UNIVERSE_NAMES
            if name in multiverse_weights
        },
        "last_sync": int(time.time() * 1000),
    }

    path = _user_weight_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_weights(user_id: str) -> tuple[ForecastWeights, dict[str, AutoencoderWeights]] | None:
    """Load persisted AI weights for a user. Returns None if no file exists."""
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
    for name in UNIVERSE_NAMES:
        if name in mw:
            multiverse[name] = AutoencoderWeights.from_list(mw[name])
        else:
            multiverse[name] = AutoencoderWeights()

    return forecast, multiverse


def delete_weights(user_id: str) -> bool:
    """Factory reset: delete weight file for a user."""
    path = _user_weight_path(user_id)
    if path.exists():
        path.unlink()
        return True
    return False


def get_weight_info(user_id: str) -> dict:
    """Get weight file metadata without full deserialization."""
    path = _user_weight_path(user_id)
    if not path.exists():
        return {"exists": False, "path": str(path)}

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "exists": True,
            "path": str(path),
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
