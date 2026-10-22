"""Read-only Pokémon search endpoints. Data comes from the local SQLite cache,
filled by scripts/seed_pokemon.py, never from PokeAPI at request time."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func
from sqlmodel import Session, col, select

from app.db import get_session
from app.models import Pokemon, PokemonPage, PokemonRead, PokemonType

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
        items=[PokemonRead.from_db(p) for p in rows],
    )


@router.get("/pokemon/{pokemon_id}", response_model=PokemonRead)
def get_pokemon(
    session: SessionDep, pokemon_id: Annotated[int, Path(ge=1)]
) -> PokemonRead:
    pokemon = session.get(Pokemon, pokemon_id)
    if pokemon is None:
        raise HTTPException(status_code=404, detail="Pokémon not found")
    return PokemonRead.from_db(pokemon)


@router.get("/types", response_model=list[str])
def list_types(session: SessionDep) -> list[str]:
    stmt = select(PokemonType.type_name).distinct().order_by(PokemonType.type_name)
    return list(session.exec(stmt).all())


@router.get("/generations", response_model=list[int])
def list_generations(session: SessionDep) -> list[int]:
    stmt = select(Pokemon.generation).distinct().order_by(Pokemon.generation)
    return list(session.exec(stmt).all())
