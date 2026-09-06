from __future__ import annotations

from pathlib import Path
import time

from sqlalchemy import create_engine

from app.core.config import settings


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "app" / "database" / "schema.sql"


def initialize_database() -> None:
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required to initialize PostgreSQL")

    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql(schema_sql)
    finally:
        engine.dispose()


if __name__ == "__main__":
    last_error: Exception | None = None
    for attempt in range(1, 31):
        try:
            initialize_database()
            print("PostgreSQL schema initialized")
            break
        except Exception as error:  # Docker PostgreSQL may still be starting.
            last_error = error
            print(f"Waiting for PostgreSQL ({attempt}/30): {error}")
            time.sleep(2)
    else:
        raise SystemExit(f"Could not initialize PostgreSQL: {last_error}")