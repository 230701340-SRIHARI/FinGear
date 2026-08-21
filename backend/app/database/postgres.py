from app.core.config import settings


def get_database_status() -> dict:
    return {
        "mode": "configured-not-required-for-demo",
        "database_url_configured": bool(settings.database_url),
        "note": "PostgreSQL is the intended persistent store. Local development currently uses an in-memory repository so startup does not require a running database.",
    }
