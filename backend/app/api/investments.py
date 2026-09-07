from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.ml.advanced_models import advanced_ml
from app.repositories import memory
from app.schemas.finance import FinancialProfile
from app.services.financial_service import asset_allocation, compute_portfolio_strategy

router = APIRouter(prefix="/investments", tags=["investments"])


@router.get("")
def get_investments(user_id: str = Depends(get_current_user_id)) -> dict:
    state = memory.state_copy(user_id)
    profile = FinancialProfile(**state["profile"])
    
    # Synchronize portfolio items with live profile asset balances
    items = list(state.get("investments", []))
    if not items:
        if profile.mutual_funds > 0:
            items.append({
                "name": "Diversified Mutual Funds (SIP)",
                "asset_class": "Mutual Funds",
                "value": profile.mutual_funds,
                "monthly_contribution": 5000,
                "expected_return": 12.0,
                "holding_type": "SIP Portfolio",
                "flow_label": "Monthly SIP",
            })
        if profile.fixed_deposits > 0:
            items.append({
                "name": "Bank Fixed Deposits (FD)",
                "asset_class": "Fixed Deposit",
                "value": profile.fixed_deposits,
                "monthly_contribution": 0,
                "expected_return": 7.1,
                "holding_type": "Term Deposit (Fixed)",
                "flow_label": "Deposit Type",
            })
        if profile.stocks > 0:
            items.append({
                "name": "Direct Equity & Bluechip Stocks",
                "asset_class": "Stocks",
                "value": profile.stocks,
                "monthly_contribution": 2500,
                "expected_return": 14.5,
                "holding_type": "Direct Equity (DCA)",
                "flow_label": "Recurring Inflow",
            })
        if profile.gold > 0:
            items.append({
                "name": "Sovereign Gold Bonds (SGB)",
                "asset_class": "Gold",
                "value": profile.gold,
                "monthly_contribution": 0,
                "expected_return": 8.5,
                "holding_type": "SGB / Bullion Asset",
                "flow_label": "Holding Type",
            })
        if profile.provident_fund > 0:
            items.append({
                "name": "Public Provident Fund (PPF / EPF)",
                "asset_class": "Provident Fund",
                "value": profile.provident_fund,
                "monthly_contribution": 3500,
                "expected_return": 7.1,
                "holding_type": "Statutory Retirement Plan",
                "flow_label": "Monthly Contribution",
            })
    else:
        for it in items:
            ac = it.get("asset_class")
            contrib = it.get("monthly_contribution", 0)
            if ac == "Mutual Funds" and profile.mutual_funds > 0:
                it["value"] = profile.mutual_funds
                it.setdefault("holding_type", "SIP Portfolio" if contrib > 0 else "Lump-sum Mutual Fund")
                it.setdefault("flow_label", "Monthly SIP" if contrib > 0 else "Holding Type")
            elif ac in ("Fixed Deposit", "FD") and profile.fixed_deposits > 0:
                it["value"] = profile.fixed_deposits
                it["monthly_contribution"] = 0
                it.setdefault("holding_type", "Term Deposit (Fixed)")
                it.setdefault("flow_label", "Deposit Type")
            elif ac in ("Stocks", "Equity") and profile.stocks > 0:
                it["value"] = profile.stocks
                it.setdefault("holding_type", "Direct Equity (DCA)" if contrib > 0 else "Direct Equity (Lump-sum)")
                it.setdefault("flow_label", "Recurring Inflow" if contrib > 0 else "Holding Type")
            elif ac == "Gold" and profile.gold > 0:
                it["value"] = profile.gold
                it["monthly_contribution"] = 0
                it.setdefault("holding_type", "SGB / Bullion Asset")
                it.setdefault("flow_label", "Holding Type")
            elif ac in ("Provident Fund", "PPF") and profile.provident_fund > 0:
                it["value"] = profile.provident_fund
                it.setdefault("holding_type", "Statutory Retirement Plan")
                it.setdefault("flow_label", "Monthly Contribution")

    total = sum(item["value"] for item in items)
    monthly = sum(item.get("monthly_contribution", 0) for item in items)
    strategy_info = compute_portfolio_strategy(profile)

    return {
        "total": total,
        "monthly_contribution": monthly,
        "estimated_return": strategy_info["estimated_return"],
        "items": items,
        "allocation": strategy_info["current_allocation"],
        "recommended_allocation": strategy_info["recommended_allocation"],
        "risk_profile": strategy_info["risk_profile"],
        "rebalancing_advice": strategy_info["rebalancing_advice"],
        "disclaimer": "Projection based on historical asset class risk-return profiles, not guaranteed return.",
    }
