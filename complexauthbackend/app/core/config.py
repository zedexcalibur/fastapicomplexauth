from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    secret_key: str
    refresh_secret_key: str
    database_url: str
    environment: str = "development"

    smtp_enabled: bool = True
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_starttls: bool = False

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()