from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timedelta
import secrets
from uuid import uuid4

from sqlalchemy.sql import func

from app.core.security import hash_password
from app.database.postgres import SessionLocal
from app.database.models import (
    User,
    FinancialProfile,
    Transaction,
    RecurringTransaction,
    Goal,
    Budget,
    Simulation,
    CopilotConversation,
    Notification,
    IncomeAdjustment,
)

DATABASE = {
    "users": {}
}


def public_user(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "email": user["email"], "is_seeded": False}


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


def _load_user_state_from_db(user_id: str, db=None) -> dict | None:
    """Load full user record and all entities from PostgreSQL into memory cache."""
    close_db = False
    if db is None:
        if not SessionLocal:
            return None
        db = SessionLocal()
        close_db = True

    try:
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return None

        db_prof = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
        if not db_prof:
            db_prof = FinancialProfile(
                id=str(uuid4()),
                user_id=user_id,
                name=db_user.name,
                email=db_user.email,
                age=25,
                currency="INR",
                monthly_income=0.0,
                savings_balance=0.0,
                investments_balance=0.0,
                emergency_fund=0.0,
                emergency_target=0.0,
                total_debt=0.0,
                monthly_debt_payment=0.0,
            )
            db.add(db_prof)
            db.commit()
            db.refresh(db_prof)

        profile_dict = {
            "name": db_prof.name or db_user.name,
            "email": db_prof.email or db_user.email,
            "age": db_prof.age or 25,
            "occupation": db_prof.occupation or "",
            "currency": db_prof.currency or "INR",
            "financial_experience": db_prof.financial_experience or "Beginner",
            "income_type": db_prof.income_type or "Salaried",
            "dependents": db_prof.dependents or 0,
            "salary_day": db_prof.salary_day or 1,
            "credit_score": db_prof.credit_score or 750,
            "risk_appetite": db_prof.risk_appetite or "Moderate",
            "lifestyle_preference": db_prof.lifestyle_preference or "Balanced",
            "primary_financial_goal": db_prof.primary_financial_goal or "Wealth Creation",
            "monthly_income_tier": db_prof.monthly_income_tier or 3,
            "monthly_income": float(db_prof.monthly_income or 0.0),
            "other_income": float(db_prof.other_income or 0.0),
            "monthly_expenses": [],
            "detailed_expenses": db_prof.detailed_expenses or [],
            "savings_balance": float(db_prof.savings_balance or 0.0),
            "investments_balance": float(db_prof.investments_balance or 0.0),
            "mutual_funds": float(db_prof.mutual_funds or 0.0),
            "stocks": float(db_prof.stocks or 0.0),
            "fixed_deposits": float(db_prof.fixed_deposits or 0.0),
            "gold": float(db_prof.gold or 0.0),
            "provident_fund": float(db_prof.provident_fund or 0.0),
            "real_estate_value": float(db_prof.real_estate_value or 0.0),
            "crypto_value": float(db_prof.crypto_value or 0.0),
            "total_debt": float(db_prof.total_debt or 0.0),
            "monthly_debt_payment": float(db_prof.monthly_debt_payment or 0.0),
            "emergency_fund": float(db_prof.emergency_fund or 0.0),
            "emergency_target": float(db_prof.emergency_target or 0.0),
            "adaptive_needs_ratio": float(db_prof.adaptive_needs_ratio or 50.0),
            "adaptive_wants_ratio": float(db_prof.adaptive_wants_ratio or 30.0),
            "adaptive_savings_ratio": float(db_prof.adaptive_savings_ratio or 20.0),
            "target_needs_ratio": float(db_prof.target_needs_ratio or 50.0),
            "target_wants_ratio": float(db_prof.target_wants_ratio or 30.0),
            "target_savings_ratio": float(db_prof.target_savings_ratio or 20.0),
            "goals": [],
        }

        # Goals from DB
        db_goals = db.query(Goal).filter(Goal.user_id == user_id).all()
        goals_list = []
        today = date.today()
        for g in db_goals:
            target_str = str(g.target_date) if g.target_date else str(today + timedelta(days=365))
            m = 12
            if g.target_date:
                try:
                    t_d = g.target_date if isinstance(g.target_date, date) else date.fromisoformat(str(g.target_date)[:10])
                    months_count = (t_d.year - today.year) * 12 + t_d.month - today.month
                    if t_d.day > today.day:
                        months_count += 1
                    m = max(months_count, 1)
                except Exception:
                    pass
            goals_list.append({
                "id": g.id,
                "name": g.name,
                "goal_type": g.goal_type,
                "target_amount": float(g.target_amount),
                "current_amount": float(g.current_amount),
                "monthly_contribution": float(g.monthly_contribution or 0.0),
                "target_date": target_str,
                "target_months": m,
            })
        profile_dict["goals"] = goals_list

        # Active Transactions
        db_txns = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
            .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
            .all()
        )
        active_txns = []
        for t in db_txns:
            active_txns.append({
                "id": t.id,
                "date": str(t.transaction_date),
                "description": t.description,
                "category": t.category,
                "type": t.type,
                "amount": float(t.amount),
                "anomaly_flag": bool(t.anomaly_flag),
                "anomaly_score": float(t.anomaly_score or 0.0),
                "acknowledged": bool(t.anomaly_acknowledged),
                "model_training_excluded": bool(t.model_training_excluded),
            })

        # Deleted Transactions
        db_del_txns = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id, Transaction.deleted_at.isnot(None))
            .order_by(Transaction.deleted_at.desc())
            .all()
        )
        deleted_txns = []
        for t in db_del_txns:
            deleted_txns.append({
                "id": t.id,
                "date": str(t.transaction_date),
                "description": t.description,
                "category": t.category,
                "type": t.type,
                "amount": float(t.amount),
                "deleted_at": t.deleted_at.isoformat() if t.deleted_at else datetime.now().isoformat(),
            })

        # Recurring Transactions
        db_recurring = (
            db.query(RecurringTransaction)
            .filter(RecurringTransaction.user_id == user_id)
            .order_by(RecurringTransaction.created_at.desc())
            .all()
        )
        if not db_recurring:
            defaults = [
                {"name": "Apartment House Rent", "amount": 16000.0, "category": "Rent", "type": "expense", "day_of_month": 1},
                {"name": "High-Speed WiFi Broadband", "amount": 999.0, "category": "Utilities", "type": "expense", "day_of_month": 5},
                {"name": "Nifty 50 Index Fund SIP", "amount": 5000.0, "category": "Mutual Funds", "type": "savings", "day_of_month": 1},
            ]
            db_recurring = []
            for d in defaults:
                r_row = RecurringTransaction(
                    id=str(uuid4()),
                    user_id=user_id,
                    name=d["name"],
                    amount=d["amount"],
                    category=d["category"],
                    type=d["type"],
                    day_of_month=d["day_of_month"],
                    is_active=True,
                )
                db.add(r_row)
                db_recurring.append(r_row)
            db.commit()

        recurring_list = [
            {
                "id": r.id,
                "name": r.name,
                "amount": float(r.amount),
                "category": r.category,
                "type": r.type or "expense",
                "day_of_month": int(r.day_of_month or 1),
                "is_active": bool(r.is_active),
                "last_processed_date": r.last_processed_date,
            }
            for r in db_recurring
        ]

        # Budgets
        db_budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
        budgets_list = [
            {
                "id": b.id,
                "category": b.category,
                "planned": float(b.planned),
                "actual": float(b.actual or 0.0),
                "period_month": b.period_month,
            }
            for b in db_budgets
        ]

        # Simulations
        db_sims = db.query(Simulation).filter(Simulation.user_id == user_id).order_by(Simulation.created_at.desc()).all()
        sims_list = []
        for s in db_sims:
            s_name = (s.scenario or {}).get("name", "Simulation") if isinstance(s.scenario, dict) else "Simulation"
            sims_list.append({
                "id": s.id,
                "date": str(s.created_at.date() if s.created_at else date.today()),
                "name": s_name,
                "result": s.result if isinstance(s.result, (str, dict)) else str(s.result),
                "score": f"{(s.scenario or {}).get('base_score', 0)} -> {(s.scenario or {}).get('simulated_score', 0)}" if isinstance(s.scenario, dict) else "",
            })

        # Conversations
        db_convs = db.query(CopilotConversation).filter(CopilotConversation.user_id == user_id).order_by(CopilotConversation.created_at.desc()).all()
        convs_list = [
            {
                "id": c.id,
                "date": str(c.created_at.date() if c.created_at else date.today()),
                "question": c.question,
                "answer": c.answer,
            }
            for c in db_convs
        ]

        user_entry = {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email.lower(),
            "password_hash": db_user.password_hash,
            "created_at": str(db_user.created_at.date() if db_user.created_at else date.today()),
            "state": {
                "profile": profile_dict,
                "transactions": active_txns,
                "deleted_transactions": deleted_txns,
                "budgets": budgets_list,
                "investments": [],
                "debts": [],
                "simulation_history": sims_list,
                "copilot_conversations": convs_list,
                "notifications": [
                    {"severity": "info", "title": "Welcome to FinGear AI Twin", "detail": "Log your income and expenses to build your personalized Financial Digital Twin."}
                ],
                "events": [],
                "recurring_transactions": recurring_list,
            },
        }

        DATABASE["users"][db_user.id] = user_entry
        return user_entry
    except Exception as e:
        print(f"[DB _load_user_state_from_db] Error: {e}")
        return None
    finally:
        if close_db and db:
            db.close()


def find_user_by_email(email: str) -> dict | None:
    email = email.strip().lower()
    # Check in-memory cache first
    cached = next((user for user in DATABASE["users"].values() if user["email"].lower() == email), None)
    if cached:
        return cached

    # Query PostgreSQL
    if SessionLocal:
        try:
            db = SessionLocal()
            db_user = db.query(User).filter(func.lower(User.email) == email).first()
            if db_user:
                user_dict = _load_user_state_from_db(db_user.id, db=db)
                db.close()
                return user_dict
            db.close()
        except Exception as e:
            print(f"[find_user_by_email] DB lookup failed: {e}")

    return None


def create_user(name: str, email: str, password: str) -> dict:
    user_id = str(uuid4())
    pw_hash = hash_password(password)
    clean_email = email.strip().lower()

    if SessionLocal:
        try:
            db = SessionLocal()
            existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
            if existing:
                user_id = existing.id
            else:
                db_user = User(
                    id=user_id,
                    name=name,
                    email=clean_email,
                    password_hash=pw_hash,
                )
                db.add(db_user)

                db_profile = FinancialProfile(
                    id=str(uuid4()),
                    user_id=user_id,
                    name=name,
                    email=clean_email,
                    age=25,
                    currency="INR",
                    monthly_income=0.0,
                    savings_balance=0.0,
                    investments_balance=0.0,
                    emergency_fund=0.0,
                    emergency_target=0.0,
                    total_debt=0.0,
                    monthly_debt_payment=0.0,
                )
                db.add(db_profile)

                # Seed initial recurring commitments
                defaults = [
                    {"name": "Apartment House Rent", "amount": 16000.0, "category": "Rent", "type": "expense", "day_of_month": 1},
                    {"name": "High-Speed WiFi Broadband", "amount": 999.0, "category": "Utilities", "type": "expense", "day_of_month": 5},
                    {"name": "Nifty 50 Index Fund SIP", "amount": 5000.0, "category": "Mutual Funds", "type": "savings", "day_of_month": 1},
                ]
                for d in defaults:
                    r_txn = RecurringTransaction(
                        id=str(uuid4()),
                        user_id=user_id,
                        name=d["name"],
                        amount=d["amount"],
                        category=d["category"],
                        type=d["type"],
                        day_of_month=d["day_of_month"],
                        is_active=True,
                    )
                    db.add(r_txn)

                db.commit()

            user_dict = _load_user_state_from_db(user_id, db=db)
            db.close()
            if user_dict:
                return user_dict
        except Exception as e:
            print(f"[DB create_user] Error: {e}")

    # Fallback to in-memory state
    state = _empty_state(name=name, email=clean_email)
    DATABASE["users"][user_id] = {
        "id": user_id,
        "name": name,
        "email": clean_email,
        "password_hash": pw_hash,
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
    if user_id in DATABASE["users"]:
        return DATABASE["users"][user_id]

    if SessionLocal:
        try:
            db = SessionLocal()
            db_user = db.query(User).filter(User.id == user_id).first()
            if db_user:
                user_dict = _load_user_state_from_db(db_user.id, db=db)
                db.close()
                if user_dict:
                    return user_dict
            db.close()
        except Exception as e:
            print(f"[get_user] DB lookup failed: {e}")

    raise KeyError(user_id)


def get_state(user_id: str) -> dict:
    return get_user(user_id)["state"]


def state_copy(user_id: str) -> dict:
    return deepcopy(get_state(user_id))


def update_profile(user_id: str, profile: dict) -> dict:
    state = get_state(user_id)
    state["profile"] = profile

    if SessionLocal:
        try:
            db = SessionLocal()
            db_prof = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
            if not db_prof:
                db_prof = FinancialProfile(id=str(uuid4()), user_id=user_id)
                db.add(db_prof)

            fields = [
                "name", "email", "age", "occupation", "currency", "financial_experience",
                "income_type", "dependents", "salary_day", "credit_score", "risk_appetite",
                "lifestyle_preference", "primary_financial_goal", "monthly_income_tier",
                "monthly_income", "other_income", "savings_balance", "investments_balance",
                "emergency_fund", "emergency_target", "total_debt", "monthly_debt_payment",
                "mutual_funds", "stocks", "fixed_deposits", "gold", "provident_fund",
                "real_estate_value", "crypto_value", "adaptive_needs_ratio",
                "adaptive_wants_ratio", "adaptive_savings_ratio", "target_needs_ratio",
                "target_wants_ratio", "target_savings_ratio", "detailed_expenses"
            ]
            for f in fields:
                if f in profile and profile[f] is not None:
                    setattr(db_prof, f, profile[f])
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB update_profile] Error: {e}")

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
    """Sync state changes to PostgreSQL database."""
    if not SessionLocal:
        return
    try:
        db = SessionLocal()

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
                db_prof = FinancialProfile(id=str(uuid4()), user_id=user_id, name=db_user.name, email=db_user.email)
                db.add(db_prof)
                db.commit()
            fields = [
                "emergency_fund", "savings_balance", "investments_balance",
                "mutual_funds", "stocks", "fixed_deposits", "gold", "provident_fund",
                "total_debt", "monthly_income", "detailed_expenses"
            ]
            for f in fields:
                if f in profile and profile[f] is not None:
                    setattr(db_prof, f, profile[f])
            db.commit()

        if txn:
            t_date = txn.get("date") or str(date.today())
            try:
                parsed_date = date.fromisoformat(str(t_date)[:10])
            except Exception:
                parsed_date = date.today()

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
            else:
                db_txn.deleted_at = None
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
    new_goal = {**goal, "id": goal.get("id") or str(uuid4())}
    get_state(user_id)["profile"]["goals"].append(new_goal)

    if SessionLocal:
        try:
            db = SessionLocal()
            t_date = None
            if new_goal.get("target_date"):
                try:
                    t_date = date.fromisoformat(str(new_goal["target_date"])[:10])
                except Exception:
                    pass
            db_goal = Goal(
                id=new_goal["id"],
                user_id=user_id,
                name=new_goal["name"],
                goal_type=new_goal.get("goal_type", "savings"),
                target_amount=float(new_goal.get("target_amount", 0.0)),
                current_amount=float(new_goal.get("current_amount", 0.0)),
                monthly_contribution=float(new_goal.get("monthly_contribution", 0.0)),
                target_date=t_date,
            )
            db.add(db_goal)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB add_goal] Error: {e}")

    return deepcopy(new_goal)


def update_goal(user_id: str, goal_name: str, goal: dict) -> dict:
    goals = get_state(user_id)["profile"]["goals"]
    found = False
    for i, g in enumerate(goals):
        if g["name"] == goal_name:
            goals[i] = goal
            found = True
            break
    if not found:
        raise ValueError(f"Goal {goal_name} not found")

    if SessionLocal:
        try:
            db = SessionLocal()
            db_goal = db.query(Goal).filter(Goal.user_id == user_id, Goal.name == goal_name).first()
            if db_goal:
                db_goal.name = goal.get("name", db_goal.name)
                db_goal.goal_type = goal.get("goal_type", db_goal.goal_type)
                db_goal.target_amount = float(goal.get("target_amount", db_goal.target_amount))
                db_goal.current_amount = float(goal.get("current_amount", db_goal.current_amount))
                db_goal.monthly_contribution = float(goal.get("monthly_contribution", db_goal.monthly_contribution))
                if goal.get("target_date"):
                    try:
                        db_goal.target_date = date.fromisoformat(str(goal["target_date"])[:10])
                    except Exception:
                        pass
                db.commit()
            db.close()
        except Exception as e:
            print(f"[DB update_goal] Error: {e}")

    return deepcopy(goal)


def delete_goal(user_id: str, goal_name: str) -> None:
    goals = get_state(user_id)["profile"]["goals"]
    get_state(user_id)["profile"]["goals"] = [g for g in goals if g["name"] != goal_name]

    if SessionLocal:
        try:
            db = SessionLocal()
            db.query(Goal).filter(Goal.user_id == user_id, Goal.name == goal_name).delete()
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB delete_goal] Error: {e}")


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
            txns.sort(key=lambda x: x.get("date", ""), reverse=True)
            # Re-apply asset impact
            _apply_asset_impact(state["profile"], txn, reverse=False)
            _sync_to_postgres(user_id, txn=txn, profile=state["profile"])
            break


def delete_simulation(user_id: str, sim_id: str) -> None:
    history = get_state(user_id)["simulation_history"]
    get_state(user_id)["simulation_history"] = [h for h in history if str(h.get("id")) != str(sim_id)]

    if SessionLocal:
        try:
            db = SessionLocal()
            db.query(Simulation).filter(Simulation.user_id == user_id, Simulation.id == sim_id).delete()
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB delete_simulation] Error: {e}")


def update_budgets(user_id: str, budgets: list[dict]) -> list[dict]:
    get_state(user_id)["budgets"] = deepcopy(budgets)

    if SessionLocal:
        try:
            db = SessionLocal()
            for item in budgets:
                db_b = db.query(Budget).filter(Budget.user_id == user_id, Budget.category == item.get("category")).first()
                if not db_b:
                    db_b = Budget(
                        id=item.get("id") or str(uuid4()),
                        user_id=user_id,
                        category=item.get("category", ""),
                        planned=float(item.get("planned", 0.0)),
                        actual=float(item.get("actual", 0.0)),
                        period_month=item.get("period_month"),
                    )
                    db.add(db_b)
                else:
                    db_b.planned = float(item.get("planned", db_b.planned))
                    db_b.actual = float(item.get("actual", db_b.actual))
                    db_b.period_month = item.get("period_month", db_b.period_month)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB update_budgets] Error: {e}")

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

    if SessionLocal:
        try:
            db = SessionLocal()
            db_sim = Simulation(
                id=history_item["id"],
                user_id=user_id,
                scenario=simulation["scenario"],
                result=simulation["recommendation"],
            )
            db.add(db_sim)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB add_simulation] Error: {e}")

    return deepcopy(history_item)


def add_conversation(user_id: str, question: str, answer: str) -> dict:
    item = {"id": str(uuid4()), "date": str(date.today()), "question": question, "answer": answer}
    get_state(user_id)["copilot_conversations"].insert(0, item)

    if SessionLocal:
        try:
            db = SessionLocal()
            db_conv = CopilotConversation(
                id=item["id"],
                user_id=user_id,
                question=question,
                answer=answer,
            )
            db.add(db_conv)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB add_conversation] Error: {e}")

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

    if SessionLocal:
        try:
            db = SessionLocal()
            db_txn = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.id == transaction_id).first()
            if db_txn:
                db_txn.anomaly_acknowledged = True
                db_txn.anomaly_flag = False
                db.commit()
            db.close()
        except Exception as e:
            print(f"[DB acknowledge_transaction] Error: {e}")


def flag_transaction_anomaly(user_id: str, transaction_id: str, score: float) -> None:
    """Attach anomaly flag and score to a transaction."""
    txns = get_state(user_id)["transactions"]
    for txn in txns:
        if str(txn.get("id")) == str(transaction_id):
            txn["anomaly_flag"] = True
            txn["anomaly_score"] = score
            break

    if SessionLocal:
        try:
            db = SessionLocal()
            db_txn = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.id == transaction_id).first()
            if db_txn:
                db_txn.anomaly_flag = True
                db_txn.anomaly_score = score
                db.commit()
            db.close()
        except Exception as e:
            print(f"[DB flag_transaction_anomaly] Error: {e}")


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

    if SessionLocal:
        try:
            db = SessionLocal()
            db_txn = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.id == transaction_id).first()
            if db_txn:
                db_txn.model_training_excluded = True
                db_txn.anomaly_flag = False
                db.commit()
            db.close()
        except Exception as e:
            print(f"[DB exclude_transaction_from_training] Error: {e}")


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
        current_effective = history.get(current_month, profile.get("monthly_income", 50000))
        history[current_month] = float(current_effective + amount)

    adjustments = state.setdefault("income_adjustments", [])
    adj_id = str(uuid4())
    adjustments.append({
        "id": adj_id,
        "user_id": user_id,
        "transaction_id": transaction_id,
        "amount": amount,
        "scope": "all_months" if apply_to_all_months else "present_month",
        "effective_month": current_month,
        "created_at": datetime.now().isoformat()
    })

    # Save to PostgreSQL
    if SessionLocal:
        try:
            db = SessionLocal()
            db_prof = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
            if db_prof and apply_to_all_months and amount > 0:
                db_prof.monthly_income = float(amount)

            adj_row = IncomeAdjustment(
                id=adj_id,
                user_id=user_id,
                transaction_id=transaction_id,
                amount=amount,
                scope="all_months" if apply_to_all_months else "present_month",
                effective_month=current_month,
            )
            db.add(adj_row)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB update_monthly_income_suite] Error: {e}")

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

    if SessionLocal:
        try:
            db = SessionLocal()
            r_row = RecurringTransaction(
                id=new_item["id"],
                user_id=user_id,
                name=new_item["name"],
                amount=new_item["amount"],
                category=new_item["category"],
                type=new_item["type"],
                day_of_month=new_item["day_of_month"],
                is_active=new_item["is_active"],
                last_processed_date=new_item["last_processed_date"],
            )
            db.add(r_row)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB add_recurring_transaction] Error: {e}")

    return deepcopy(new_item)


def update_recurring_transaction(user_id: str, item_id: str, item: dict) -> dict:
    """Update an existing recurring transaction."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    updated = None
    for idx, r in enumerate(recurring):
        if str(r.get("id")) == str(item_id):
            updated = {**r, **item}
            recurring[idx] = updated
            break
    if not updated:
        raise ValueError(f"Recurring transaction {item_id} not found")

    if SessionLocal:
        try:
            db = SessionLocal()
            db_r = db.query(RecurringTransaction).filter(RecurringTransaction.user_id == user_id, RecurringTransaction.id == item_id).first()
            if db_r:
                if "name" in item:
                    db_r.name = item["name"]
                if "amount" in item:
                    db_r.amount = float(item["amount"])
                if "category" in item:
                    db_r.category = item["category"]
                if "type" in item:
                    db_r.type = item["type"]
                if "day_of_month" in item:
                    db_r.day_of_month = int(item["day_of_month"])
                if "is_active" in item:
                    db_r.is_active = bool(item["is_active"])
                if "last_processed_date" in item:
                    db_r.last_processed_date = item["last_processed_date"]
                db.commit()
            db.close()
        except Exception as e:
            print(f"[DB update_recurring_transaction] Error: {e}")

    return deepcopy(updated)


def delete_recurring_transaction(user_id: str, item_id: str) -> None:
    """Delete a recurring transaction."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    state["recurring_transactions"] = [r for r in recurring if str(r.get("id")) != str(item_id)]

    if SessionLocal:
        try:
            db = SessionLocal()
            db.query(RecurringTransaction).filter(RecurringTransaction.user_id == user_id, RecurringTransaction.id == item_id).delete()
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB delete_recurring_transaction] Error: {e}")


def process_recurring_transactions(user_id: str) -> list[dict]:
    """Check active recurring transactions and auto-inject into ledger for current month if due."""
    state = get_state(user_id)
    recurring = state.setdefault("recurring_transactions", [])
    current_month = datetime.now().strftime("%Y-%m")
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

            if SessionLocal:
                try:
                    db = SessionLocal()
                    db_r = db.query(RecurringTransaction).filter(RecurringTransaction.user_id == user_id, RecurringTransaction.id == r["id"]).first()
                    if db_r:
                        db_r.last_processed_date = current_month
                        db.commit()
                    db.close()
                except Exception as e:
                    print(f"[DB process_recurring_transactions] Error: {e}")

    return created_txns
