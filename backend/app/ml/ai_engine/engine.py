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
        self.last_txns_signature = None
        self.cached_anomalies: list[dict] | None = None
        self.last_forecast_signature = None
        self.cached_forecast: dict | None = None

    def invalidate_cache(self):
        self.last_txns_signature = None
        self.cached_anomalies = None
        self.last_forecast_signature = None
        self.cached_forecast = None

    def load_weights(self):
        """Load persisted weights from disk if available."""
        if self.loaded:
            return
        result = weight_store.load_weights(self.user_id)
        if result:
            forecast_weights, multiverse_weights = result
            self.forecast_brain.weights = forecast_weights
            for name, w in multiverse_weights.items():
                self.anomaly_manager.set_autoencoder_weights(name, w)
        self.loaded = True

    def save_weights(self):
        """Persist current weights to disk."""
        multiverse = {
            name: self.anomaly_manager.get_autoencoder_weights(name)
            for name in self.anomaly_manager.brains.keys()
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

        Critical: we train on HISTORICAL transactions only (excluding the new one) so the
        model's baseline (median, cluster centroids, autoencoder weights) is not contaminated
        by the very transaction we are trying to evaluate. After detection:
        - If NOT an anomaly: incorporate it via an online train step.
        - If IS an anomaly: leave it out until the user explicitly acknowledges it.
        """
        state = self._get_user(user_id)
        state.invalidate_cache()

        txn_id = transaction.get("id", "")

        # Build historical baseline — exclude the new transaction itself
        historical = [t for t in all_transactions if str(t.get("id", "")) != str(txn_id)]

        # Retrain anomaly ensemble on historical data only
        state.anomaly_manager.train_all(historical)

        # Detect anomaly for the new transaction against the clean baseline
        result = state.anomaly_manager.detect(transaction)

        if txn_id and result.is_anomaly:
            # Store anomaly flag; do NOT train on this transaction yet
            state.anomaly_flags[txn_id] = result
        else:
            # Not an anomaly — safe to do an online update to incorporate this pattern
            if transaction.get("type") == "expense":
                state.anomaly_manager.train_on_feedback(transaction)

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
        salary_day: int = 1,
        monthly_expenses: float = 0.0,
    ) -> dict:
        """Get expense forecast for a user with smart in-memory caching."""
        state = self._get_user(user_id)
        transaction_signature = tuple(
            (txn.get("id"), txn.get("date"), txn.get("amount"), txn.get("type"), txn.get("category"))
            for txn in transactions
        )
        sig = (transaction_signature, current_balance, monthly_income, monthly_pot_contributions, salary_day, monthly_expenses)
        if state.cached_forecast is not None and state.last_forecast_signature == sig:
            return state.cached_forecast

        result = state.forecast_brain.get_forecast(
            transactions=transactions,
            current_balance=current_balance,
            monthly_income=monthly_income,
            monthly_pot_contributions=monthly_pot_contributions,
            salary_day=salary_day,
            monthly_expenses=monthly_expenses,
        )

        res_dict = {
            "predicted_tomorrow": result.predicted_tomorrow,
            "projected_monthly_total": result.projected_monthly_total,
            "projected_savings": result.projected_savings,
            "confidence": result.confidence,
            "data_maturity_days": result.data_maturity_days,
            "status": result.status,
            "status_message": result.status_message,
            "days_until_ready": result.days_until_ready,
            "daily_predictions": result.daily_predictions,
            "model_type": getattr(result, "model_type", "statistical_rule_7d"),
            "feature_importances": getattr(result, "feature_importances", {}),
            "architecture": getattr(result, "architecture", {}),
        }
        state.cached_forecast = res_dict
        state.last_forecast_signature = sig
        return res_dict

    def get_anomalies(self, user_id: str, transactions: list[dict]) -> list[dict]:
        """
        Get all anomalous transactions for a user.
        Uses in-memory caching if transaction list has not changed.
        """
        state = self._get_user(user_id)
        txns_sig = (len(transactions), tuple(t.get("id") for t in transactions[:20]))
        if state.cached_anomalies is not None and state.last_txns_signature == txns_sig:
            return state.cached_anomalies

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

        state.cached_anomalies = anomalies
        state.last_txns_signature = txns_sig
        return anomalies

    def acknowledge_anomaly(self, user_id: str, transaction: dict) -> dict:
        """
        Human-in-the-loop: acknowledge a transaction as normal.
        Triggers autoencoder retraining to incorporate this pattern.
        """
        state = self._get_user(user_id)
        state.invalidate_cache()

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
                for name in state.anomaly_manager.brains.keys()
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
