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
        Full forecast pipeline: aggregate transactions by day, check maturity, infer/train.

        Args:
            transactions: List of transaction dicts with 'date', 'amount', 'type' keys.
            current_balance: User's current savings balance.
            monthly_income: User's monthly income.
            monthly_pot_contributions: Monthly contributions to savings pots.
        """
        # Aggregate daily expense totals
        daily_expenses = _aggregate_daily_expenses(transactions)
        unique_days = len(daily_expenses)

        if unique_days < WINDOW_SIZE:
            return ForecastResult(
                predicted_tomorrow=0.0,
                projected_monthly_total=0.0,
                projected_savings=0.0,
                confidence=0,
                data_maturity_days=unique_days,
                status="learning",
                status_message=f"App is learning your habits ({WINDOW_SIZE - unique_days} days to go)...",
                days_until_ready=WINDOW_SIZE - unique_days,
            )

        # Get sorted dates
        sorted_dates = sorted(daily_expenses.keys())

        # Build the most recent 7-day window for inference
        recent_7 = [daily_expenses.get(sorted_dates[-(WINDOW_SIZE - i)], 0.0) for i in range(WINDOW_SIZE, 0, -1)]

        # Online training if we have >= 8 days
        if unique_days >= WINDOW_SIZE + 1:
            # Train on all available sliding windows
            for i in range(len(sorted_dates) - WINDOW_SIZE):
                window_dates = sorted_dates[i : i + WINDOW_SIZE]
                label_date = sorted_dates[i + WINDOW_SIZE]
                x = [daily_expenses[d] for d in window_dates]
                y = daily_expenses[label_date]
                self.train(x, y)

        # Inference
        predicted_tomorrow = self.infer(recent_7)

        # Financial projections
        today = date.today()
        days_in_month = (today.replace(month=today.month % 12 + 1, day=1) - timedelta(days=1)).day if today.month < 12 else 31
        day_of_month = today.day
        remaining_days = max(days_in_month - day_of_month, 0)

        # Spent so far this month
        month_start = today.replace(day=1)
        spent_this_month = sum(
            v for k, v in daily_expenses.items()
            if k >= month_start
        )

        projected_monthly_total = spent_this_month + (predicted_tomorrow * remaining_days)
        projected_savings = current_balance + monthly_pot_contributions - projected_monthly_total

        status = "training" if unique_days >= WINDOW_SIZE + 1 else "inferring"
        confidence = min(50 + unique_days * 5, 92)

        return ForecastResult(
            predicted_tomorrow=round(predicted_tomorrow, 2),
            projected_monthly_total=round(projected_monthly_total, 2),
            projected_savings=round(projected_savings, 2),
            confidence=confidence,
            data_maturity_days=unique_days,
            status=status,
            status_message=f"Forecast active with {unique_days} days of data.",
            days_until_ready=0,
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
