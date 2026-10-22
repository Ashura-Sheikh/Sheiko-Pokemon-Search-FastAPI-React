"""Alembic environment: uses the app's own engine settings and table definitions.

Run from backend/:  uv run alembic upgrade head
(The app also upgrades automatically on startup; see app/db.py init_db.)
New migration after changing app/models.py (with the backend server stopped):
    uv run alembic revision --autogenerate -m "what changed"
    uvx ruff@0.17.1 check --fix migrations && uvx ruff@0.17.1 format migrations
then read the generated file before committing it. The tests fail if the models
and migrations disagree (tests/test_migrations.py).
"""

from alembic import context
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

from app import models  # noqa: F401  (registers every table on SQLModel.metadata)
from app.db import DATABASE_URL

config = context.config
target_metadata = SQLModel.metadata


def _url() -> str:
    return config.get_main_option("sqlalchemy.url") or DATABASE_URL


def run_migrations_offline() -> None:
    context.configure(
        url=_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # SQLite can't ALTER most things; batch mode copies the table
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:  # passed in by init_db() with an open connection
        _run(connection)
        return
    engine = create_engine(_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        _run(connection)


def _run(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
