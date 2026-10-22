"""Favourites (a signed-in user's own list) and comments (public, on any Pokémon).

Reading comments is open to everyone. Writing needs a signed-in user with a
nickname, since comments are shown by nickname. Only the author can edit or
delete their own comment.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlmodel import Session, col, select

from app.auth import CurrentUser, OptionalUser, require_same_site, utcnow
from app.db import get_session
from app.models import (
    COMMENT_MAX,
    Comment,
    CommentBody,
    CommentRead,
    Favourite,
    Pokemon,
    PokemonRead,
    User,
)

router = APIRouter(
    prefix="/api", tags=["social"], dependencies=[Depends(require_same_site)]
)

SessionDep = Annotated[Session, Depends(get_session)]
PokemonId = Annotated[int, Path(ge=1)]


def pokemon_or_404(db: Session, pokemon_id: int) -> Pokemon:
    pokemon = db.get(Pokemon, pokemon_id)
    if pokemon is None:
        raise HTTPException(404, "Pokémon not found")
    return pokemon


# --- Favourites ---------------------------------------------------------------


@router.get("/me/favourites", response_model=list[PokemonRead])
def list_favourites(user: CurrentUser, db: SessionDep) -> list[PokemonRead]:
    stmt = (
        select(Pokemon)
        .join(Favourite, col(Favourite.pokemon_id) == col(Pokemon.id))
        .where(Favourite.user_id == user.id)
        .order_by(Pokemon.id)
    )
    return [PokemonRead.from_db(p) for p in db.exec(stmt).all()]


@router.put("/me/favourites/{pokemon_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_favourite(pokemon_id: PokemonId, user: CurrentUser, db: SessionDep) -> Response:
    """Idempotent: adding a favourite twice is fine (PUT, not POST)."""
    pokemon_or_404(db, pokemon_id)
    assert user.id is not None
    if db.get(Favourite, (user.id, pokemon_id)) is None:
        db.add(Favourite(user_id=user.id, pokemon_id=pokemon_id, created_at=utcnow()))
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/me/favourites/{pokemon_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favourite(
    pokemon_id: PokemonId, user: CurrentUser, db: SessionDep
) -> Response:
    """Idempotent: removing one that isn't there is fine."""
    row = db.get(Favourite, (user.id, pokemon_id))
    if row is not None:
        db.delete(row)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Comments -----------------------------------------------------------------


def clean_body(raw: str) -> str:
    body = raw.strip()
    if not 1 <= len(body) <= COMMENT_MAX:
        raise HTTPException(422, f"A comment must be 1–{COMMENT_MAX} characters")
    return body


def to_read(comment: Comment, author: User, viewer: User | None) -> CommentRead:
    assert comment.id is not None
    return CommentRead(
        id=comment.id,
        pokemon_id=comment.pokemon_id,
        author=author.nickname or "Unknown trainer",
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        mine=viewer is not None and viewer.id == comment.user_id,
    )


def own_comment_or_error(db: Session, comment_id: int, user: User) -> Comment:
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(404, "Comment not found")
    if comment.user_id != user.id:
        raise HTTPException(403, "You can only change your own comments")
    return comment


@router.get("/pokemon/{pokemon_id}/comments", response_model=list[CommentRead])
def list_comments(
    pokemon_id: PokemonId, viewer: OptionalUser, db: SessionDep
) -> list[CommentRead]:
    """Newest first. Open to guests; `mine` marks the viewer's own comments."""
    pokemon_or_404(db, pokemon_id)
    stmt = (
        select(Comment, User)
        .join(User, col(User.id) == col(Comment.user_id))
        .where(Comment.pokemon_id == pokemon_id)
        .order_by(col(Comment.created_at).desc(), col(Comment.id).desc())
    )
    return [to_read(c, author, viewer) for c, author in db.exec(stmt).all()]


@router.post(
    "/pokemon/{pokemon_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    pokemon_id: PokemonId, body: CommentBody, user: CurrentUser, db: SessionDep
) -> CommentRead:
    pokemon_or_404(db, pokemon_id)
    if not user.nickname:
        raise HTTPException(403, "Choose a nickname before commenting")
    assert user.id is not None
    comment = Comment(
        pokemon_id=pokemon_id,
        user_id=user.id,
        body=clean_body(body.body),
        created_at=utcnow(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return to_read(comment, user, user)


@router.patch("/comments/{comment_id}", response_model=CommentRead)
def edit_comment(
    comment_id: Annotated[int, Path(ge=1)],
    body: CommentBody,
    user: CurrentUser,
    db: SessionDep,
) -> CommentRead:
    comment = own_comment_or_error(db, comment_id, user)
    comment.body = clean_body(body.body)
    comment.updated_at = utcnow()
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return to_read(comment, user, user)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: Annotated[int, Path(ge=1)], user: CurrentUser, db: SessionDep
) -> Response:
    comment = own_comment_or_error(db, comment_id, user)
    db.delete(comment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
