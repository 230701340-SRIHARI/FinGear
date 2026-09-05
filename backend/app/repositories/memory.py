from __future__ import annotations

from copy import deepcopy
from datetime import date
import secrets
from uuid import uuid4

from app.core.security import hash_password

SEEDED_USER_ID = "seed-user"


def _seed_profile() -> dict:
    return {
        "name": "Student Profile",
        "email": "student@fingear.ai",
        "age": 22,
        "occupation": "Engineering Student",
        "currency": "INR",
        "financial_experience": "Beginner",
        "monthly_income": 75_000,
        "other_income": 0,
        "monthly_expenses": [
            {"category": "Rent", "amount": 18_000},
            {"category": "Food", "amount": 9_000},
            {"category": "Transport", "amount": 4_500},
            {"category": "Lifestyle", "amount": 7_000},
            {"category": "Utilities", "amount": 3_500},
        ],
        "savings_balance": 180_000,
        "investments_balance": 240_000,
        "mutual_funds": 120_000,
        "stocks": 70_000,
        "fixed_deposits": 30_000,
        "gold": 20_000,
        "total_debt": 120_000,
        "monthly_debt_payment": 5_000,
        "emergency_fund": 150_000,
        "goals": [
            {
                "name": "Car down payment",
                "goal_type": "Vehicle",
                "target_amount": 1_000_000,
                "current_amount": 320_000,
                "monthly_contribution": 12_000,
                "target_months": 48,
                "target_date": "2030-08-20",
            },
            {
                "name": "Higher education fund",
                "goal_type": "Education",
                "target_amount": 1_500_000,
                "current_amount": 150_000,
                "monthly_contribution": 15_000,
                "target_months": 60,
                "target_date": "2031-08-20",
            },
        ],
    }


def _seed_state() -> dict:
    return {
        "profile": _seed_profile(),
        "transactions": [
            {"id": "txn-1", "date": "2026-08-01", "description": "Salary", "category": "Income", "type": "income", "amount": 75_000},
            {"id": "txn-2", "date": "2026-08-03", "description": "Rent payment", "category": "Housing", "type": "expense", "amount": 18_000},
            {"id": "txn-3", "date": "2026-08-05", "description": "Groceries and food", "category": "Food", "type": "expense", "amount": 9_000},
            {"id": "txn-4", "date": "2026-08-08", "description": "SIP contribution", "category": "Investment", "type": "expense", "amount": 8_000},
            {"id": "txn-5", "date": "2026-08-12", "description": "Loan EMI", "category": "Debt", "type": "expense", "amount": 5_000},
            {"id": "txn-6", "date": "2026-08-16", "description": "Utilities", "category": "Utilities", "type": "expense", "amount": 3_500},
        ],
        "budgets": [
            {"category": "Rent", "planned": 18_000, "actual": 18_000},
            {"category": "Food", "planned": 7_000, "actual": 9_000},
            {"category": "Transport", "planned": 5_000, "actual": 4_500},
            {"category": "Lifestyle", "planned": 4_000, "actual": 7_000},
            {"category": "Utilities", "planned": 4_000, "actual": 3_500},
        ],
        "investments": [
            {"name": "Large cap mutual fund", "asset_class": "Equity", "value": 120_000, "monthly_contribution": 5_000, "expected_return": 10},
            {"name": "Index ETF", "asset_class": "Equity", "value": 70_000, "monthly_contribution": 2_000, "expected_return": 9},
            {"name": "Fixed deposit", "asset_class": "Debt", "value": 30_000, "monthly_contribution": 0, "expected_return": 6},
            {"name": "Gold savings", "asset_class": "Gold", "value": 20_000, "monthly_contribution": 1_000, "expected_return": 7},
        ],
        "debts": [
            {"name": "Education loan", "principal": 200_000, "outstanding": 120_000, "interest_rate": 10.5, "emi": 5_000, "remaining_months": 28}
        ],
        "simulation_history": [
            {
                "id": "sim-1",
                "date": "2026-08-20",
                "name": "Increase SIP ₹5,000",
                "result": "Goal accelerated by 11 months",
                "score": "81 -> 83",
            }
        ],
        "copilot_conversations": [],
        "notifications": [
            {"severity": "warning", "title": "Emergency fund below ideal target", "detail": "Current runway is around 3.2 months; target is 6 months."},
            {"severity": "risk", "title": "Food budget exceeded", "detail": "Food spending is ₹2,000 above the planned monthly budget."},
            {"severity": "success", "title": "Debt burden remains low", "detail": "EMI uses only 7% of monthly income."},
        ],
        "events": [
            {"period": "AUG 2026", "title": "Salary credited", "value": "+₹75K", "type": "Income"},
            {"period": "AUG 2026", "title": "Investment contribution", "value": "₹8K", "type": "Investment"},
            {"period": "JUL 2026", "title": "Loan payment", "value": "₹5K", "type": "Debt"},
            {"period": "JUN 2026", "title": "Emergency fund increased", "value": "₹20K", "type": "Savings"},
        ],
    }


DATABASE = {
    "users": {
        SEEDED_USER_ID: {
            "id": SEEDED_USER_ID,
            "name": "Student Profile",
            "email": "student@fingear.ai",
            "password_hash": hash_password("student123"),
            "created_at": str(date.today()),
            "state": _seed_state(),
        }
    }
}


def public_user(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "email": user["email"], "is_seeded": user["id"] == SEEDED_USER_ID}


def find_user_by_email(email: str) -> dict | None:
    email = email.lower()
    return next((user for user in DATABASE["users"].values() if user["email"].lower() == email), None)


def create_user(name: str, email: str, password: str) -> dict:
    user_id = str(uuid4())
    state = _seed_state()
    state["profile"]["name"] = name
    state["profile"]["email"] = email
    DATABASE["users"][user_id] = {
        "id": user_id,
        "name": name,
        "email": email.lower(),
        "password_hash": hash_password(password),
        "created_at": str(date.today()),
        "state": state,
    }
    return DATABASE["users"][user_id]


def find_or_create_oauth_user(name: str, email: str) -> dict:
    existing = find_user_by_email(email)
    if existing:
        return existing
    return create_user(name=name, email=email, password=secrets.token_urlsafe(24))


def get_user(user_id: str) -> dict:
    return DATABASE["users"][user_id]


def get_state(user_id: str) -> dict:
    return DATABASE["users"][user_id]["state"]


def state_copy(user_id: str) -> dict:
    return deepcopy(get_state(user_id))


def update_profile(user_id: str, profile: dict) -> dict:
    get_state(user_id)["profile"] = profile
    return deepcopy(profile)


def add_transaction(user_id: str, transaction: dict) -> dict:
    transaction = {**transaction, "id": transaction.get("id") or str(uuid4())}
    get_state(user_id)["transactions"].insert(0, transaction)
    return deepcopy(transaction)


def add_goal(user_id: str, goal: dict) -> dict:
    get_state(user_id)["profile"]["goals"].append(goal)
    return deepcopy(goal)


def delete_goal(user_id: str, goal_name: str) -> None:
    goals = get_state(user_id)["profile"]["goals"]
    get_state(user_id)["profile"]["goals"] = [g for g in goals if g["name"] != goal_name]


def delete_transaction(user_id: str, transaction_id: str) -> None:
    txns = get_state(user_id)["transactions"]
    get_state(user_id)["transactions"] = [t for t in txns if str(t.get("id")) != str(transaction_id)]


def delete_simulation(user_id: str, sim_id: str) -> None:
    history = get_state(user_id)["simulation_history"]
    get_state(user_id)["simulation_history"] = [h for h in history if str(h.get("id")) != str(sim_id)]


def add_simulation(user_id: str, simulation: dict) -> dict:
    history_item = {
        "id": str(uuid4()),
        "date": str(date.today()),
        "name": simulation["scenario"]["name"],
        "result": simulation["recommendation"],
        "score": f"{simulation['base_score']} -> {simulation['simulated_score']}",
    }
    get_state(user_id)["simulation_history"].insert(0, history_item)
    return deepcopy(history_item)


def add_conversation(user_id: str, question: str, answer: str) -> dict:
    item = {"id": str(uuid4()), "date": str(date.today()), "question": question, "answer": answer}
    get_state(user_id)["copilot_conversations"].insert(0, item)
    return deepcopy(item)


def acknowledge_transaction(user_id: str, transaction_id: str) -> None:
    """Mark a transaction as acknowledged (human-in-the-loop anomaly feedback)."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            txn["acknowledged"] = True
            txn.pop("anomaly_flag", None)
            txn.pop("anomaly_score", None)
            break


def flag_transaction_anomaly(user_id: str, transaction_id: str, score: float) -> None:
    """Attach anomaly flag and score to a transaction."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            txn["anomaly_flag"] = True
            txn["anomaly_score"] = score
            break


def get_transactions_by_category(user_id: str, categories: list[str]) -> list[dict]:
    """Get transactions filtered by a list of category names."""
    txns = get_state(user_id)["transactions"]
    return [deepcopy(t) for t in txns if t.get("category") in categories]

