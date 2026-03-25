"""baseline

Revision ID: db977c8ad8ee
Revises: 
Create Date: 2026-03-19 09:51:24.979475

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'db977c8ad8ee'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration intentionally no-ops to establish Alembic history on
    # environments where the schema already exists.
    pass


def downgrade() -> None:
    pass
