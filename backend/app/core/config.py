from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve backend/.env explicitly (no dependence on working directory)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    ENV: str = "local"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: str = "http://localhost:3000"

    MONGODB_URI: str
    MONGODB_DB: str = "task_manager"
    MONGODB_TEST_DB: str = "task_manager_test"

    JWT_SECRET: str
    JWT_ACCESS_MINUTES: int = 15
    JWT_REFRESH_DAYS: int = 7

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    AI_MAX_CHARS: int = 1200


    model_config = SettingsConfigDict(env_file=str(ENV_PATH), extra="ignore")

settings = Settings()
