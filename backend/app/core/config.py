from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FinGear AI"
    app_env: str = "development"
    frontend_origin: str = "http://127.0.0.1:5173"
    database_url: str = "postgresql://fingear:fingear_dev_password@localhost:5432/fingear_ai"
    jwt_secret: str = "change-this-development-secret"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://127.0.0.1:8000/api/auth/google/callback"
    public_app_url: str = "http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
