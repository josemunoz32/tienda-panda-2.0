import os
from pydantic import BaseModel, Field

class Settings(BaseModel):
    # These will be populated by Cloud Functions Secret Manager integration automatically
    # if we declare them in @https_fn.on_request(secrets=[...])
    IG_VERIFY_TOKEN: str = Field(default_factory=lambda: os.getenv("IG_VERIFY_TOKEN", ""))
    IG_ACCESS_TOKEN: str = Field(default_factory=lambda: os.getenv("IG_ACCESS_TOKEN", ""))
    OPENAI_API_KEY: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    TELEGRAM_BOT_TOKEN: str = Field(default_factory=lambda: os.getenv("TELEGRAM_BOT_TOKEN", ""))
    TELEGRAM_ADMIN_ID: str = Field(default_factory=lambda: os.getenv("TELEGRAM_ADMIN_ID", ""))
    
    # Firestore configuration
    PROJECT_ID: str = Field(default_factory=lambda: os.getenv("GCP_PROJECT", "pandastore-project"))

settings = Settings()
