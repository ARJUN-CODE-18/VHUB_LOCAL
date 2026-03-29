"""add_users_table

Revision ID: f2b41aa01d41
Revises: a4cc8a71f9d0
Create Date: 2026-03-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2b41aa01d41"
down_revision: Union[str, None] = "a4cc8a71f9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("userid", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_userid", "users", ["userid"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_userid", table_name="users")
    op.drop_table("users")
