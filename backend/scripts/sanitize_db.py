"""
FinGear Database & User State Sanitizer
Purges auto-seeded dummy commitments and removes '(Auto-Recurring)' artifacts.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.postgres import SessionLocal
from app.database.models import User, FinancialProfile, Transaction, RecurringTransaction, Debt
from app.repositories import memory

SEEDED_RECURRING_NAMES = {
    "Apartment House Rent",
    "High-Speed WiFi Broadband",
    "Nifty 50 Index Fund SIP",
}

def sanitize():
    if not SessionLocal:
        print("PostgreSQL not configured or offline. Checking memory state...")
        for uid, udata in memory.DATABASE["users"].items():
            state = udata.get("state", {})
            clean_state(state)
        print("Memory state sanitized.")
        return

    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Sanitizing {len(users)} users in database...")

        for u in users:
            print(f"\n--- Checking User: {u.name} ({u.email}) id={u.id} ---")
            
            # 1. Clean recurring commitments matching seeded defaults
            seeded_recs = db.query(RecurringTransaction).filter(
                RecurringTransaction.user_id == u.id,
                RecurringTransaction.name.in_(SEEDED_RECURRING_NAMES)
            ).all()
            for r in seeded_recs:
                print(f"  Removing seeded recurring commitment: {r.name}")
                db.delete(r)

            # 2. Clean fake auto-seeded debts ("HDFC Auto / Vehicle Loan")
            fake_debts = db.query(Debt).filter(
                Debt.user_id == u.id,
                Debt.name.ilike("%HDFC Auto%")
            ).all()
            for d in fake_debts:
                print(f"  Removing auto-seeded debt: {d.name}")
                db.delete(d)
                # Reset total_debt on profile if it only came from this fake debt
                prof = db.query(FinancialProfile).filter(FinancialProfile.user_id == u.id).first()
                if prof:
                    other_debts = db.query(Debt).filter(Debt.user_id == u.id, Debt.id != d.id).all()
                    prof.total_debt = sum(float(od.outstanding or 0) for od in other_debts)
                    prof.monthly_debt_payment = sum(float(od.emi or 0) for od in other_debts)
                    print(f"  Updated profile total_debt to: {prof.total_debt}")

            # 3. Clean auto-injected transactions
            txns = db.query(Transaction).filter(Transaction.user_id == u.id).all()
            for t in txns:
                desc = t.description or ""
                # Check if it's a seeded recurring transaction or seeded HDFC EMI
                if any(seed_name in desc for seed_name in SEEDED_RECURRING_NAMES) or "HDFC Auto" in desc:
                    print(f"  Removing auto-injected seeded transaction: {desc}")
                    db.delete(t)
                elif "(Auto-Recurring)" in desc:
                    cleaned = desc.replace(" (Auto-Recurring)", "").replace("(Auto-Recurring)", "").strip()
                    print(f"  Stripping (Auto-Recurring) from transaction: '{desc}' -> '{cleaned}'")
                    t.description = cleaned

            db.commit()

            # Also clear memory cache for this user so changes reflect immediately
            if u.id in memory.DATABASE["users"]:
                del memory.DATABASE["users"][u.id]

        print("\nDatabase sanitization complete!")
    except Exception as e:
        db.rollback()
        print(f"Error during sanitization: {e}")
        raise
    finally:
        db.close()


def clean_state(state: dict):
    if not state:
        return
    # Clean recurring
    if "recurring_transactions" in state:
        state["recurring_transactions"] = [
            r for r in state["recurring_transactions"]
            if r.get("name") not in SEEDED_RECURRING_NAMES
        ]
    # Clean debts
    if "debts" in state:
        state["debts"] = [
            d for d in state["debts"]
            if "HDFC Auto" not in d.get("name", "")
        ]
        if "profile" in state:
            state["profile"]["total_debt"] = sum(float(d.get("outstanding", 0)) for d in state["debts"])
            state["profile"]["monthly_debt_payment"] = sum(float(d.get("emi", 0)) for d in state["debts"])
    # Clean transactions
    if "transactions" in state:
        cleaned_txns = []
        for t in state["transactions"]:
            desc = t.get("description", "")
            if any(s in desc for s in SEEDED_RECURRING_NAMES) or "HDFC Auto" in desc:
                continue
            if "(Auto-Recurring)" in desc:
                t["description"] = desc.replace(" (Auto-Recurring)", "").replace("(Auto-Recurring)", "").strip()
            cleaned_txns.append(t)
        state["transactions"] = cleaned_txns


if __name__ == "__main__":
    sanitize()
