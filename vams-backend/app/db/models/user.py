"""User authentication model."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.db.base import Base


class User(Base):
    """Application user used for login authentication."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    userid = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} userid={self.userid}>"
