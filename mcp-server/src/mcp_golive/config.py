"""Configuration management for MCP Go-Live server."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # API Configuration
    api_base_url: str = Field(
        default="http://localhost:8080/api/v1",
        description="Base URL for the Rust API backend"
    )
    api_timeout: int = Field(
        default=30,
        description="HTTP timeout for API requests (seconds)"
    )

    # Server Configuration
    environment: str = Field(
        default="dev",
        description="Environment: dev, staging, prod"
    )
    port: int = Field(
        default=3000,
        description="Port for HTTP transport",
        alias="MCP_PORT"
    )
    host: str = Field(
        default="0.0.0.0",
        description="Host for HTTP transport"
    )


settings = Settings()
