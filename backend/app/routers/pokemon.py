"""Read-only Pokémon search endpoints. Data comes from the local SQLite cache,
filled by scripts/seed_pokemon.py, never from PokeAPI at request time."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func
from sqlmodel import Session, col, select

from app.counts import read_with_counts
from app.db import get_session
from app.models import (
    MoveGroup,
    MoveRead,
    Pokemon,
    PokemonMove,
    PokemonMoves,
    PokemonPage,
    PokemonRead,
    PokemonType,
)

# How move groups are ordered on the page; any other method comes after these.
METHOD_ORDER = ["level-up", "machine", "egg", "tutor"]

router = APIRouter(prefix="/api", tags=["pokemon"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/pokemon", response_model=PokemonPage)
def search_pokemon(
    session: SessionDep,
    q: Annotated[
        str | None,
        Query(
            max_length=50,
            description="Name contains this text, or an exact Pokédex number",
        ),
    ] = None,
    generation: Annotated[int | None, Query(ge=1)] = None,
    type_name: Annotated[str | None, Query(alias="type", max_length=20)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PokemonPage:
    stmt = select(Pokemon)

    if q and q.strip():
        term = q.strip().lower()
        if term.isdigit():
            stmt = stmt.where(Pokemon.id == int(term))
        else:
            # autoescape: a "%" or "_" typed by the user is matched literally.
            stmt = stmt.where(col(Pokemon.name).contains(term, autoescape=True))

    if generation is not None:
        stmt = stmt.where(Pokemon.generation == generation)

    if type_name:
        with_type = select(PokemonType.pokemon_id).where(
            PokemonType.type_name == type_name.strip().lower()
        )
        stmt = stmt.where(col(Pokemon.id).in_(with_type))

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    rows = session.exec(stmt.order_by(Pokemon.id).offset(offset).limit(limit)).all()

    return PokemonPage(
        total=total,
        limit=limit,
        offset=offset,
        items=read_with_counts(session, rows),
    )


@router.get("/pokemon/{pokemon_id}", response_model=PokemonRead)
def get_pokemon(
    session: SessionDep, pokemon_id: Annotated[int, Path(ge=1)]
) -> PokemonRead:
    pokemon = session.get(Pokemon, pokemon_id)
    if pokemon is None:
        raise HTTPException(status_code=404, detail="Pokémon not found")
    return read_with_counts(session, [pokemon])[0]


@router.get("/pokemon/{pokemon_id}/moves", response_model=PokemonMoves)
def get_pokemon_moves(
    session: SessionDep, pokemon_id: Annotated[int, Path(ge=1)]
) -> PokemonMoves:
    """Scarlet/Violet moves, grouped by how they're learned.

    Level-up moves are ordered by level, everything else by name. A Pokémon that
    isn't in Scarlet/Violet returns no groups (not a 404).
    """
    if session.get(Pokemon, pokemon_id) is None:
        raise HTTPException(status_code=404, detail="Pokémon not found")

    rows = session.exec(
        select(PokemonMove).where(PokemonMove.pokemon_id == pokemon_id)
    ).all()

    by_method: dict[str, list[PokemonMove]] = {}
    for row in rows:
        by_method.setdefault(row.method, []).append(row)

    def method_rank(method: str) -> tuple[int, str]:
        known = (
            METHOD_ORDER.index(method) if method in METHOD_ORDER else len(METHOD_ORDER)
        )
        return (known, method)

    groups = []
    for method in sorted(by_method, key=method_rank):
        moves = sorted(by_method[method], key=lambda r: (r.level or 0, r.move_name))
        groups.append(
            MoveGroup(
                method=method,
                moves=[MoveRead(name=r.move_name, level=r.level) for r in moves],
            )
        )
    return PokemonMoves(game="Scarlet/Violet", groups=groups)


@router.get("/types", response_model=list[str])
def list_types(session: SessionDep) -> list[str]:
    stmt = select(PokemonType.type_name).distinct().order_by(PokemonType.type_name)
    return list(session.exec(stmt).all())


@router.get("/generations", response_model=list[int])
def list_generations(session: SessionDep) -> list[int]:
    stmt = select(Pokemon.generation).distinct().order_by(Pokemon.generation)
    return list(session.exec(stmt).all())
