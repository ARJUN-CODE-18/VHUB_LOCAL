"""add_vertipad_status_column

Revision ID: a4cc8a71f9d0
Revises: 9f4d2f0e6b6c
Create Date: 2026-03-21 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4cc8a71f9d0"
down_revision: Union[str, None] = "9f4d2f0e6b6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vertipad",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="AVAILABLE"),
    )
    op.create_index("ix_vertipad_status", "vertipad", ["status"], unique=False)

    op.execute("UPDATE vertipad SET status = state")
    op.alter_column("vertipad", "status", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_vertipad_status", table_name="vertipad")
    op.drop_column("vertipad", "status")
