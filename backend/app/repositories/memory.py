from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timedelta
import secrets
from uuid import uuid4

from app.core.security import hash_password

DATABASE = {
    "users": {}
}


def public_user(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "email": user["email"], "is_seeded": False}


def find_user_by_email(email: str) -> dict | None:
    email = email.lower()
    return next((user for user in DATABASE["users"].values() if user["email"].lower() == email), None)


def _empty_state(name: str = "New User", email: str = "") -> dict:
    return {
        "profile": {
            "name": name,
            "email": email,
            "age": 25,
            "occupation": "",
            "currency": "INR",
            "financial_experience": "Beginner",
            "income_type": "Salaried",
            "dependents": 0,
            "salary_day": 1,
            "credit_score": 750,
            "risk_appetite": "Moderate",
            "lifestyle_preference": "Balanced",
            "primary_financial_goal": "Wealth Creation",
            "monthly_income_tier": 3,
            "monthly_income": 0,
            "other_income": 0,
            "monthly_expenses": [],
            "detailed_expenses": [],
            "savings_balance": 0,
            "investments_balance": 0,
            "mutual_funds": 0,
            "stocks": 0,
            "fixed_deposits": 0,
            "gold": 0,
            "provident_fund": 0,
            "real_estate_value": 0,
            "crypto_value": 0,
            "total_debt": 0,
            "monthly_debt_payment": 0,
            "emergency_fund": 0,
            "emergency_target": 0,
            "adaptive_needs_ratio": 50.0,
            "adaptive_wants_ratio": 30.0,
            "adaptive_savings_ratio": 20.0,
            "target_needs_ratio": 50.0,
            "target_wants_ratio": 30.0,
            "target_savings_ratio": 20.0,
            "goals": [],
        },
        "transactions": [],
        "deleted_transactions": [],
        "budgets": [],
        "investments": [],
        "debts": [],
        "simulation_history": [],
        "copilot_conversations": [],
        "notifications": [
            {"severity": "info", "title": "Welcome to FinGear AI Twin", "detail": "Log your income and expenses to build your personalized Financial Digital Twin."}
        ],
        "events": [],
        "recurring_transactions": [
            {
                "id": str(uuid4()),
                "name": "Apartment House Rent",
                "amount": 16000.0,
                "category": "Rent",
                "type": "expense",
                "day_of_month": 1,
                "is_active": True,
                "last_processed_date": None,
            },
            {
                "id": str(uuid4()),
                "name": "High-Speed WiFi Broadband",
                "amount": 999.0,
                "category": "Utilities",
                "type": "expense",
                "day_of_month": 5,
                "is_active": True,
                "last_processed_date": None,
            },
            {
                "id": str(uuid4()),
                "name": "Nifty 50 Index Fund SIP",
                "amount": 5000.0,
                "category": "Mutual Funds",
                "type": "savings",
                "day_of_month": 1,
                "is_active": True,
                "last_processed_date": None,
            },
        ],
    }


def create_user(name: str, email: str, password: str) -> dict:
    user_id = str(uuid4())
    state = _empty_state(name=name, email=email)
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


def _apply_asset_impact(profile: dict, transaction: dict, reverse: bool = False):
    """Reflect asset contributions (Emergency Fund, FD, Mutual Funds, Stocks, Gold, PPF, Extra Debt) directly in profile balances."""
    multiplier = -1.0 if reverse else 1.0
    cat = (transaction.get("category") or "").strip()
    amount = float(transaction.get("amount") or 0.0) * multiplier

    if cat == "Emergency Fund":
        profile["emergency_fund"] = max(0.0, round(float(profile.get("emergency_fund", 0.0)) + amount, 2))
        profile["savings_balance"] = max(0.0, round(float(profile.get("savings_balance", 0.0)) + amount, 2))
    elif cat in ("Fixed Deposit", "FD"):
        profile["fixed_deposits"] = max(0.0, round(float(profile.get("fixed_deposits", 0.0)) + amount, 2))
        profile["savings_balance"] = max(0.0, round(float(profile.get("savings_balance", 0.0)) + amount, 2))
    elif cat in ("Mutual Funds", "SIP"):
        profile["mutual_funds"] = max(0.0, round(float(profile.get("mutual_funds", 0.0)) + amount, 2))
        profile["investments_balance"] = max(0.0, round(float(profile.get("investments_balance", 0.0)) + amount, 2))
    elif cat in ("Stocks", "Equity"):
        profile["stocks"] = max(0.0, round(float(profile.get("stocks", 0.0)) + amount, 2))
        profile["investments_balance"] = max(0.0, round(float(profile.get("investments_balance", 0.0)) + amount, 2))
    elif cat == "Gold":
        profile["gold"] = max(0.0, round(float(profile.get("gold", 0.0)) + amount, 2))
        profile["investments_balance"] = max(0.0, round(float(profile.get("investments_balance", 0.0)) + amount, 2))
    elif cat in ("Provident Fund", "PPF", "EPF"):
        profile["provident_fund"] = max(0.0, round(float(profile.get("provident_fund", 0.0)) + amount, 2))
        profile["investments_balance"] = max(0.0, round(float(profile.get("investments_balance", 0.0)) + amount, 2))
    elif cat in ("Extra Loan Repayment", "Extra Debt Prepayment"):
        profile["total_debt"] = max(0.0, round(float(profile.get("total_debt", 0.0)) - amount, 2))
    elif cat == "Savings":
        profile["savings_balance"] = max(0.0, round(float(profile.get("savings_balance", 0.0)) + amount, 2))
        profile["emergency_fund"] = max(0.0, round(float(profile.get("emergency_fund", 0.0)) + amount, 2))


def _sync_to_postgres(user_id: str, txn: dict | None = None, profile: dict | None = None, deleted_txn_id: str | None = None):
    """Sync state to PostgreSQL database if SessionLocal is active."""
    from app.database.postgres import SessionLocal
    if not SessionLocal:
        return
    try:
        db = SessionLocal()
        from app.database.models import User, FinancialProfile, Transaction
        # Ensure user exists in postgres
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            u_info = DATABASE["users"].get(user_id, {})
            u_name = u_info.get("name", "FinGear User")
            u_email = u_info.get("email", f"user_{user_id[:8]}@example.com")
            u_pass = u_info.get("password_hash", "hash_placeholder")
            db_user = User(id=user_id, name=u_name, email=u_email, password_hash=u_pass)
            db.add(db_user)
            db.commit()

        if profile:
            db_prof = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
            if not db_prof:
                db_prof = FinancialProfile(user_id=user_id, name=db_user.name, email=db_user.email)
                db.add(db_prof)
                db.commit()
            fields = ["emergency_fund", "savings_balance", "investments_balance", "mutual_funds", "stocks", "fixed_deposits", "gold", "provident_fund", "total_debt"]
            for f in fields:
                if f in profile:
                    setattr(db_prof, f, profile[f])
            db.commit()

        if txn:
            from datetime import date as dt_date
            d_str = txn.get("date") or str(dt_date.today())
            try:
                parsed_date = dt_date.fromisoformat(d_str) if isinstance(d_str, str) else d_str
            except Exception:
                parsed_date = dt_date.today()
            db_txn = db.query(Transaction).filter(Transaction.id == txn.get("id")).first()
            if not db_txn:
                db_txn = Transaction(
                    id=txn.get("id"),
                    user_id=user_id,
                    transaction_date=parsed_date,
                    description=txn.get("description", ""),
                    category=txn.get("category", ""),
                    type=txn.get("type", "expense"),
                    amount=float(txn.get("amount", 0.0)),
                )
                db.add(db_txn)
                db.commit()

        if deleted_txn_id:
            db_txn = db.query(Transaction).filter(Transaction.id == deleted_txn_id).first()
            if db_txn:
                db_txn.deleted_at = datetime.now()
                db.commit()
        db.close()
    except Exception as e:
        print(f"[DB Sync] Note: {e}")


def add_transaction(user_id: str, transaction: dict) -> dict:
    transaction = {**transaction, "id": transaction.get("id") or str(uuid4())}
    state = get_state(user_id)
    state["transactions"].insert(0, transaction)
    # Apply impact to profile assets/liabilities
    _apply_asset_impact(state["profile"], transaction, reverse=False)
    # Sync with postgres
    _sync_to_postgres(user_id, txn=transaction, profile=state["profile"])
    return deepcopy(transaction)


def add_goal(user_id: str, goal: dict) -> dict:
    get_state(user_id)["profile"]["goals"].append(goal)
    return deepcopy(goal)


def update_goal(user_id: str, goal_name: str, goal: dict) -> dict:
    goals = get_state(user_id)["profile"]["goals"]
    for i, g in enumerate(goals):
        if g["name"] == goal_name:
            goals[i] = goal
            return deepcopy(goal)
    raise ValueError(f"Goal {goal_name} not found")


def delete_goal(user_id: str, goal_name: str) -> None:
    goals = get_state(user_id)["profile"]["goals"]
    get_state(user_id)["profile"]["goals"] = [g for g in goals if g["name"] != goal_name]


def delete_transaction(user_id: str, transaction_id: str) -> None:
    state = get_state(user_id)
    txns = state["transactions"]
    deleted = state.setdefault("deleted_transactions", [])
    
    for i, t in enumerate(txns):
        if str(t.get("id")) == str(transaction_id):
            txn = txns.pop(i)
            txn["deleted_at"] = datetime.now().isoformat()
            deleted.insert(0, txn)
            # Reversibly roll back asset impact
            _apply_asset_impact(state["profile"], txn, reverse=True)
            _sync_to_postgres(user_id, profile=state["profile"], deleted_txn_id=transaction_id)
            break

def restore_transaction(user_id: str, transaction_id: str) -> None:
    state = get_state(user_id)
    deleted = state.setdefault("deleted_transactions", [])
    txns = state["transactions"]
    
    for i, t in enumerate(deleted):
        if str(t.get("id")) == str(transaction_id):
            txn = deleted.pop(i)
            txn.pop("deleted_at", None)
            txns.insert(0, txn)
            # Re-sort by date descending to maintain order
            txns.sort(key=lambda x: x.get("date", ""), reverse=True)
            # Re-apply asset impact
            _apply_asset_impact(state["profile"], txn, reverse=False)
            _sync_to_postgres(user_id, txn=txn, profile=state["profile"])
            break


def delete_simulation(user_id: str, sim_id: str) -> None:
    history = get_state(user_id)["simulation_history"]
    get_state(user_id)["simulation_history"] = [h for h in history if str(h.get("id")) != str(sim_id)]


def update_budgets(user_id: str, budgets: list[dict]) -> list[dict]:
    get_state(user_id)["budgets"] = deepcopy(budgets)
    return deepcopy(budgets)


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


def get_deleted_transactions_60days(user_id: str) -> list[dict]:
    """Return soft-deleted transactions from the last 60 days."""
    deleted = get_state(user_id).get("deleted_transactions", [])
    cutoff = datetime.now() - timedelta(days=60)
    valid_deleted = []
    for t in deleted:
        deleted_at_str = t.get("deleted_at")
        if deleted_at_str:
            try:
                dt = datetime.fromisoformat(deleted_at_str)
                if dt >= cutoff:
                    valid_deleted.append(deepcopy(t))
            except Exception:
                valid_deleted.append(deepcopy(t))
        else:
            valid_deleted.append(deepcopy(t))
    return valid_deleted


def exclude_transaction_from_training(user_id: str, transaction_id: str) -> None:
    """Exclude a transaction from model training feedback."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            txn["model_training_excluded"] = True
            txn.pop("anomaly_flag", None)
            txn.pop("anomaly_score", None)
            break


def attach_bill_to_transaction(user_id: str, transaction_id: str, bill_info: dict) -> dict:
    """Attach bill metadata to a transaction."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            txn["bill"] = bill_info
            return deepcopy(bill_info)
    raise ValueError("Transaction not found")


def get_transaction_bill(user_id: str, transaction_id: str) -> dict | None:
    """Retrieve bill attached to a transaction."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            return deepcopy(txn.get("bill"))
    return None


def delete_transaction_bill(user_id: str, transaction_id: str) -> bool:
    """Remove bill attached to a transaction."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            if "bill" in txn:
                del txn["bill"]
                return True
            return False
    return False


def update_monthly_income_suite(user_id: str, amount: float, apply_to_all_months: bool = True, transaction_id: str | None = None) -> dict:
    """Update base monthly income or record monthly income adjustment."""
    state = get_state(user_id)
    profile = state["profile"]
    current_month = datetime.now().strftime("%Y-%m")

    history = profile.setdefault("monthly_income_history", {"default": profile.get("monthly_income", 50000)})

    if apply_to_all_months and amount > 0:
        profile["monthly_income"] = float(amount)
        history["default"] = float(amount)
    else:
        # Add to current month effective income
        current_effective = history.get(current_month, profile.get("monthly_income", 50000))
        history[current_month] = float(current_effective + amount)

    adjustments = state.setdefault("income_adjustments", [])
    adjustments.append({
        "id": str(uuid4()),
        "user_id": user_id,
        "transaction_id": transaction_id,
        "amount": amount,
        "scope": "all_months" if apply_to_all_months else "present_month",
        "effective_month": current_month,
        "created_at": datetime.now().isoformat()
    })

    return deepcopy(profile)


def get_recurring_transactions(user_id: str) -> list[dict]:
    """Retrieve all recurring transactions configured by the user."""
    state = get_state(user_id)
    return deepcopy(state.get("recurring_transactions", []))


def add_recurring_transaction(user_id: str, item: dict) -> dict:
    """Add a new recurring transaction."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    new_item = {
        "id": item.get("id") or str(uuid4()),
        "name": item.get("name") or "Recurring Item",
        "amount": float(item.get("amount", 0.0)),
        "category": item.get("category") or "Rent",
        "type": item.get("type") or "expense",
        "day_of_month": int(item.get("day_of_month") or 1),
        "is_active": bool(item.get("is_active", True)),
        "last_processed_date": item.get("last_processed_date"),
        "created_at": datetime.now().isoformat(),
    }
    recurring.insert(0, new_item)
    return deepcopy(new_item)


def update_recurring_transaction(user_id: str, item_id: str, item: dict) -> dict:
    """Update an existing recurring transaction."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    for idx, r in enumerate(recurring):
        if str(r.get("id")) == str(item_id):
            updated = {**r, **item}
            recurring[idx] = updated
            return deepcopy(updated)
    raise ValueError(f"Recurring transaction {item_id} not found")


def delete_recurring_transaction(user_id: str, item_id: str) -> None:
    """Delete a recurring transaction."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    state["recurring_transactions"] = [r for r in recurring if str(r.get("id")) != str(item_id)]


def process_recurring_transactions(user_id: str) -> list[dict]:
    """Check active recurring transactions and auto-inject into ledger for current month if due."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    current_month = datetime.now().strftime("%Y-%m")
    today_day = datetime.now().day
    created_txns = []

    for r in recurring:
        if not r.get("is_active", True):
            continue
        # If not processed for current month yet
        if r.get("last_processed_date") != current_month:
            due_day = min(r.get("day_of_month", 1), 28)
            txn_date = f"{current_month}-{due_day:02d}"
            auto_txn = {
                "id": str(uuid4()),
                "date": txn_date,
                "description": f"{r.get('name')} (Auto-Recurring)",
                "category": r.get("category", "Rent"),
                "type": r.get("type", "expense"),
                "amount": float(r.get("amount", 0.0)),
                "is_recurring": True,
                "recurring_id": r.get("id"),
            }
            add_transaction(user_id, auto_txn)
            r["last_processed_date"] = current_month
            r["last_processed_at"] = datetime.now().isoformat()
            created_txns.append(auto_txn)

    return created_txns


