"""
Explainable Financial Health Model — app.ml.health_model
Canonical, explainable financial health scoring engine for FinGear.

Unifies health scoring across the dashboard, financial health assessment page,
simulations, and digital twin using the 5-component Financial Health Network framework.
"""

from __future__ import annotations

from app.schemas.finance import FinancialProfile
from app.services.financial_health import compute_financial_health_score


class ExplainableHealthModel:
    """
    Canonical Explainable Financial Health Scoring Engine.
    Uses real transactions and profile data—not a black-box ML regressor—
    adapting budgeting targets to income tiers.
    """

    def __init__(self):
        self.mode = "financial-health-network-framework"
        self.model_name = "Financial Health Network Framework (5-Tier Adaptive)"
        self.method = "Explainable Adaptive Financial Health Engine"

    def score(
        self,
        profile: FinancialProfile,
        transactions: list[dict] | None = None,
        budgets: list[dict] | None = None
    ) -> dict:
        result = compute_financial_health_score(profile, transactions=transactions, budgets=budgets)
        result["model_mode"] = self.mode
        result["model_name"] = self.model_name
        result["is_ml_active"] = False  # Transparent explainable scoring, not black-box
        return result
