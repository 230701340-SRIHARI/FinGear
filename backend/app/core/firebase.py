"""
Firebase Auth & Data Integration Helper.

Supports Firebase ID Token validation and user synchronization.
"""

import os
from typing import Optional

try:
    import firebase_admin
    from firebase_admin import auth, credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False


_firebase_app = None
_db = None


def initialize_firebase():
    global _firebase_app, _db
    if not FIREBASE_AVAILABLE:
        print("[Firebase] firebase_admin library not installed.")
        return False

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")
    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            _db = firestore.client()
            print("[Firebase] Firebase Admin SDK initialized successfully.")
            return True
        except Exception as e:
            print(f"[Firebase] Initialization failed: {e}")
            return False
    else:
        print(f"[Firebase] Credentials file not found at {cred_path}. Using standard JWT auth mode.")
        return False


def verify_firebase_id_token(id_token: str) -> Optional[dict]:
    """Verify Firebase ID token and return user claims."""
    if not FIREBASE_AVAILABLE or not firebase_admin._apps:
        return None
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"[Firebase] Token verification failed: {e}")
        return None


def sync_user_to_firestore(user_id: str, user_state: dict) -> bool:
    """Save user financial state to Firestore."""
    if not _db:
        return False
    try:
        doc_ref = _db.collection("users").document(user_id)
        doc_ref.set(user_state, merge=True)
        return True
    except Exception as e:
        print(f"[Firebase] Sync to Firestore failed: {e}")
        return False
