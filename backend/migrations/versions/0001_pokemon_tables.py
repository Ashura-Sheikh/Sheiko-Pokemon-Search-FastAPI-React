"""Pokémon tables: pokemon, pokemon_type, pokemon_move.

These already existed before migrations were added (created by
SQLModel.metadata.create_all). init_db() marks such a database as being at this
revision instead of re-creating them, so seeded data is kept.

Revision ID: 0001
Revises:
Create Date: 2026-10-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pokemon",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("pokemon") as batch_op:
        batch_op.create_index("ix_pokemon_generation", ["generation"], unique=False)
        batch_op.create_index("ix_pokemon_name", ["name"], unique=True)

    op.create_table(
        "pokemon_type",
        sa.Column("pokemon_id", sa.Integer(), nullable=False),
        sa.Column("slot", sa.Integer(), nullable=False),
        sa.Column(
            "type_name", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False
        ),
        sa.ForeignKeyConstraint(["pokemon_id"], ["pokemon.id"]),
        sa.PrimaryKeyConstraint("pokemon_id", "slot"),
    )
    with op.batch_alter_table("pokemon_type") as batch_op:
        batch_op.create_index("ix_pokemon_type_type_name", ["type_name"], unique=False)

    op.create_table(
        "pokemon_move",
        sa.Column("pokemon_id", sa.Integer(), nullable=False),
        sa.Column(
            "move_name", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False
        ),
        sa.Column(
            "method", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=False
        ),
        sa.Column("level", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["pokemon_id"], ["pokemon.id"]),
        sa.PrimaryKeyConstraint("pokemon_id", "move_name", "method"),
    )


def downgrade() -> None:
    op.drop_table("pokemon_move")
    with op.batch_alter_table("pokemon_type") as batch_op:
        batch_op.drop_index("ix_pokemon_type_type_name")
    op.drop_table("pokemon_type")
    with op.batch_alter_table("pokemon") as batch_op:
        batch_op.drop_index("ix_pokemon_name")
        batch_op.drop_index("ix_pokemon_generation")
    op.drop_table("pokemon")
