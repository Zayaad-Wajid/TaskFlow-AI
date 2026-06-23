"""task filter indexes

Revision ID: 20260623_0004
Revises: 20260623_0003
Create Date: 2026-06-23
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260623_0004"
down_revision: Union[str, None] = "20260623_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_tasks_personal_filters",
        "tasks",
        ["user_id", "workspace_id", "status", "priority", "due_date"],
        unique=False,
    )
    op.create_index(
        "ix_tasks_workspace_filters",
        "tasks",
        ["workspace_id", "status", "priority", "due_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_tasks_workspace_filters", table_name="tasks")
    op.drop_index("ix_tasks_personal_filters", table_name="tasks")
