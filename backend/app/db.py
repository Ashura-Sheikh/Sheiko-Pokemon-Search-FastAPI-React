"""Database engine and session setup (SQLite via SQLModel/SQLAlchemy)."""

import os
from collections.abc import Iterator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "pokemon.db"

# Override with e.g. DATABASE_URL=sqlite:////tmp/other.db if needed.
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# check_same_thread=False: FastAPI may use the connection from another thread.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    """Create the data folder and any missing tables. Safe to call repeatedly."""
    from app import models  # noqa: F401  (registers the tables on SQLModel.metadata)

    DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one database session per request."""
    with Session(engine) as session:
        yield session
