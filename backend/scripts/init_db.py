"""
Database initialization and verification script for FinGear.
Validates SQLAlchemy schema definitions and connects to PostgreSQL if configured.
"""
import sys
import os

# Add backend root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.database.models import Base
from app.database.postgres import init_db, get_database_status

def main():
    print("=== FinGear Database Verification ===")
    status = get_database_status()
    print(f"Status: {status['mode']}")
    print(f"Database URL configured: {status['database_url_configured']}")
    
    # Verify all tables in Base.metadata
    print(f"Registered SQLAlchemy tables ({len(Base.metadata.tables)}):")
    for table_name in sorted(Base.metadata.tables.keys()):
        cols = [c.name for c in Base.metadata.tables[table_name].columns]
        print(f"  - {table_name} ({len(cols)} columns: {', '.join(cols[:5])}...)")
        
    if settings.database_url:
        print("\nAttempting PostgreSQL connection & table creation...")
        success = init_db()
        if success:
            print("[SUCCESS] All tables created and connected successfully.")
        else:
            print("[WARNING] Could not connect to PostgreSQL. Check credentials in .env")
    else:
        print("\n[INFO] DATABASE_URL not set in environment. App will operate in in-memory fallback mode.")
        print("To connect to PostgreSQL, set DATABASE_URL=postgresql://user:pass@localhost:5432/fingear in backend/.env")

if __name__ == "__main__":
    main()
