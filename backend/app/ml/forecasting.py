from dataclasses import dataclass

from app.schemas.finance import FinancialProfile
from app.services.finance_engine import forecast


@dataclass
class ForecastResult:
    mode: str
    model_version: str
    confidence: int
    assumptions: dict
    metrics: dict
    months: list[dict]


class ForecastEngine:
    """Replaceable forecasting interface. Current mode is baseline, not a trained ML model."""

    model_version = "baseline-v1"

    def predict(self, profile: FinancialProfile, months: int = 24) -> ForecastResult:
        return ForecastResult(
            mode="Baseline projection",
            model_version=self.model_version,
            confidence=84,
            assumptions={
                "income_growth": "0% in current MVP",
                "expense_growth": "0% in current MVP",
                "investment_return": "Approx. 7.2% annualized",
                "savings_behavior": "Current monthly surplus pattern",
            },
            metrics={"MAE": None, "RMSE": None, "R2": None, "note": "No trained dataset connected yet."},
            months=forecast(profile, months)["months"],
        )
