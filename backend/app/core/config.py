from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    huggingface_api_key: str = ""
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    model_dir: str = "models"
    weight_type: str = "pt"  # pt | onnx | engine
    config_path: str = "config.json"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
