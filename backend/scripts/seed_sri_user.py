"""
Seed script: creates user "sri" (srihari142@gmail.com / 1234)
and inserts 2 months of realistic Indian daily transactions.

Safely isolated – NO other user's data is touched.
Run from: d:/Projects/FinGear1/fingear-backend/backend
    .\.venv\Scripts\python.exe scripts/seed_sri_user.py
"""

import os
import sys
import random
from datetime import date, timedelta
from uuid import uuid4

# ── ensure backend package is importable ───────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.repositories import memory
from app.repositories.memory import update_profile, add_transaction

# ── 1.  create / load user ─────────────────────────────────────────────────
NAME     = "sri"
EMAIL    = "srihari142@gmail.com"
PASSWORD = "1234"

existing = memory.find_user_by_email(EMAIL)
if existing:
    user = existing
    user_id = user["id"]
    print(f"[INFO] User already exists: {EMAIL} (id={user_id})")
else:
    user = memory.create_user(NAME, EMAIL, PASSWORD)
    user_id = user["id"]
    print(f"[INFO] Created new user: {EMAIL} (id={user_id})")

# ── 2.  set up a realistic Indian profile ─────────────────────────────────
profile = memory.state_copy(user_id)["profile"]
profile.update({
    "name": "Sri Hari",
    "email": EMAIL,
    "age": 27,
    "occupation": "Software Engineer",
    "currency": "INR",
    "monthly_income": 75000,
    "other_income": 0,
    "savings_balance": 120000,
    "investments_balance": 50000,
    "emergency_fund": 45000,
    "emergency_target": 225000,   # 3 months expenses
    "total_debt": 180000,
    "monthly_debt_payment": 6000,
    "mutual_funds": 30000,
    "stocks": 15000,
    "fixed_deposits": 50000,
    "gold": 0,
    "provident_fund": 22000,
    "risk_appetite": "Moderate",
    "primary_financial_goal": "Wealth Creation",
    "salary_day": 1,
    "financial_experience": "Intermediate",
    "monthly_expenses": [
        {"category": "Food", "amount": 6000},
        {"category": "Rent", "amount": 15000},
        {"category": "Transport", "amount": 2500},
        {"category": "Utilities", "amount": 2000},
        {"category": "Shopping", "amount": 3000},
        {"category": "Healthcare", "amount": 1000},
        {"category": "Entertainment", "amount": 2000},
    ],
})
update_profile(user_id, profile)
print(f"[INFO] Profile saved for {user_id}")

# ── 3.  generate 2 months of daily transactions ────────────────────────────
# date range: 2026-08-01  →  2026-09-30
START = date(2026, 8, 1)
END   = date(2026, 9, 30)

# Expense templates  (description, category, mean_amount, std)
EXPENSE_POOL = [
    # Food & Dining
    ("Zomato order",          "Food",          350, 100),
    ("Swiggy delivery",       "Food",          280, 80),
    ("Canteen lunch",         "Food",          120, 30),
    ("Tea & snacks",          "Food",          60,  20),
    ("Grocery – BigBasket",   "Food",          900, 200),
    ("Grocery – Local shop",  "Food",          500, 150),
    ("Dominos pizza",         "Food",          550, 100),
    ("Restaurant dinner",     "Food",          800, 200),
    # Transport
    ("Ola cab",               "Transport",     250, 80),
    ("Metro card recharge",   "Transport",     200, 0),
    ("Petrol – Bike",         "Transport",     350, 50),
    # Utilities
    ("Electricity bill",      "Utilities",     900, 100),
    ("Internet – Airtel",     "Utilities",     799, 0),
    ("Mobile recharge",       "Utilities",     599, 0),
    # Shopping
    ("Myntra clothing",       "Shopping",      1500, 500),
    ("Amazon purchase",       "Shopping",      800, 400),
    ("Flipkart order",        "Shopping",      1200, 600),
    # Entertainment
    ("Netflix subscription",  "Entertainment", 649, 0),
    ("Hotstar subscription",  "Entertainment", 299, 0),
    ("Movie ticket – PVR",    "Entertainment", 450, 100),
    ("Weekend outing",        "Entertainment", 600, 200),
    # Healthcare
    ("Apollo pharmacy",       "Healthcare",    350, 150),
    ("Doctor consultation",   "Healthcare",    600, 0),
    # Misc
    ("Gym membership",        "Shopping",      1500, 0),
    ("Haircut – salon",       "Shopping",      300, 50),
    ("Coffee – Starbucks",    "Food",          450, 50),
]

# Determine income txn day (salary on 1st; freelance sometimes mid-month)
INCOME_EVENTS = [
    (date(2026, 8, 1),  "Monthly Salary – August",    75000, "income"),
    (date(2026, 8, 15), "Freelance project payment",  8000,  "income"),
    (date(2026, 9, 1),  "Monthly Salary – September", 75000, "income"),
    # Savings deposits
    (date(2026, 8, 3),  "SIP – HDFC Mutual Fund",     5000,  "savings"),
    (date(2026, 8, 3),  "Zerodha – Stocks SIP",       2000,  "savings"),
    (date(2026, 9, 3),  "SIP – HDFC Mutual Fund",     5000,  "savings"),
    (date(2026, 9, 3),  "Zerodha – Stocks SIP",       2000,  "savings"),
    # Rent (fixed on 5th)
    (date(2026, 8, 5),  "Rent – PG / apartment",      15000, "expense"),
    (date(2026, 9, 5),  "Rent – PG / apartment",      15000, "expense"),
    # EMI
    (date(2026, 8, 7),  "Personal Loan EMI",          6000,  "expense"),
    (date(2026, 9, 7),  "Personal Loan EMI",          6000,  "expense"),
]

random.seed(42)  # reproducible

transactions = []

# Add fixed events
for ev_date, desc, amount, txn_type in INCOME_EVENTS:
    category = "Income" if txn_type == "income" else ("Savings" if txn_type == "savings" else "Bills")
    if desc.startswith("Rent"):
        category = "Rent"
    elif "EMI" in desc:
        category = "Bills"
    elif "SIP" in desc or "Stocks" in desc:
        category = "Investment"
    transactions.append({
        "id": str(uuid4()),
        "date": str(ev_date),
        "transaction_date": str(ev_date),
        "description": desc,
        "amount": float(amount),
        "category": category,
        "type": txn_type,
    })

# Sprinkle daily expenses
cur = START
while cur <= END:
    dow = cur.weekday()
    is_weekend = dow >= 5

    # How many expense transactions on this day?
    if is_weekend:
        num_txns = random.randint(1, 3)   # more spending on weekends
    else:
        num_txns = random.randint(0, 2)

    chosen = random.sample(EXPENSE_POOL, k=min(num_txns, len(EXPENSE_POOL)))

    for desc, category, mean_amt, std_amt in chosen:
        amt = max(50, int(random.gauss(mean_amt, std_amt)))
        transactions.append({
            "id": str(uuid4()),
            "date": str(cur),
            "transaction_date": str(cur),
            "description": desc,
            "amount": float(amt),
            "category": category,
            "type": "expense",
        })

    cur += timedelta(days=1)

# Sort oldest-first then insert (add_transaction will re-sort by date desc)
transactions.sort(key=lambda t: t["date"])

existing_state = memory.state_copy(user_id)
existing_txn_count = len(existing_state.get("transactions", []))
print(f"[INFO] Existing transactions for user: {existing_txn_count}")

if existing_txn_count > 0:
    print("[WARN] User already has transactions – skipping bulk insert to avoid duplicates.")
    print("[DONE] Run complete. Use the existing transaction history.")
else:
    for txn in transactions:
        add_transaction(user_id, txn)

    final_count = len(memory.state_copy(user_id).get("transactions", []))
    print(f"[INFO] Inserted {len(transactions)} transactions. Total in store: {final_count}")

print(f"\n[DONE] User seeded successfully!")
print(f"  Name    : {NAME} (Sri Hari)")
print(f"  Email   : {EMAIL}")
print(f"  Password: {PASSWORD}")
print(f"  User ID : {user_id}")
print(f"  Income  : ₹75,000/month")
print(f"  Savings : ₹1,20,000 balance")
print(f"  Data    : {START} → {END} (2 months)")
print(f"\nLogin at http://127.0.0.1:5173 with the above credentials.")
