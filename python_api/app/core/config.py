from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # 도커/로컬 실행에서 같은 키를 쓰도록 환경변수(.env 포함) 기반으로 설정을 읽는다.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "python-chat-api"
    app_env: str = "dev"
    log_level: str = "INFO"

    database_url: str | None = None
    db_host: str = "db"
    db_port: int = 3306
    db_name: str = "ifscm"
    db_user: str = "root"
    db_password: str = "1234"

    backend_base_url: str = "http://backend:8080"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    chat_retention_days: int = 30
    max_message_length: int = 4000
    max_history_messages: int = 20
    rate_limit_per_minute: int = 20
    openai_timeout_seconds: int = 30
    openai_max_retries: int = 2

    @property
    def sqlalchemy_database_url(self) -> str:
        # DATABASE_URL이 있으면 우선 사용하고, 없으면 DB_* 값으로 접속 문자열을 조합한다.
        if self.database_url:
            return self.database_url
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    # 요청마다 환경변수를 다시 파싱하지 않도록 프로세스 단위로 1회만 생성한다.
    return Settings()
