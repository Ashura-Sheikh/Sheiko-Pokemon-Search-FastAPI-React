"""Sign-in, sign-out, sessions and nicknames, including the security rules."""

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import select

from app.app import app
from app.auth import SESSION_COOKIE, hash_token, utcnow
from app.models import User, UserSession

GOOD = {"username": "ash", "password": "pikachu123"}


def register(api, **overrides):
    return api.post("/api/auth/register", json={**GOOD, **overrides})


# --- Register ------------------------------------------------------------------


def test_register_signs_in_and_returns_me(api):
    r = register(api)
    assert r.status_code == 201
    assert r.json() == {"id": 1, "username": "ash", "nickname": None}
    assert api.get("/api/me").json()["username"] == "ash"


def test_session_cookie_is_httponly_samesite_and_site_wide(api):
    cookie = register(api).headers["set-cookie"].lower()
    assert cookie.startswith(f"{SESSION_COOKIE}=")
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/" in cookie


def test_username_is_case_insensitive_and_unique(api):
    assert register(api, username="Ash").json()["username"] == "ash"
    r = register(api, username="ASH")
    assert r.status_code == 409
    assert r.json()["detail"] == "That username is taken"


def test_register_rejects_bad_input(api):
    assert register(api, username="ab").status_code == 422  # too short
    assert register(api, username="a b c").status_code == 422  # space
    assert register(api, username="a" * 31).status_code == 422
    assert register(api, password="short").status_code == 422  # under 8
    assert register(api, password="x" * 65).status_code == 422  # over 64
    assert register(api, password="x" * 64).status_code == 201  # 64 is fine


def test_password_is_stored_as_argon2_hash_not_plaintext(api, session):
    register(api)
    user = session.exec(select(User)).one()
    assert user.password_hash.startswith("$argon2id$")
    assert GOOD["password"] not in user.password_hash


def test_session_token_is_stored_only_as_a_hash(api, session):
    register(api)
    token = api.cookies[SESSION_COOKIE]
    rows = session.exec(select(UserSession)).all()
    assert [r.token_hash for r in rows] == [hash_token(token)]
    assert token not in {r.token_hash for r in rows}


# --- Sign in / out ---------------------------------------------------------------


def test_login_with_correct_password(api, session):
    register(api)
    api.cookies.clear()
    r = api.post(
        "/api/auth/login", json={"username": "ASH", "password": GOOD["password"]}
    )
    assert r.status_code == 200
    assert api.get("/api/me").status_code == 200


def test_wrong_password_and_unknown_user_get_the_same_answer(api):
    register(api)
    api.cookies.clear()
    wrong = api.post(
        "/api/auth/login", json={"username": "ash", "password": "nope-nope"}
    )
    unknown = api.post(
        "/api/auth/login", json={"username": "misty", "password": "x" * 8}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert (
        wrong.json() == unknown.json() == {"detail": "Incorrect username or password"}
    )
    assert SESSION_COOKIE not in api.cookies


def test_logout_ends_the_session_on_the_server(api, session):
    register(api)
    token = api.cookies[SESSION_COOKIE]
    assert api.post("/api/auth/logout").status_code == 204
    assert session.exec(select(UserSession)).all() == []
    # Even if the browser kept the old cookie, it no longer works.
    api.cookies.set(SESSION_COOKIE, token)
    assert api.get("/api/me").status_code == 401


def test_expired_session_is_refused_and_removed(api, session):
    register(api)
    row = session.exec(select(UserSession)).one()
    row.expires_at = utcnow() - timedelta(seconds=1)
    session.add(row)
    session.commit()
    assert api.get("/api/me").status_code == 401
    assert session.exec(select(UserSession)).all() == []


def test_made_up_cookie_is_refused(api):
    api.cookies.set(SESSION_COOKIE, "not-a-real-token")
    assert api.get("/api/me").status_code == 401


def test_guest_gets_401_for_me(api):
    r = api.get("/api/me")
    assert r.status_code == 401
    assert r.json() == {"detail": "Sign in to do this"}


# --- Failed sign-in limit ---------------------------------------------------------


def test_five_failures_lock_the_username_for_a_while(api):
    register(api)
    api.cookies.clear()
    bad = {"username": "ash", "password": "wrong-pass"}
    for _ in range(5):
        assert api.post("/api/auth/login", json=bad).status_code == 401
    # Now even the right password is refused for this username...
    r = api.post("/api/auth/login", json=GOOD)
    assert r.status_code == 429
    # ...but other usernames are unaffected.
    assert (
        api.post("/api/auth/login", json={**bad, "username": "misty"}).status_code
        == 401
    )


def test_success_clears_earlier_failures(api):
    register(api)
    api.cookies.clear()
    bad = {"username": "ash", "password": "wrong-pass"}
    for _ in range(4):
        api.post("/api/auth/login", json=bad)
    assert api.post("/api/auth/login", json=GOOD).status_code == 200
    for _ in range(4):
        api.post("/api/auth/login", json=bad)
    assert api.post("/api/auth/login", json=GOOD).status_code == 200


# --- Cross-site request check -------------------------------------------------------


def test_change_requests_need_the_frontend_header(session):
    from app.db import get_session

    app.dependency_overrides[get_session] = lambda: session
    try:
        plain = TestClient(app)  # no X-Requested-By header, like a form on another site
        r = plain.post("/api/auth/register", json=GOOD)
        assert r.status_code == 403
        assert session.exec(select(User)).all() == []
        assert plain.get("/api/me").status_code == 401  # reads don't need it
    finally:
        app.dependency_overrides.clear()


def test_cross_site_requests_are_refused_even_with_the_header(api):
    r = api.post(
        "/api/auth/register", json=GOOD, headers={"Sec-Fetch-Site": "cross-site"}
    )
    assert r.status_code == 403
    ok = api.post(
        "/api/auth/register", json=GOOD, headers={"Sec-Fetch-Site": "same-origin"}
    )
    assert ok.status_code == 201


# --- Nickname ---------------------------------------------------------------------


def test_set_nickname(api):
    register(api)
    r = api.patch("/api/me", json={"nickname": "  Ash   Ketchum "})
    assert r.status_code == 200
    assert r.json()["nickname"] == "Ash Ketchum"  # trimmed, inner spaces collapsed
    assert api.get("/api/me").json()["nickname"] == "Ash Ketchum"


def test_nickname_must_be_unique_ignoring_case(api):
    register(api)
    api.patch("/api/me", json={"nickname": "Champion"})
    other = TestClient(app, headers=dict(api.headers))
    register(other, username="misty")
    r = other.patch("/api/me", json={"nickname": "CHAMPION"})
    assert r.status_code == 409
    assert r.json()["detail"] == "That nickname is taken"


def test_user_can_keep_or_recase_their_own_nickname(api):
    register(api)
    api.patch("/api/me", json={"nickname": "Champion"})
    assert api.patch("/api/me", json={"nickname": "CHAMPION"}).status_code == 200


def test_nickname_rules(api):
    register(api)
    for bad in ["ab", "x" * 21, "<script>", "bad!name", "   "]:
        assert api.patch("/api/me", json={"nickname": bad}).status_code == 422, bad
    assert api.patch("/api/me", json={"nickname": "Red_Blue-99"}).status_code == 200


def test_guest_cannot_set_a_nickname(api):
    assert api.patch("/api/me", json={"nickname": "Champion"}).status_code == 401
