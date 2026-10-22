"""Shared test fixtures: an in-memory database with a few known Pokémon.

Tests never touch data/pokemon.db or call PokeAPI.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.app import app
from app.db import get_session
from app.models import Pokemon, PokemonMove, PokemonType

SAMPLE = [
    # (id, name, generation, [types in slot order])
    (1, "bulbasaur", 1, ["grass", "poison"]),
    (4, "charmander", 1, ["fire"]),
    (25, "pikachu", 1, ["electric"]),
    (122, "mr-mime", 1, ["psychic", "fairy"]),
    (152, "chikorita", 2, ["grass"]),
]

# (pokemon id, move, method, level). Inserted out of order on purpose, so the
# API's sorting is what the tests see. Chikorita (152) has none, like a Pokémon
# that isn't in Scarlet/Violet.
SAMPLE_MOVES = [
    (25, "thunderbolt", "level-up", 26),
    # First by name but last by level: catches sorting by name instead of level.
    (25, "agility", "level-up", 30),
    (25, "thunder-shock", "level-up", 1),
    (25, "growl", "level-up", 1),
    (25, "protect", "machine", None),
    (25, "thunderbolt", "machine", None),  # same move, second method
    (25, "charge", "tutor", None),
    (25, "volt-tackle", "egg", None),
    (25, "odd-move", "form-change", None),  # an unexpected method goes last
    (1, "tackle", "level-up", 1),
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
        s.flush()
        for pid, move, method, level in SAMPLE_MOVES:
            s.add(
                PokemonMove(pokemon_id=pid, move_name=move, method=method, level=level)
            )
        s.commit()
        yield s


@pytest.fixture
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()
