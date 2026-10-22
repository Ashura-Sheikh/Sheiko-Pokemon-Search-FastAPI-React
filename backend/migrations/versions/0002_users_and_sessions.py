"""Users and sign-in sessions: app_user, user_session.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "username", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=False
        ),
        sa.Column(
            "password_hash",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=False,
        ),
        sa.Column(
            "nickname", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column(
            "nickname_key", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("app_user") as batch_op:
        batch_op.create_index("ix_app_user_nickname_key", ["nickname_key"], unique=True)
        batch_op.create_index("ix_app_user_username", ["username"], unique=True)

    op.create_table(
        "user_session",
        sa.Column(
            "token_hash", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("expires_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"]),
        sa.PrimaryKeyConstraint("token_hash"),
    )
    with op.batch_alter_table("user_session") as batch_op:
        batch_op.create_index(
            "ix_user_session_expires_at", ["expires_at"], unique=False
        )
        batch_op.create_index("ix_user_session_user_id", ["user_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("user_session") as batch_op:
        batch_op.drop_index("ix_user_session_user_id")
        batch_op.drop_index("ix_user_session_expires_at")
    op.drop_table("user_session")
    with op.batch_alter_table("app_user") as batch_op:
        batch_op.drop_index("ix_app_user_username")
        batch_op.drop_index("ix_app_user_nickname_key")
    op.drop_table("app_user")
