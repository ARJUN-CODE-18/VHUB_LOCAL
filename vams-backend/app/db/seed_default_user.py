"""Bootstrap default auth user for local and non-production setups."""
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.core.security import hash_password


DEFAULT_USERID = "VERTIHUB"
DEFAULT_PASSWORD = "eVTOL"


def ensure_default_user(db: Session) -> bool:
    """Insert default user if it does not exist.

    Returns True when a new user is created, False when it already exists.
    """
    existing = db.query(User).filter(User.userid == DEFAULT_USERID).first()
    if existing:
        return False

    db.add(
        User(
            userid=DEFAULT_USERID,
            password_hash=hash_password(DEFAULT_PASSWORD),
        )
    )
    db.commit()
    return True
