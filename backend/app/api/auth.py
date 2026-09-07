from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.security import create_access_token, get_current_user_id, verify_password
from app.repositories import memory
from app.schemas.finance import AuthResponse, UserCreate, UserLogin

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

SENSITIVE_GOOGLE_FIELDS = {"access_token", "refresh_token", "id_token", "client_secret", "code"}


def _request_base_url(request: Request) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if not host:
        return settings.public_app_url.rstrip("/")
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    return f"{scheme}://{host}".rstrip("/")


def _oauth_redirect_uri(request: Request) -> str:
    return settings.google_redirect_uri


def _frontend_redirect(app_url: str, path: str, params: dict, fragment: bool = False) -> RedirectResponse:
    separator = "#" if fragment else "?"
    return RedirectResponse(f"{app_url}{path}{separator}{urlencode(params)}")


def _redact_google_payload(value):
    if isinstance(value, dict):
        return {
            key: "[redacted]" if key in SENSITIVE_GOOGLE_FIELDS else _redact_google_payload(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_google_payload(item) for item in value]
    return value


def _parse_google_response_body(body: str):
    try:
        return _redact_google_payload(json.loads(body))
    except json.JSONDecodeError:
        return body[:1000]


def _safe_google_error_reason(status_code: int | None, body) -> str:
    if isinstance(body, dict):
        error = body.get("error") or "token_exchange_failed"
        description = body.get("error_description") or body.get("error_uri") or ""
        if description:
            return f"google_token_{status_code}_{error}: {description}"
        return f"google_token_{status_code}_{error}"
    if body:
        return f"google_token_{status_code}: {body}"
    return f"google_token_{status_code}_request_failed"


def _development_google_error(reason: str) -> str:
    if settings.app_env.lower() in {"development", "dev", "local"}:
        return reason
    return "exchange_failed"


def _exchange_google_code(code: str, redirect_uri: str) -> dict:
    token_payload = urlencode(
        {
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    token_request = UrlRequest(
        "https://oauth2.googleapis.com/token",
        data=token_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(token_request, timeout=10) as response:
            response_body = response.read().decode("utf-8")
            logger.info(
                "Google token endpoint returned status=%s body omitted because successful responses contain tokens.",
                response.status,
            )
            return json.loads(response_body)
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        safe_body = _parse_google_response_body(response_body)
        logger.warning("Google token endpoint failed status=%s body=%s", exc.code, safe_body)
        raise RuntimeError(_safe_google_error_reason(exc.code, safe_body)) from exc
    except URLError as exc:
        logger.warning("Google token endpoint network failure reason=%s", exc.reason)
        raise RuntimeError(f"google_token_network_error: {exc.reason}") from exc


@router.post("/register", response_model=AuthResponse)
def register(payload: UserCreate) -> AuthResponse:
    email = payload.email.strip().lower()
    name = payload.name.strip()
    password = payload.password.strip()
    if memory.find_user_by_email(email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = memory.create_user(name, email, password)
    return AuthResponse(access_token=create_access_token(user["id"]), user=memory.public_user(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin) -> AuthResponse:
    email = payload.email.strip().lower()
    password = payload.password.strip()
    user = memory.find_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return AuthResponse(access_token=create_access_token(user["id"]), user=memory.public_user(user))


@router.get("/me")
def me(user_id: str = Depends(get_current_user_id)) -> dict:
    return memory.public_user(memory.get_user(user_id))


@router.get("/google/status")
def google_status(request: Request) -> dict:
    configured = bool(settings.google_client_id and settings.google_client_secret)
    return {
        "configured": configured,
        "redirect_uri": _oauth_redirect_uri(request),
        "message": "Google login is ready." if configured else "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env to enable Google login.",
    }


@router.get("/google/start")
def google_start(request: Request):
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google login is not configured.")
    redirect_uri = _oauth_redirect_uri(request)
    params = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
def google_callback(request: Request, code: str | None = None, error: str | None = None):
    app_url = settings.public_app_url.rstrip("/")
    redirect_uri = settings.google_redirect_uri
    if error:
        return _frontend_redirect(app_url, "/auth/callback", {"google_error": error})
    if not code or not settings.google_client_id or not settings.google_client_secret:
        return _frontend_redirect(app_url, "/auth/callback", {"google_error": "not_configured"})

    try:
        token_data = _exchange_google_code(code, redirect_uri)
        userinfo_request = UrlRequest(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo = json.loads(urlopen(userinfo_request, timeout=10).read().decode("utf-8"))
        email = userinfo.get("email")
        if not email:
            return _frontend_redirect(app_url, "/auth/callback", {"google_error": "no_email"})
        user = memory.find_or_create_oauth_user(userinfo.get("name") or email.split("@")[0], email)
        token = create_access_token(user["id"])
        return _frontend_redirect(app_url, "/auth/callback", {"token": token, "next": "/dashboard"}, fragment=True)
    except Exception as exc:
        logger.warning("Google OAuth callback failed reason=%s", exc)
        return _frontend_redirect(app_url, "/auth/callback", {"google_error": _development_google_error(str(exc))})
