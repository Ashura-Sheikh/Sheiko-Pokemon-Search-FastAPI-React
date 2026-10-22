"""Database tables and API response shapes."""

from sqlmodel import Field, Relationship, SQLModel

SPRITE_URL = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png"
)


class Pokemon(SQLModel, table=True):
    """One row per species. `id` is the National Pokédex number."""

    id: int = Field(primary_key=True)
    name: str = Field(index=True, unique=True, max_length=50)
    generation: int = Field(index=True)

    types: list["PokemonType"] = Relationship(
        back_populates="pokemon",
        sa_relationship_kwargs={"order_by": "PokemonType.slot", "lazy": "selectin"},
    )


class PokemonType(SQLModel, table=True):
    """A Pokémon's type in a given slot (slot 1 = primary, slot 2 = secondary)."""

    __tablename__ = "pokemon_type"

    pokemon_id: int = Field(foreign_key="pokemon.id", primary_key=True)
    slot: int = Field(primary_key=True)
    type_name: str = Field(index=True, max_length=20)

    pokemon: Pokemon = Relationship(back_populates="types")


class PokemonRead(SQLModel):
    id: int
    name: str
    generation: int
    types: list[str]
    sprite_url: str

    @classmethod
    def from_db(cls, pokemon: Pokemon) -> "PokemonRead":
        return cls(
            id=pokemon.id,
            name=pokemon.name,
            generation=pokemon.generation,
            types=[t.type_name for t in pokemon.types],
            sprite_url=SPRITE_URL.format(id=pokemon.id),
        )


class PokemonPage(SQLModel):
    total: int
    limit: int
    offset: int
    items: list[PokemonRead]
