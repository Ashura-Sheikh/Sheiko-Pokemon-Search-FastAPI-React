"""Migrations: they build the same schema as the models, and they upgrade a
database created before migrations existed without losing its data."""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text
from sqlmodel import SQLModel

from app.db import migrate
from app.models import Pokemon, PokemonMove, PokemonType


def engine_for(path):
    return create_engine(f"sqlite:///{path}")


def head_revision(engine) -> str:
    with engine.connect() as c:
        return c.execute(text("select version_num from alembic_version")).scalar_one()


def test_fresh_database_matches_the_models(tmp_path):
    engine = engine_for(tmp_path / "fresh.db")
    migrate(engine)
    assert head_revision(engine) == "0003"
    with engine.connect() as c:
        diff = compare_metadata(MigrationContext.configure(c), SQLModel.metadata)
    assert diff == [], diff  # a model change without a migration fails here


def test_pre_migration_database_is_upgraded_and_keeps_its_data(tmp_path):
    engine = engine_for(tmp_path / "old.db")
    # How the database looked before migrations: only the Pokémon tables.
    SQLModel.metadata.create_all(
        engine,
        tables=[Pokemon.__table__, PokemonType.__table__, PokemonMove.__table__],
    )
    with engine.begin() as c:
        c.execute(
            text("insert into pokemon (id, name, generation) values (25, 'pikachu', 1)")
        )

    migrate(engine)

    assert head_revision(engine) == "0003"
    assert {"app_user", "user_session", "favourite", "comment"} <= set(
        inspect(engine).get_table_names()
    )
    with engine.connect() as c:
        assert c.execute(text("select name from pokemon")).scalars().all() == [
            "pikachu"
        ]


def test_migrate_is_safe_to_run_again(tmp_path):
    engine = engine_for(tmp_path / "twice.db")
    migrate(engine)
    migrate(engine)
    assert head_revision(engine) == "0003"


def test_foreign_keys_are_enforced(tmp_path):
    engine = engine_for(tmp_path / "fk.db")
    migrate(engine)
    with engine.connect() as c:
        assert c.execute(text("PRAGMA foreign_keys")).scalar_one() == 1
