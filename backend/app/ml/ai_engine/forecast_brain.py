"""
Expense Forecasting Brain — Pure NumPy Autoregressive Linear Regression with SGD.

Architecture (adapted from TFLite model specification):
  - Input:  x ∈ ℝ⁷  (last 7 days of aggregated daily expenses, normalized / 1000)
  - Weights: W ∈ ℝ⁷, bias b ∈ ℝ¹
  - Inference: ŷ = x · W + b
  - Training: SGD with η = 0.01, MSE loss, NaN/Inf safety guards
  - Output denormalized: ŷ_final = ŷ × 1000
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional

import numpy as np


WINDOW_SIZE = 7
LEARNING_RATE = 0.01
NORMALIZATION_FACTOR = 1000.0
DEFAULT_WEIGHTS = [0.1] * WINDOW_SIZE
DEFAULT_BIAS = 0.0


@dataclass
class ForecastWeights:
    """Serializable weight state for the forecast brain."""
    W: list[float] = field(default_factory=lambda: list(DEFAULT_WEIGHTS))
    b: float = DEFAULT_BIAS

    def to_list(self) -> list[float]:
        """Serialize to flat float list: [w0..w6, b]."""
        return self.W + [self.b]

    @classmethod
    def from_list(cls, values: list[float]) -> "ForecastWeights":
        """Deserialize from flat float list."""
        if len(values) != WINDOW_SIZE + 1:
            return cls()
        return cls(W=values[:WINDOW_SIZE], b=values[WINDOW_SIZE])

    def reset(self):
        self.W = list(DEFAULT_WEIGHTS)
        self.b = DEFAULT_BIAS


@dataclass
class ForecastResult:
    """Result of a forecast inference."""
    predicted_tomorrow: float
    projected_monthly_total: float
    projected_savings: float
    confidence: int
    data_maturity_days: int
    status: str  # "learning", "inferring", "training"
    status_message: str
    days_until_ready: int


class ForecastBrain:
    """
    On-device (on-server) expense forecasting engine.

    Lifecycle:
      Days < 7:  Insufficient data → status "learning"
      Days >= 7: First inference available → status "inferring"
      Days >= 8: Online training enabled → status "training"
    """

    def __init__(self, weights: Optional[ForecastWeights] = None):
        self.weights = weights or ForecastWeights()

    def _normalize(self, values: list[float]) -> np.ndarray:
        return np.array(values, dtype=np.float64) / NORMALIZATION_FACTOR

    def _denormalize(self, value: float) -> float:
        return value * NORMALIZATION_FACTOR

    def _is_safe(self, value: float) -> bool:
        return math.isfinite(value) and not math.isnan(value)

    def infer(self, last_7_days: list[float]) -> float:
        """
        Predict tomorrow's spending from last 7 days of aggregated expenses.

        Args:
            last_7_days: List of 7 floats, each being total expenses for that day.

        Returns:
            Predicted spending for tomorrow (denormalized).
        """
        if len(last_7_days) != WINDOW_SIZE:
            return 0.0

        x = self._normalize(last_7_days)
        W = np.array(self.weights.W, dtype=np.float64)
        b = self.weights.b

        y_pred = float(np.dot(x, W) + b)

        if not self._is_safe(y_pred):
            self.weights.reset()
            return 0.0

        return max(self._denormalize(y_pred), 0.0)

    def train(self, input_7_days: list[float], actual_next_day: float) -> float:
        """
        Perform one SGD training step.

        Args:
            input_7_days: 7 days of expenses (the input features).
            actual_next_day: The actual expense on the next (8th) day.

        Returns:
            The MSE loss for this training step.
        """
        if len(input_7_days) != WINDOW_SIZE:
            return float("inf")

        x = self._normalize(input_7_days)
        y_actual = actual_next_day / NORMALIZATION_FACTOR
        W = np.array(self.weights.W, dtype=np.float64)
        b = self.weights.b

        # Forward pass
        y_pred = float(np.dot(x, W) + b)

        # Loss: MSE
        error = y_pred - y_actual
        loss = error ** 2

        if not self._is_safe(loss):
            self.weights.reset()
            return float("inf")

        # Backward pass: gradients
        dW = 2.0 * error * x
        db = 2.0 * error

        # SGD update
        new_W = W - LEARNING_RATE * dW
        new_b = b - LEARNING_RATE * db

        # Safety check on updated weights
        if all(self._is_safe(w) for w in new_W) and self._is_safe(new_b):
            self.weights.W = new_W.tolist()
            self.weights.b = float(new_b)
        else:
            self.weights.reset()

        return loss

    def get_forecast(
        self,
        transactions: list[dict],
        current_balance: float = 0.0,
        monthly_income: float = 0.0,
        monthly_pot_contributions: float = 0.0,
    ) -> ForecastResult:
        """
        Full forecast pipeline delegating to the unified app.ml.forecasting.UserForecastingEngine.
        - Days < 7: Statistical & rule-based baseline (never returning zero).
        - Days >= 7: Custom user-trained RandomForestRegressor.
        """
        from app.ml.forecasting import UserForecastingEngine

        engine = UserForecastingEngine(monthly_income=monthly_income)
        daily_res = engine.forecast_daily(
            transactions=transactions,
            current_balance=current_balance,
            monthly_income=monthly_income,
            monthly_pot_contributions=monthly_pot_contributions,
        )

        return ForecastResult(
            predicted_tomorrow=daily_res.predicted_tomorrow,
            projected_monthly_total=daily_res.projected_monthly_total,
            projected_savings=daily_res.projected_savings,
            confidence=daily_res.confidence,
            data_maturity_days=daily_res.data_maturity_days,
            status=daily_res.status,
            status_message=daily_res.status_message,
            days_until_ready=daily_res.days_until_ready,
        )


def _aggregate_daily_expenses(transactions: list[dict]) -> dict[date, float]:
    """Aggregate transaction amounts by date, only counting expenses."""
    daily: dict[date, float] = {}
    for txn in transactions:
        if txn.get("type") != "expense":
            continue
        try:
            txn_date = datetime.strptime(txn["date"], "%Y-%m-%d").date() if isinstance(txn["date"], str) else txn["date"]
        except (ValueError, KeyError):
            continue
        daily[txn_date] = daily.get(txn_date, 0.0) + txn.get("amount", 0.0)
    return daily
