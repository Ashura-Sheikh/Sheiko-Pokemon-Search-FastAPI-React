"""Shared test fixtures: an in-memory database with a few known Pokémon.

Tests never touch data/pokemon.db or call PokeAPI.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.app import app
from app.db import get_session
from app.models import Pokemon, PokemonType

SAMPLE = [
    # (id, name, generation, [types in slot order])
    (1, "bulbasaur", 1, ["grass", "poison"]),
    (4, "charmander", 1, ["fire"]),
    (25, "pikachu", 1, ["electric"]),
    (122, "mr-mime", 1, ["psychic", "fairy"]),
    (152, "chikorita", 2, ["grass"]),
]


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        for pid, name, gen, types in SAMPLE:
            s.add(Pokemon(id=pid, name=name, generation=gen))
            for slot, type_name in enumerate(types, start=1):
                s.add(PokemonType(pokemon_id=pid, slot=slot, type_name=type_name))
        s.commit()
        yield s


@pytest.fixture
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()
