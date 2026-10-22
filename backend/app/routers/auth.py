"""Register, sign in, sign out, and the signed-in user's own profile."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.auth import (
    CurrentUser,
    check_password,
    clean_nickname,
    clean_username,
    end_session,
    hash_password,
    login_limiter,
    require_same_site,
    start_session,
    utcnow,
    verify_password,
)
from app.db import get_session
from app.models import Credentials, Me, NicknameUpdate, User

router = APIRouter(
    prefix="/api", tags=["auth"], dependencies=[Depends(require_same_site)]
)

SessionDep = Annotated[Session, Depends(get_session)]


def to_me(user: User) -> Me:
    assert user.id is not None
    return Me(id=user.id, username=user.username, nickname=user.nickname)


@router.post("/auth/register", response_model=Me, status_code=status.HTTP_201_CREATED)
def register(body: Credentials, response: Response, db: SessionDep) -> Me:
    username = clean_username(body.username)
    check_password(body.password)
    if db.exec(select(User).where(User.username == username)).first():
        raise HTTPException(409, "That username is taken")
    user = User(
        username=username,
        password_hash=hash_password(body.password),
        created_at=utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.id is not None
    start_session(db, response, user.id)
    return to_me(user)


@router.post("/auth/login", response_model=Me)
def login(body: Credentials, response: Response, db: SessionDep) -> Me:
    username = body.username.strip().lower()
    if login_limiter.blocked(username):
        raise HTTPException(429, "Too many failed attempts. Try again in a minute.")
    user = db.exec(select(User).where(User.username == username)).first()
    if not verify_password(body.password, user.password_hash if user else None):
        login_limiter.failed(username)
        # Same message either way, so it doesn't reveal which usernames exist.
        raise HTTPException(401, "Incorrect username or password")
    assert user is not None and user.id is not None
    login_limiter.succeeded(username)
    start_session(db, response, user.id)
    return to_me(user)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: SessionDep) -> None:
    end_session(db, request, response)


@router.get("/me", response_model=Me)
def me(user: CurrentUser) -> Me:
    return to_me(user)


@router.patch("/me", response_model=Me)
def update_me(body: NicknameUpdate, user: CurrentUser, db: SessionDep) -> Me:
    nickname = clean_nickname(body.nickname)
    key = nickname.lower()
    taken = db.exec(select(User).where(User.nickname_key == key)).first()
    if taken is not None and taken.id != user.id:
        raise HTTPException(409, "That nickname is taken")
    user.nickname = nickname
    user.nickname_key = key
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_me(user)
