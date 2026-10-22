"""Favourite and comment counts for a list of Pokémon, shown as pills in the UI."""

from collections.abc import Sequence

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.models import Comment, Favourite, Pokemon, PokemonRead


def _count_by_pokemon(db: Session, model, ids: list[int]) -> dict[int, int]:
    """{pokemon_id: number of rows} in one grouped query (no query per Pokémon)."""
    if not ids:
        return {}
    stmt = (
        select(model.pokemon_id, func.count())
        .where(col(model.pokemon_id).in_(ids))
        .group_by(model.pokemon_id)
    )
    return dict(db.exec(stmt).all())


def read_with_counts(db: Session, pokemons: Sequence[Pokemon]) -> list[PokemonRead]:
    ids = [p.id for p in pokemons]
    favourites = _count_by_pokemon(db, Favourite, ids)
    comments = _count_by_pokemon(db, Comment, ids)
    return [
        PokemonRead.from_db(p, favourites.get(p.id, 0), comments.get(p.id, 0))
        for p in pokemons
    ]
