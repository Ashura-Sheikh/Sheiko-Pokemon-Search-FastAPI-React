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


class PokemonMove(SQLModel, table=True):
    """A move a Pokémon can learn in Scarlet/Violet (including its DLC), and how.

    The same move can be learned more than one way (e.g. level-up and TM), so the
    key is (pokemon, move, method). `level` is only set for level-up moves.
    """

    __tablename__ = "pokemon_move"

    pokemon_id: int = Field(foreign_key="pokemon.id", primary_key=True)
    move_name: str = Field(primary_key=True, max_length=50)
    method: str = Field(primary_key=True, max_length=30)
    level: int | None = None


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


class MoveRead(SQLModel):
    name: str
    level: int | None = None


class MoveGroup(SQLModel):
    method: str  # "level-up", "machine" (TM), "egg", "tutor", ...
    moves: list[MoveRead]


class PokemonMoves(SQLModel):
    game: str
    groups: list[MoveGroup]  # empty if the Pokémon isn't in this game
