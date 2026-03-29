from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "file_version_management"
    external_api_base_url: str = "http://localhost:8001/api/v1/external"
    max_file_size_mb: int = 10
    allowed_file_extensions: list[str] = [".txt", ".pdf"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
