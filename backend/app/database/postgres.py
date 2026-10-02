from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.models import Base

engine = None
SessionLocal = None

def init_db():
    global engine, SessionLocal
    if settings.database_url:
        try:
            engine = create_engine(
                settings.database_url,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=300,
            )
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            Base.metadata.create_all(bind=engine)

            # Auto-migrate newly added columns on existing tables in a single transaction
            with engine.connect() as conn:
                col_stmts = ";\n".join([
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS loan_type VARCHAR DEFAULT 'Personal Loan'",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS lender VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS total_tenure_months INTEGER DEFAULT 12",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS tenure_elapsed_months INTEGER DEFAULT 0",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS start_date VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS end_date VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS emi_day INTEGER DEFAULT 5",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS last_payment_date VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS auto_deduct BOOLEAN DEFAULT TRUE",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS account_number VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS interest_type VARCHAR DEFAULT 'Floating'",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_secured BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS collateral VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS prepayment_penalty_pct FLOAT DEFAULT 0.0",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS linked_account VARCHAR",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS notes VARCHAR",
                    "ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS debt_id VARCHAR",
                ]) + ";"
                try:
                    conn.execute(text(col_stmts))
                    conn.commit()
                except Exception:
                    # Fallback single execute if multi-statement is not supported
                    for stmt in col_stmts.split(";\n"):
                        if stmt.strip():
                            try:
                                conn.execute(text(stmt))
                                conn.commit()
                            except Exception:
                                pass

            print("[Database] PostgreSQL tables successfully verified/created with connection pool.")
            return True
        except Exception as e:
            print(f"[Database] Failed to connect to PostgreSQL: {e}")
            return False
    return False

if settings.database_url:
    init_db()

def get_database_status() -> dict:
    return {
        "mode": "postgres-configured" if engine else "in-memory-fallback",
        "database_url_configured": bool(settings.database_url),
        "note": "PostgreSQL models and SQLAlchemy are integrated. The application gracefully falls back to in-memory state for UI demonstrations if the database is unreachable or unset.",
    }

def get_db():
    if not SessionLocal:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

