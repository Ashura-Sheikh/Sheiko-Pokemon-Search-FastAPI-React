"""Seed-script move logic, tested with a hand-made PokeAPI-shaped payload (no network)."""

import pytest
from sqlmodel import select

from app.models import Pokemon, PokemonMove
from scripts.seed_pokemon import check_moves, parse_moves, trim_pokemon, write_db


def detail(group: str, method: str, level: int = 0) -> dict:
    return {
        "level_learned_at": level,
        "move_learn_method": {"name": method, "url": "x"},
        "version_group": {"name": group, "url": "x"},
    }


PIKACHU = {
    "id": 25,
    "name": "pikachu",
    "height": 4,  # an unused field, to check trim_pokemon drops it
    "moves": [
        # Only in an older game: must be ignored.
        {
            "move": {"name": "old-move", "url": "x"},
            "version_group_details": [detail("sword-shield", "level-up", 5)],
        },
        # In SV and a DLC group at different levels: kept once, lowest level.
        {
            "move": {"name": "thunderbolt", "url": "x"},
            "version_group_details": [
                detail("scarlet-violet", "level-up", 30),
                detail("the-indigo-disk", "level-up", 26),
                detail("scarlet-violet", "machine"),
            ],
        },
        # A TM: level is not meaningful, so it's stored as None.
        {
            "move": {"name": "protect", "url": "x"},
            "version_group_details": [detail("scarlet-violet", "machine")],
        },
        # A partly filled newer game is not part of Scarlet/Violet.
        {
            "move": {"name": "za-move", "url": "x"},
            "version_group_details": [detail("legends-za", "level-up", 1)],
        },
    ],
}


def test_parse_moves_keeps_only_scarlet_violet():
    names = {row[1] for row in parse_moves(PIKACHU)}
    assert names == {"thunderbolt", "protect"}


def test_parse_moves_one_row_per_method_lowest_level():
    rows = sorted(parse_moves(PIKACHU))
    assert rows == [
        (25, "protect", "machine", None),
        (25, "thunderbolt", "level-up", 26),
        (25, "thunderbolt", "machine", None),
    ]


def test_trim_pokemon_keeps_what_parse_moves_needs():
    trimmed = trim_pokemon(PIKACHU)
    assert set(trimmed) == {"id", "name", "moves"}
    assert sorted(parse_moves(trimmed)) == sorted(parse_moves(PIKACHU))


def test_check_moves_counts_pokemon_without_moves():
    assert check_moves(parse_moves(PIKACHU), {25, 718}) == 1  # 718 = Zygarde, none


def test_check_moves_rejects_broken_data():
    with pytest.raises(ValueError, match="No Pokémon has any"):
        check_moves([], {25})
    with pytest.raises(ValueError, match="unknown Pokémon"):
        check_moves([(999, "tackle", "level-up", 1)], {25})
    with pytest.raises(ValueError, match="appears twice"):
        check_moves(
            [(25, "tackle", "level-up", 1), (25, "tackle", "level-up", 5)], {25}
        )


def test_write_db_replaces_moves(session):
    species = [(25, "pikachu", 1)]
    moves = parse_moves(PIKACHU)
    write_db(session, species, [(25, 1, "electric")], moves)
    write_db(session, species, [(25, 1, "electric")], moves)  # re-run: no duplicates
    assert [p.id for p in session.exec(select(Pokemon))] == [25]
    assert len(session.exec(select(PokemonMove)).all()) == 3
