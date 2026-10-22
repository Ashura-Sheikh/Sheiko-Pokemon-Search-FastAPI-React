"""Seed-script logic, tested with small hand-made PokeAPI-shaped payloads (no network)."""

import pytest
from sqlmodel import select

from app.models import Pokemon, PokemonType
from scripts.seed_pokemon import (
    check_complete,
    id_from_url,
    parse_generation,
    parse_type,
    write_db,
)

GEN1 = {
    "id": 1,
    "pokemon_species": [
        {"name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon-species/1/"},
        {"name": "charmander", "url": "https://pokeapi.co/api/v2/pokemon-species/4/"},
    ],
}
GRASS = {
    "name": "grass",
    "pokemon": [
        {
            "slot": 1,
            "pokemon": {
                "name": "bulbasaur",
                "url": "https://pokeapi.co/api/v2/pokemon/1/",
            },
        },
        # An alternate form (id > 10000) must be ignored.
        {
            "slot": 1,
            "pokemon": {
                "name": "x-form",
                "url": "https://pokeapi.co/api/v2/pokemon/10033/",
            },
        },
    ],
}
FIRE = {
    "name": "fire",
    "pokemon": [
        {
            "slot": 1,
            "pokemon": {
                "name": "charmander",
                "url": "https://pokeapi.co/api/v2/pokemon/4/",
            },
        },
    ],
}


def test_id_from_url():
    assert id_from_url("https://pokeapi.co/api/v2/pokemon-species/25/") == 25
    with pytest.raises(ValueError):
        id_from_url("https://pokeapi.co/api/v2/pokemon-species/")


def test_parse_generation():
    assert parse_generation(GEN1) == [(1, "bulbasaur", 1), (4, "charmander", 1)]


def test_parse_type_skips_alternate_forms():
    assert parse_type(GRASS, {1, 4}) == [(1, 1, "grass")]


def test_check_complete_rejects_species_without_type():
    species = parse_generation(GEN1)
    with pytest.raises(ValueError, match="no type"):
        check_complete(species, parse_type(GRASS, {1, 4}))
    check_complete(species, parse_type(GRASS, {1, 4}) + parse_type(FIRE, {1, 4}))


def test_check_complete_rejects_duplicates():
    species = parse_generation(GEN1)
    with pytest.raises(ValueError, match="more than one generation"):
        check_complete(
            species + [(1, "bulbasaur", 2)], [(1, 1, "grass"), (4, 1, "fire")]
        )
    with pytest.raises(ValueError, match="same slot"):
        check_complete(species, [(1, 1, "grass"), (1, 1, "poison"), (4, 1, "fire")])


def test_write_db_replaces_existing_rows(session):
    species = parse_generation(GEN1)
    types = parse_type(GRASS, {1, 4}) + parse_type(FIRE, {1, 4})
    write_db(session, species, types)
    write_db(session, species, types)  # re-running must not duplicate anything
    assert [p.name for p in session.exec(select(Pokemon).order_by(Pokemon.id))] == [
        "bulbasaur",
        "charmander",
    ]
    assert len(session.exec(select(PokemonType)).all()) == 2
