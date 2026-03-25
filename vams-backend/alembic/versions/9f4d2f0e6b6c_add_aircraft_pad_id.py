"""add_aircraft_pad_id

Revision ID: 9f4d2f0e6b6c
Revises: 306b529c4d97
Create Date: 2026-03-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f4d2f0e6b6c"
down_revision: Union[str, None] = "306b529c4d97"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("aircraft", sa.Column("pad_id", sa.String(length=20), nullable=True))
    op.create_index("ix_aircraft_pad_id", "aircraft", ["pad_id"], unique=False)

    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.create_foreign_key(
            "fk_aircraft_pad_id_vertipad",
            "aircraft",
            "vertipad",
            ["pad_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.drop_constraint("fk_aircraft_pad_id_vertipad", "aircraft", type_="foreignkey")

    op.drop_index("ix_aircraft_pad_id", table_name="aircraft")
    op.drop_column("aircraft", "pad_id")
