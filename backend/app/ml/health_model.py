import os
import pickle
import pandas as pd
from app.schemas.finance import FinancialProfile
from app.services.finance_engine import health_score


class ExplainableHealthModel:
    def __init__(self):
        self.model = None
        self.metrics = None
        self.mode = "rule-based-explainable"
        self._load_model()

    def _load_model(self):
        model_path = os.path.join(os.path.dirname(__file__), "models", "health_model.pkl")
        if os.path.exists(model_path):
            try:
                with open(model_path, "rb") as f:
                    data = pickle.load(f)
                self.model = data.get("model")
                self.metrics = data.get("metrics")
                self.mode = "ml-enhanced-explainable"
            except Exception as e:
                print(f"Error loading health model: {e}")

    def score(self, profile: FinancialProfile) -> dict:
        base_score_data = health_score(profile)
        
        if self.model:
            income = profile.monthly_income * 12
            expenses = sum([e.amount for e in profile.monthly_expenses]) * 12
            features = pd.DataFrame([{
                'income': income,
                'expenses': expenses,
                'savings_balance': profile.savings_balance,
                'investments_balance': profile.investments_balance,
                'debt': profile.total_debt
            }])
            
            ml_pred = self.model.predict(features)[0]
            
            # Blend ML prediction with rule-based score
            blended_score = int(0.6 * base_score_data["score"] + 0.4 * ml_pred)
            base_score_data["score"] = blended_score
            base_score_data["explanation"]["ml_insight"] = f"ML model predicted a score of {int(ml_pred)}. Blended with rules."
            
        return base_score_data
