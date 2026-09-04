import os
import pickle
import pandas as pd
from app.schemas.finance import FinancialProfile

class AdvancedModels:
    def __init__(self):
        self.expense_model = None
        self.investment_model = None
        self.goal_model = None
        self._load_models()

    def _load_models(self):
        models_dir = os.path.join(os.path.dirname(__file__), "models")
        
        try:
            with open(os.path.join(models_dir, "expense_model.pkl"), "rb") as f:
                self.expense_model = pickle.load(f).get("model")
            with open(os.path.join(models_dir, "investment_model.pkl"), "rb") as f:
                self.investment_model = pickle.load(f).get("model")
            with open(os.path.join(models_dir, "goal_model.pkl"), "rb") as f:
                self.goal_model = pickle.load(f).get("model")
        except Exception as e:
            print(f"Error loading advanced ML models: {e}")

    def _get_features(self, profile: FinancialProfile):
        income = profile.monthly_income * 12
        expenses = sum([e.amount for e in profile.monthly_expenses]) * 12
        return pd.DataFrame([{
            'income': income,
            'expenses': expenses,
            'savings_balance': profile.savings_balance,
            'investments_balance': profile.investments_balance,
            'debt': profile.total_debt
        }])

    def predict_expense_trend(self, profile: FinancialProfile) -> float:
        if not self.expense_model:
            return 1.0 # default multiplier
        features = self._get_features(profile)
        predicted = self.expense_model.predict(features)[0]
        current = sum([e.amount for e in profile.monthly_expenses]) * 12
        return predicted / max(current, 1)

    def predict_investment_return(self, profile: FinancialProfile) -> float:
        if not self.investment_model:
            return 8.0 # default
        features = self._get_features(profile)
        return float(self.investment_model.predict(features)[0])

    def predict_goal_feasibility(self, profile: FinancialProfile) -> float:
        if not self.goal_model:
            return 0.5 # default
        features = self._get_features(profile)
        return float(self.goal_model.predict(features)[0])

advanced_ml = AdvancedModels()
