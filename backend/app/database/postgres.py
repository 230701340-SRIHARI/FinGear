from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.models import Base

engine = None
SessionLocal = None

if settings.database_url:
    try:
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        print(f"Failed to connect to database: {e}")

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
