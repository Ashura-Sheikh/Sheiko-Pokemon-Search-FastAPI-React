"""Database engine, session setup and schema migrations (SQLite via SQLModel)."""

import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import event, inspect
from sqlalchemy.engine import Engine
from sqlmodel import Session, create_engine

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "pokemon.db"
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"

# Override with e.g. DATABASE_URL=sqlite:////tmp/other.db if needed.
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# check_same_thread=False: FastAPI may use the connection from another thread.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(Engine, "connect")
def _sqlite_foreign_keys(dbapi_connection, _record) -> None:
    """SQLite ignores foreign keys unless each connection switches them on."""
    if type(dbapi_connection).__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def migrate(target_engine: Engine = engine) -> None:
    """Bring the database schema up to date with the migrations in migrations/.

    A database created before migrations existed already has the Pokémon tables
    but no alembic_version table: it's marked as revision 0001 (those tables)
    and then upgraded, so its seeded data is kept.
    """
    from alembic import command
    from alembic.config import Config

    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    with target_engine.begin() as connection:
        config.attributes["connection"] = connection
        tables = set(inspect(connection).get_table_names())
        if "pokemon" in tables and "alembic_version" not in tables:
            command.stamp(config, "0001")
        command.upgrade(config, "head")


def init_db() -> None:
    """Create the data folder and run any pending migrations. Safe to repeat."""
    DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    migrate()


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one database session per request."""
    with Session(engine) as session:
        yield session
