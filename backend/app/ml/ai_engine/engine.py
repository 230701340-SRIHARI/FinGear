"""
AIEngine Orchestrator — Central class tying forecast + anomaly + weights together per user.

Lazy-loads per-user weights from disk on first access.
Provides top-level methods for all AI operations.
"""

from __future__ import annotations

from datetime import datetime
from threading import Lock

from app.ml.ai_engine.forecast_brain import ForecastBrain, ForecastWeights
from app.ml.ai_engine.anomaly_detector import (
    AnomalyEnsembleManager,
    AnomalyResult,
    AutoencoderWeights,
    UNIVERSE_NAMES,
    get_universe,
)
from app.ml.ai_engine import weight_store


class _UserAIState:
    """In-memory AI state for a single user."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.forecast_brain = ForecastBrain()
        self.anomaly_manager = AnomalyEnsembleManager()
        self.loaded = False
        self.anomaly_flags: dict[str, AnomalyResult] = {}  # txn_id -> result

    def load_weights(self):
        """Load persisted weights from disk if available."""
        if self.loaded:
            return
        result = weight_store.load_weights(self.user_id)
        if result:
            forecast_weights, multiverse_weights = result
            self.forecast_brain.weights = forecast_weights
            for name in UNIVERSE_NAMES:
                if name in multiverse_weights:
                    self.anomaly_manager.set_autoencoder_weights(name, multiverse_weights[name])
        self.loaded = True

    def save_weights(self):
        """Persist current weights to disk."""
        multiverse = {
            name: self.anomaly_manager.get_autoencoder_weights(name)
            for name in UNIVERSE_NAMES
        }
        weight_store.save_weights(self.user_id, self.forecast_brain.weights, multiverse)


class AIEngine:
    """
    Main AI engine managing per-user intelligence state.
    Thread-safe via per-user locks.
    """

    def __init__(self):
        self._users: dict[str, _UserAIState] = {}
        self._lock = Lock()

    def _get_user(self, user_id: str) -> _UserAIState:
        """Get or create user AI state, loading persisted weights."""
        with self._lock:
            if user_id not in self._users:
                self._users[user_id] = _UserAIState(user_id)
            state = self._users[user_id]
        state.load_weights()
        return state

    def process_transaction(self, user_id: str, transaction: dict, all_transactions: list[dict]) -> AnomalyResult:
        """
        Process a new transaction: train anomaly models, check for anomaly, update forecast.

        Called when a new transaction is created.
        """
        state = self._get_user(user_id)

        # Retrain anomaly ensemble with full transaction history
        state.anomaly_manager.train_all(all_transactions)

        # Detect anomaly for the new transaction
        result = state.anomaly_manager.detect(transaction)

        # Store anomaly flag if detected
        txn_id = transaction.get("id", "")
        if txn_id and result.is_anomaly:
            state.anomaly_flags[txn_id] = result

        # Save weights after training
        state.save_weights()

        return result

    def get_forecast(
        self,
        user_id: str,
        transactions: list[dict],
        current_balance: float = 0.0,
        monthly_income: float = 0.0,
        monthly_pot_contributions: float = 0.0,
    ) -> dict:
        """Get expense forecast for a user."""
        state = self._get_user(user_id)
        result = state.forecast_brain.get_forecast(
            transactions=transactions,
            current_balance=current_balance,
            monthly_income=monthly_income,
            monthly_pot_contributions=monthly_pot_contributions,
        )

        # Save weights after potential training
        state.save_weights()

        return {
            "predicted_tomorrow": result.predicted_tomorrow,
            "projected_monthly_total": result.projected_monthly_total,
            "projected_savings": result.projected_savings,
            "confidence": result.confidence,
            "data_maturity_days": result.data_maturity_days,
            "status": result.status,
            "status_message": result.status_message,
            "days_until_ready": result.days_until_ready,
        }

    def get_anomalies(self, user_id: str, transactions: list[dict]) -> list[dict]:
        """
        Get all anomalous transactions for a user.
        Re-runs detection on all transactions.
        """
        state = self._get_user(user_id)

        # Re-train on current data
        state.anomaly_manager.train_all(transactions)

        anomalies = []
        for txn in transactions:
            if txn.get("type") != "expense":
                continue
            result = state.anomaly_manager.detect(txn)
            if result.is_anomaly:
                anomalies.append({
                    "transaction": txn,
                    "anomaly": {
                        "is_anomaly": result.is_anomaly,
                        "score": result.score,
                        "phase": result.phase,
                        "kmeans_score": result.kmeans_score,
                        "autoencoder_score": result.autoencoder_score,
                        "reason": result.reason,
                        "universe": get_universe(txn.get("category", "Other")),
                    },
                })

        return anomalies

    def acknowledge_anomaly(self, user_id: str, transaction: dict) -> dict:
        """
        Human-in-the-loop: acknowledge a transaction as normal.
        Triggers autoencoder retraining to incorporate this pattern.
        """
        state = self._get_user(user_id)

        # Retrain autoencoder on this acknowledged transaction
        state.anomaly_manager.train_on_feedback(transaction)

        # Remove from anomaly flags
        txn_id = transaction.get("id", "")
        if txn_id in state.anomaly_flags:
            del state.anomaly_flags[txn_id]

        # Save updated weights
        state.save_weights()

        return {
            "acknowledged": True,
            "transaction_id": txn_id,
            "message": "Anomaly acknowledged. Model weights updated to incorporate this spending pattern.",
        }

    def get_status(self, user_id: str, transactions: list[dict]) -> dict:
        """Get overall AI engine status for a user."""
        state = self._get_user(user_id)

        # Ensure anomaly models are trained with current data
        state.anomaly_manager.train_all(transactions)

        # Get forecast status
        forecast = state.forecast_brain.get_forecast(transactions)

        return {
            "forecast": {
                "status": forecast.status,
                "status_message": forecast.status_message,
                "data_maturity_days": forecast.data_maturity_days,
                "days_until_ready": forecast.days_until_ready,
                "confidence": forecast.confidence,
            },
            "anomaly_detection": state.anomaly_manager.get_status(),
            "weight_info": weight_store.get_weight_info(user_id),
        }

    def get_weights(self, user_id: str) -> dict:
        """Get current serialized weight state (for debug/transparency)."""
        state = self._get_user(user_id)
        return {
            "forecast_weights": state.forecast_brain.weights.to_list(),
            "multiverse_weights": {
                name: state.anomaly_manager.get_autoencoder_weights(name).to_list()
                for name in UNIVERSE_NAMES
            },
        }

    def factory_reset(self, user_id: str) -> dict:
        """Nuclear factory reset: delete all AI weights and state for a user."""
        # Delete persisted weights
        deleted = weight_store.delete_weights(user_id)

        # Reset in-memory state
        with self._lock:
            if user_id in self._users:
                del self._users[user_id]

        return {
            "reset": True,
            "weights_deleted": deleted,
            "message": "All AI weights and state have been reset to defaults.",
        }
