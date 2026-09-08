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
            engine = create_engine(settings.database_url)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            Base.metadata.create_all(bind=engine)

            # Auto-migrate newly added columns on existing tables
            with engine.connect() as conn:
                for col_stmt in [
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS loan_type VARCHAR DEFAULT 'Personal Loan';",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS lender VARCHAR;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS total_tenure_months INTEGER DEFAULT 12;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS tenure_elapsed_months INTEGER DEFAULT 0;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS start_date VARCHAR;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS end_date VARCHAR;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS emi_day INTEGER DEFAULT 5;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS last_payment_date VARCHAR;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS auto_deduct BOOLEAN DEFAULT TRUE;",
                    "ALTER TABLE debts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';",
                ]:
                    try:
                        conn.execute(text(col_stmt))
                        conn.commit()
                    except Exception:
                        pass

            print("[Database] PostgreSQL tables successfully verified/created.")
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

