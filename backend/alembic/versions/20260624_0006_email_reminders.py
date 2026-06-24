"""add email reminder preferences and delivery tracking

Revision ID: 20260624_0006
Revises: 20260624_0005
Create Date: 2026-06-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260624_0006"
down_revision: Union[str, None] = "20260624_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("tasks", sa.Column("last_reminded_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "last_reminded_at")
    op.drop_column("users", "email_reminders_enabled")
