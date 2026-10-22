"""Sign-in building blocks: password hashing, sessions, input rules, abuse limits.

How a session works:
  1. On sign-in the server makes a random token (secrets.token_urlsafe, 256 bits).
  2. The browser gets it in a cookie that JavaScript can't read (HttpOnly) and that
     isn't sent on cross-site requests (SameSite=Lax).
  3. The database stores only the SHA-256 of the token, so a copy of the database
     can't be used to sign in. Signing out deletes the row: the token stops working
     at once, unlike a JWT that stays valid until it expires.
"""

import hashlib
import os
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlmodel import Session, col, delete

from app.db import get_session
from app.models import User, UserSession

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=7)
# Off for local http://. Set COOKIE_SECURE=true when served over HTTPS.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"

# State-changing requests must carry this header. A page on another site can't
# add a custom header to a request here without a CORS preflight, which this API
# never allows, so the header proves the request came from our own frontend.
CSRF_HEADER = "X-Requested-By"
CSRF_VALUE = "pokemon-app"

PASSWORD_MIN, PASSWORD_MAX = 8, 64
USERNAME_RULE = re.compile(r"^[a-z0-9_]{3,30}$")
NICKNAME_RULE = re.compile(r"^[A-Za-z0-9_-]+( [A-Za-z0-9_-]+)*$")
NICKNAME_MIN, NICKNAME_MAX = 3, 20

passwords = PasswordHash.recommended()  # Argon2id
# Checked against when a username doesn't exist, so a wrong username takes as long
# as a wrong password and response time doesn't reveal which usernames exist.
_DUMMY_HASH = passwords.hash("not-a-real-password-just-for-timing")


def utcnow() -> datetime:
    """Current time in UTC, timezone-aware. SQLModel's datetime column type
    (UTCDateTime) refuses naive datetimes and always returns aware UTC ones."""
    return datetime.now(UTC)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# --- Input rules -------------------------------------------------------------


def clean_username(raw: str) -> str:
    username = raw.strip().lower()
    if not USERNAME_RULE.fullmatch(username):
        raise HTTPException(
            422, "Username must be 3–30 characters: lowercase letters, numbers or _"
        )
    return username


def check_password(password: str) -> None:
    # No forced symbols or digits: length matters most (NIST SP 800-63B).
    if not PASSWORD_MIN <= len(password) <= PASSWORD_MAX:
        raise HTTPException(
            422, f"Password must be {PASSWORD_MIN}–{PASSWORD_MAX} characters"
        )


def clean_nickname(raw: str) -> str:
    nickname = " ".join(raw.split())  # trim and collapse inner spaces
    if not (
        NICKNAME_MIN <= len(nickname) <= NICKNAME_MAX
        and NICKNAME_RULE.fullmatch(nickname)
    ):
        raise HTTPException(
            422,
            f"Nickname must be {NICKNAME_MIN}–{NICKNAME_MAX} characters: "
            "letters, numbers, spaces, _ or -",
        )
    return nickname


# --- Passwords ---------------------------------------------------------------


def hash_password(password: str) -> str:
    return passwords.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        passwords.verify(password, _DUMMY_HASH)  # same work, result ignored
        return False
    return passwords.verify(password, password_hash)


# --- Sessions ----------------------------------------------------------------


def start_session(db: Session, response: Response, user_id: int) -> None:
    """Create a session for the user and put its token in the response cookie."""
    now = utcnow()
    db.exec(delete(UserSession).where(col(UserSession.expires_at) < now))
    token = secrets.token_urlsafe(32)
    db.add(
        UserSession(
            token_hash=hash_token(token),
            user_id=user_id,
            created_at=now,
            expires_at=now + SESSION_LIFETIME,
        )
    )
    db.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )


def end_session(db: Session, request: Request, response: Response) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.exec(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
        db.commit()
    response.delete_cookie(
        SESSION_COOKIE, httponly=True, samesite="lax", secure=COOKIE_SECURE, path="/"
    )


def optional_user(
    request: Request, db: Annotated[Session, Depends(get_session)]
) -> User | None:
    """The signed-in user, or None for a guest (or an expired/unknown session)."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    row = db.get(UserSession, hash_token(token))
    if row is None:
        return None
    if row.expires_at <= utcnow():
        db.delete(row)
        db.commit()
        return None
    return db.get(User, row.user_id)


def require_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise HTTPException(401, "Sign in to do this")
    return user


CurrentUser = Annotated[User, Depends(require_user)]
OptionalUser = Annotated[User | None, Depends(optional_user)]


# --- Cross-site request check --------------------------------------------------


def require_same_site(request: Request) -> None:
    """Reject state-changing requests that didn't come from our own frontend."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    if request.headers.get(CSRF_HEADER) != CSRF_VALUE:
        raise HTTPException(403, "Missing request header")
    # Browsers also say where a request came from; refuse anything cross-site.
    site = request.headers.get("Sec-Fetch-Site")
    if site not in (None, "same-origin", "none"):
        raise HTTPException(403, "Cross-site request refused")


# --- Failed sign-in limit ----------------------------------------------------


class LoginLimiter:
    """At most `max_failures` failed sign-ins per username per `window_s` seconds.

    Kept in memory: it resets when the server restarts and isn't shared between
    several server processes. Fine for one process; a shared store (e.g. Redis)
    would be needed to run more.
    """

    def __init__(self, max_failures: int = 5, window_s: float = 60.0) -> None:
        self.max_failures = max_failures
        self.window_s = window_s
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _recent(self, username: str, now: float) -> deque[float]:
        times = self._failures[username]
        while times and now - times[0] > self.window_s:
            times.popleft()
        return times

    def blocked(self, username: str) -> bool:
        with self._lock:
            return len(self._recent(username, time.monotonic())) >= self.max_failures

    def failed(self, username: str) -> None:
        with self._lock:
            now = time.monotonic()
            self._recent(username, now).append(now)

    def succeeded(self, username: str) -> None:
        with self._lock:
            self._failures.pop(username, None)

    def reset(self) -> None:
        with self._lock:
            self._failures.clear()


login_limiter = LoginLimiter()
