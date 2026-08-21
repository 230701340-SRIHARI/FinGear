from app.schemas.finance import FinancialProfile
from app.services.finance_engine import health_score


class ExplainableHealthModel:
    mode = "rule-based-explainable"

    def score(self, profile: FinancialProfile) -> dict:
        return health_score(profile)
