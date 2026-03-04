"""add sources_json to chat_message

Revision ID: 20260305_0002
Revises: 20260217_0001
Create Date: 2026-03-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260305_0002"
down_revision: str | None = "20260217_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("chat_message", sa.Column("sources_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_message", "sources_json")
