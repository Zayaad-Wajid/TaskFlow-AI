"""add task attachments

Revision ID: 20260624_0005
Revises: 20260623_0004
Create Date: 2026-06-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260624_0005"
down_revision: Union[str, None] = "20260623_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attachments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=160), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attachments_task_id"), "attachments", ["task_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_attachments_task_id"), table_name="attachments")
    op.drop_table("attachments")
