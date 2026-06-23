"""jwt multi user

Revision ID: 20260623_0002
Revises: 20260623_0001
Create Date: 2026-06-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import table, column


revision: str = "20260623_0002"
down_revision: Union[str, None] = "20260623_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
DEMO_PASSWORD_HASH = "$2b$12$mUjxAHleqqFPKM2uzrjy3eOIeuQIbOLEt1j2yAl3YUAWzkwx1GnK."


def upgrade() -> None:
    bind = op.get_bind()

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("email", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("hashed_password", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("name", sa.String(length=120), nullable=True))

    users = table(
        "users",
        column("id", sa.Integer),
        column("username", sa.String),
        column("password_hash", sa.String),
        column("email", sa.String),
        column("hashed_password", sa.String),
        column("name", sa.String),
    )

    existing_users = bind.execute(sa.text("SELECT id, username, password_hash FROM users")).mappings().all()
    for user in existing_users:
        username = user["username"] or f"user{user['id']}"
        email = "demo@example.com" if username == "demo" else (username if "@" in username else f"{username}@local.taskflow")
        password_hash = DEMO_PASSWORD_HASH if username == "demo" else user["password_hash"]
        bind.execute(
            users.update()
            .where(users.c.id == user["id"])
            .values(email=email.lower(), hashed_password=password_hash, name=username),
        )

    if not existing_users:
        bind.execute(sa.text(
            "INSERT INTO users (email, hashed_password, name, created_at) "
            f"VALUES ('demo@example.com', '{DEMO_PASSWORD_HASH}', 'Demo User', CURRENT_TIMESTAMP)"
        ))

    fallback_user_id = bind.execute(sa.text("SELECT id FROM users ORDER BY id LIMIT 1")).scalar()

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("email", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("hashed_password", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("name", existing_type=sa.String(length=120), nullable=False)
        batch_op.drop_index("ix_users_username")
        batch_op.drop_column("username")
        batch_op.drop_column("password_hash")
        batch_op.drop_column("role")
        batch_op.create_index("ix_users_email", ["email"], unique=True)

    with op.batch_alter_table("tasks") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_tasks_user_id", ["user_id"], unique=False)
        batch_op.create_foreign_key("fk_tasks_user_id_users", "users", ["user_id"], ["id"], ondelete="CASCADE")

    with op.batch_alter_table("habits") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_habits_user_id", ["user_id"], unique=False)
        batch_op.create_foreign_key("fk_habits_user_id_users", "users", ["user_id"], ["id"], ondelete="CASCADE")

    with op.batch_alter_table("activity_feed") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_activity_feed_user_id", ["user_id"], unique=False)
        batch_op.create_foreign_key("fk_activity_feed_user_id_users", "users", ["user_id"], ["id"], ondelete="CASCADE")

    bind.execute(sa.text("UPDATE tasks SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": fallback_user_id})
    bind.execute(sa.text("UPDATE habits SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": fallback_user_id})
    bind.execute(sa.text("UPDATE activity_feed SET user_id = :user_id WHERE user_id IS NULL"), {"user_id": fallback_user_id})

    with op.batch_alter_table("tasks") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)

    with op.batch_alter_table("habits") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)

    with op.batch_alter_table("activity_feed") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("activity_feed") as batch_op:
        batch_op.drop_constraint("fk_activity_feed_user_id_users", type_="foreignkey")
        batch_op.drop_index("ix_activity_feed_user_id")
        batch_op.drop_column("user_id")

    with op.batch_alter_table("habits") as batch_op:
        batch_op.drop_constraint("fk_habits_user_id_users", type_="foreignkey")
        batch_op.drop_index("ix_habits_user_id")
        batch_op.drop_column("user_id")

    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_constraint("fk_tasks_user_id_users", type_="foreignkey")
        batch_op.drop_index("ix_tasks_user_id")
        batch_op.drop_column("user_id")

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("username", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("password_hash", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("role", sa.String(length=40), nullable=True))

    op.execute("UPDATE users SET username = email, password_hash = hashed_password, role = 'Member'")

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("username", existing_type=sa.String(length=80), nullable=False)
        batch_op.alter_column("password_hash", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("role", existing_type=sa.String(length=40), nullable=False)
        batch_op.drop_index("ix_users_email")
        batch_op.drop_column("email")
        batch_op.drop_column("hashed_password")
        batch_op.drop_column("name")
        batch_op.create_index("ix_users_username", ["username"], unique=True)
