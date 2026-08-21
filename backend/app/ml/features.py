from app.schemas.finance import FinancialProfile
from app.services.finance_engine import monthly_cash_flow, total_expenses


def profile_features(profile: FinancialProfile) -> dict:
    return {
        "monthly_income": profile.monthly_income,
        "monthly_expenses": total_expenses(profile),
        "monthly_cash_flow": monthly_cash_flow(profile),
        "total_debt": profile.total_debt,
        "emergency_fund": profile.emergency_fund,
        "investments_balance": profile.investments_balance,
    }
