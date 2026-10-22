"""Database tables and API response shapes."""

from datetime import datetime

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


# --- Users and sign-in ------------------------------------------------------


class User(SQLModel, table=True):
    """An account. `username` is private (for signing in); `nickname` is public.

    Both are unique regardless of case: `username` is stored lowercased, and
    `nickname_key` is the lowercased nickname, with a unique index.
    """

    __tablename__ = "app_user"  # "user" is a reserved word in some databases

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=30)
    password_hash: str = Field(max_length=255)
    nickname: str | None = Field(default=None, max_length=20)
    nickname_key: str | None = Field(
        default=None, unique=True, index=True, max_length=20
    )
    created_at: datetime


class UserSession(SQLModel, table=True):
    """A signed-in browser. The cookie holds a random token; only its SHA-256
    hash is stored, so a leaked database can't be used to sign in."""

    __tablename__ = "user_session"

    token_hash: str = Field(primary_key=True, max_length=64)
    user_id: int = Field(foreign_key="app_user.id", index=True)
    created_at: datetime
    expires_at: datetime = Field(index=True)


class Credentials(SQLModel):
    username: str
    password: str


class NicknameUpdate(SQLModel):
    nickname: str


class Me(SQLModel):
    id: int
    username: str
    nickname: str | None


# --- Favourites and comments ---------------------------------------------------

COMMENT_MAX = 500


class Favourite(SQLModel, table=True):
    """A Pokémon on a user's favourites list. One row per (user, Pokémon)."""

    user_id: int = Field(foreign_key="app_user.id", primary_key=True)
    pokemon_id: int = Field(foreign_key="pokemon.id", primary_key=True)
    created_at: datetime


class Comment(SQLModel, table=True):
    """A signed-in user's comment on a Pokémon (any Pokémon, not only favourites)."""

    id: int | None = Field(default=None, primary_key=True)
    pokemon_id: int = Field(foreign_key="pokemon.id", index=True)
    user_id: int = Field(foreign_key="app_user.id", index=True)
    body: str = Field(max_length=COMMENT_MAX)
    created_at: datetime
    updated_at: datetime | None = None  # set when the author edits it


class CommentBody(SQLModel):
    body: str


class CommentRead(SQLModel):
    id: int
    pokemon_id: int
    author: str  # the author's public nickname, never their username
    body: str
    created_at: datetime
    updated_at: datetime | None
    mine: (
        bool  # True if the signed-in user wrote it (so the page can offer edit/delete)
    )
