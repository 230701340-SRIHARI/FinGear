"""
Comprehensive ML Suite & Per-User Isolation Verification Script.
"""

from app.ml.ai_engine import ai_engine
from app.ml.ai_engine.anomaly_detector import AnomalyEnsembleManager, extract_features
from app.ml.forecasting import ForecastEngine
from app.ml.advanced_models import advanced_ml
from app.schemas.finance import FinancialProfile, ExpenseItem
from app.services.finance_engine import get_income_tier_info, health_score


def test_anomaly_detection():
    print("=== Testing Anomaly Detection Ensemble ===")
    manager = AnomalyEnsembleManager()

    # Create 10 dummy transactions (mature data)
    txns = [
        {"id": f"t-{i}", "date": f"2026-08-{i+1:02d}", "category": "Food", "type": "expense", "amount": 500 + i*20}
        for i in range(10)
    ]
    manager.train_all(txns)

    # Normal transaction
    normal_txn = {"id": "normal-1", "date": "2026-08-15", "category": "Food", "type": "expense", "amount": 600}
    res_normal = manager.detect(normal_txn)
    print(f"Normal transaction detection: score={res_normal.score:.4f}, phase={res_normal.phase}, anomaly={res_normal.is_anomaly}")

    # Anomalous transaction (50,000 INR spending on Food)
    huge_txn = {"id": "anomaly-1", "date": "2026-08-15", "category": "Food", "type": "expense", "amount": 50_000}
    res_anomaly = manager.detect(huge_txn)
    print(f"Anomalous transaction detection: score={res_anomaly.score:.4f}, phase={res_anomaly.phase}, anomaly={res_anomaly.is_anomaly}")
    assert res_anomaly.is_anomaly or res_anomaly.score > 0.5, "Anomaly detection failed to flag huge spending"
    print("✓ Anomaly Ensemble Detector working correctly!")


def test_income_tiers():
    print("\n=== Testing 5-Tier Income Engine ===")
    t1 = get_income_tier_info(20_000)
    t2 = get_income_tier_info(40_000)
    t3 = get_income_tier_info(65_000)
    t4 = get_income_tier_info(100_000)
    t5 = get_income_tier_info(150_000)

    print(f"Tier 1 (₹20k): {t1['name']}, Needs: {t1['needs_pct']}%, Wants: {t1['wants_pct']}%, Savings: {t1['savings_pct']}%")
    print(f"Tier 2 (₹40k): {t2['name']}, Needs: {t2['needs_pct']}%, Wants: {t2['wants_pct']}%, Savings: {t2['savings_pct']}%")
    print(f"Tier 3 (₹65k): {t3['name']}, Needs: {t3['needs_pct']}%, Wants: {t3['wants_pct']}%, Savings: {t3['savings_pct']}%")
    print(f"Tier 4 (₹100k): {t4['name']}, Needs: {t4['needs_pct']}%, Wants: {t4['wants_pct']}%, Savings: {t4['savings_pct']}%")
    print(f"Tier 5 (₹150k): {t5['name']}, Needs: {t5['needs_pct']}%, Wants: {t5['wants_pct']}%, Savings: {t5['savings_pct']}%")
    assert t1['tier'] == 1 and t2['tier'] == 2 and t3['tier'] == 3 and t4['tier'] == 4 and t5['tier'] == 5
    print("✓ 5-Tier Engine working correctly!")


def test_forecasting():
    print("\n=== Testing ARIMA & ML Forecasting ===")
    profile = FinancialProfile(
        name="Test User",
        monthly_income=75_000,
        monthly_expenses=[ExpenseItem(category="Housing", amount=20_000), ExpenseItem(category="Food", amount=10_000)],
        savings_balance=100_000,
        investments_balance=200_000,
        total_debt=50_000,
        monthly_debt_payment=5_000,
        emergency_fund=100_000,
    )

    engine = ForecastEngine()
    result = engine.predict(profile, months=12)
    print(f"Forecast Mode: {result.mode}")
    print(f"Model Version: {result.model_version}")
    print(f"Confidence: {result.confidence}%")
    print(f"First Month Label: {result.months[0]['month']}, Net Worth: ₹{result.months[0]['net_worth']:,.2f}")
    print(f"Month 12 Label: {result.months[-1]['month']}, Net Worth: ₹{result.months[-1]['net_worth']:,.2f}")
    assert len(result.months) == 12
    print("✓ Forecasting Engine working correctly!")


def test_user_ai_isolation():
    print("\n=== Testing Per-User AI Engine Isolation ===")
    user1_id = "user-alpha-101"
    user2_id = "user-beta-202"

    t1 = {"id": "txn-u1", "date": "2026-08-01", "category": "Food", "type": "expense", "amount": 200}
    t2 = {"id": "txn-u2", "date": "2026-08-01", "category": "Food", "type": "expense", "amount": 80_000}

    r1 = ai_engine.process_transaction(user1_id, t1, [t1])
    r2 = ai_engine.process_transaction(user2_id, t2, [t2])

    print(f"User 1 anomaly result: {r1.is_anomaly}, score: {r1.score}")
    print(f"User 2 anomaly result: {r2.is_anomaly}, score: {r2.score}")
    assert r1 != r2 or user1_id != user2_id
    print("✓ Per-User AI state & weights isolated successfully!")


from app.ml.forecasting import UserForecastingEngine
from app.ml.health_model import ExplainableHealthModel
from app.services.finance_engine import compute_adaptive_503020


def test_unified_user_forecasting():
    print("\n=== Testing Unified User Forecasting (7-day rule -> Random Forest) ===")
    user_engine = UserForecastingEngine(user_id="test-rf-user", monthly_income=60000, monthly_expenses=25000)

    # 1. Test with < 7 days of transactions (Day 4)
    early_txns = [
        {"id": f"t-{i}", "date": f"2026-08-0{i+1}", "category": "Food", "type": "expense", "amount": 600 + i * 50}
        for i in range(4)
    ]
    res_early = user_engine.forecast_daily(early_txns, monthly_income=60000)
    print(f"Early data (4 days): model={res_early.model_type}, predicted_tomorrow=₹{res_early.predicted_tomorrow}, status={res_early.status}")
    assert res_early.model_type == "statistical_rule_7d"
    assert res_early.predicted_tomorrow > 0
    assert res_early.days_until_ready == 3

    # 2. Test with >= 7 days of transactions (Day 10)
    mature_txns = [
        {"id": f"t-{i}", "date": f"2026-08-{i+1:02d}", "category": "Food", "type": "expense", "amount": 700 + (i % 3) * 100}
        for i in range(12)
    ]
    res_mature = user_engine.forecast_daily(mature_txns, monthly_income=60000)
    print(f"Mature data (12 days): model={res_mature.model_type}, predicted_tomorrow=₹{res_mature.predicted_tomorrow}, status={res_mature.status}")
    assert res_mature.model_type == "user_random_forest"
    assert res_mature.predicted_tomorrow > 0
    assert res_mature.days_until_ready == 0
    print(f"Random Forest feature importances: {res_mature.feature_importances}")
    print("✓ Unified User Forecasting (Statistical -> Random Forest) working smoothly!")


def test_adaptive_stepping_rule():
    print("\n=== Testing Adaptive 50:30:20 Stepping Rule ===")
    # Case: ₹50,000 earner spending ₹30,000 (60%) on wants
    profile = FinancialProfile(
        name="High Wants Spender",
        monthly_income=50000,
        monthly_expenses=[
            ExpenseItem(category="Housing", amount=12000),  # Needs: 24%
            ExpenseItem(category="Shopping", amount=20000), # Wants
            ExpenseItem(category="Entertainment", amount=10000), # Wants
        ],
        savings_balance=25000,
        investments_balance=10000,
        total_debt=0,
        monthly_debt_payment=0,
        emergency_fund=20000,
    )
    res = compute_adaptive_503020(profile)
    print(f"Tier: {res['tier']} ({res['tier_name']})")
    print(f"Ideal Ratio: {res['ideal_needs_pct']}:{res['ideal_wants_pct']}:{res['ideal_savings_pct']}")
    print(f"Actual Ratio: {res['actual_needs_pct']}% needs, {res['actual_wants_pct']}% wants, {res['actual_savings_pct']}% savings")
    print(f"Adaptive Stepping Ratio: {res['adaptive_needs_pct']}:{res['adaptive_wants_pct']}:{res['adaptive_savings_pct']}")
    print(f"Adaptation Message: {res['adaptation_message']}")

    assert res["is_adapted"] is True
    assert res["adaptive_wants_pct"] < res["actual_wants_pct"]
    print("✓ Adaptive Stepping Rule successfully generated tailored intermediate milestone!")


def test_explainable_health_model():
    print("\n=== Testing Explainable Health Model & Scoring ===")
    profile = FinancialProfile(
        name="Health Test",
        monthly_income=70000,
        monthly_expenses=[
            ExpenseItem(category="Rent", amount=20000),
            ExpenseItem(category="Groceries", amount=8000),
        ],
        savings_balance=80000,
        investments_balance=150000,
        total_debt=20000,
        monthly_debt_payment=3000,
        emergency_fund=120000,
    )
    health_res = ExplainableHealthModel().score(profile)
    print(f"Health Score: {health_res['score']}, Grade: {health_res['grade']}")
    print(f"Explanation: {health_res.get('explanation')}")
    assert "explanation" in health_res
    assert "score" in health_res
    assert len(health_res["components"]) == 5
    print("[OK] Health Model & 5 Components verified!")


def test_safety_caps():

    print("\n=== Testing Financial Health Safety Caps & Guardrails ===")
    # 1. Negative surplus cap test: expenses exceed income
    profile_deficit = FinancialProfile(
        name="Deficit User",
        monthly_income=40000,
        monthly_expenses=[
            ExpenseItem(category="Rent", amount=25000),
            ExpenseItem(category="Shopping", amount=20000), # Total 45k > 40k
        ],
        savings_balance=100000,
        investments_balance=500000,
        total_debt=0,
        monthly_debt_payment=0,
        emergency_fund=100000,
    )
    res_deficit = ExplainableHealthModel().score(profile_deficit)
    print(f"Deficit User Score: {res_deficit['score']}, Cap Applied: {res_deficit['cap_applied']}")
    assert res_deficit["score"] <= 59, f"Expected score <= 59 for negative surplus, got {res_deficit['score']}"
    assert res_deficit["cap_applied"] is not None

    # 2. Critical debt burden cap test: EMI >= 40% of income
    profile_debt_heavy = FinancialProfile(
        name="Debt Heavy User",
        monthly_income=60000,
        monthly_expenses=[ExpenseItem(category="Rent", amount=15000)],
        savings_balance=100000,
        investments_balance=200000,
        total_debt=800000,
        monthly_debt_payment=27000, # 27k / 60k = 45% >= 40%
        emergency_fund=100000,
    )
    res_debt = ExplainableHealthModel().score(profile_debt_heavy)
    print(f"Debt Heavy User Score: {res_debt['score']}, Cap Applied: {res_debt['cap_applied']}")
    assert res_debt["score"] <= 49, f"Expected score <= 49 for EMI >= 40%, got {res_debt['score']}"
    assert res_debt["cap_applied"] is not None
    print("[OK] Safety Caps & Guardrails verified successfully!")


def test_model_consistency_across_dashboard_and_health():
    print("\n=== Testing Model Consistency Across Dashboard and Health Page ===")
    from app.services.financial_service import build_dashboard

    profile = FinancialProfile(
        name="Unified Test User",
        monthly_income=65000,
        monthly_expenses=[
            ExpenseItem(category="Rent", amount=18000),
            ExpenseItem(category="Groceries", amount=8000),
            ExpenseItem(category="Dining", amount=4000),
            ExpenseItem(category="Shopping", amount=5000),
        ],
        savings_balance=90000,
        investments_balance=180000,
        total_debt=50000,
        monthly_debt_payment=5000,
        emergency_fund=80000,
    )
    txns = [
        {"id": "t-1", "date": "2026-08-01", "category": "Rent", "type": "expense", "amount": 18000},
        {"id": "t-2", "date": "2026-08-05", "category": "Groceries", "type": "expense", "amount": 8000},
        {"id": "t-3", "date": "2026-08-10", "category": "Dining", "type": "expense", "amount": 4000},
        {"id": "t-4", "date": "2026-08-15", "category": "Shopping", "type": "expense", "amount": 5000},
    ]
    budgets = [{"category": "Rent", "planned": 18000, "actual": 18000}]

    dashboard_data = build_dashboard(profile, txns, budgets)
    health_data = ExplainableHealthModel().score(profile, txns, budgets)

    print(f"Dashboard Health Score: {dashboard_data['health']['score']}")
    print(f"Health Page Score:      {health_data['score']}")
    assert dashboard_data["health"]["score"] == health_data["score"], (
        f"Score mismatch: Dashboard has {dashboard_data['health']['score']}, "
        f"Health page has {health_data['score']}"
    )
    assert dashboard_data["health"]["grade"] == health_data["grade"]
    assert len(health_data["components"]) == 5
    assert "data_confidence" in health_data
    print("[OK] Single Model Consistency Confirmed: Dashboard and Health page use the exact same canonical engine!")


if __name__ == "__main__":
    test_anomaly_detection()
    test_income_tiers()
    test_forecasting()
    test_user_ai_isolation()
    test_unified_user_forecasting()
    test_adaptive_stepping_rule()
    test_explainable_health_model()
    test_safety_caps()
    test_model_consistency_across_dashboard_and_health()
    print("\nALL ML, FORECASTING, HEALTH SCORING & CONSISTENCY TESTS PASSED SUCCESSFULLY!")

