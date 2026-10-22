"""Favourites and comments, including who may change what."""

from fastapi.testclient import TestClient
from sqlmodel import select

from app.app import app
from app.models import Comment, Favourite
from scripts.seed_pokemon import write_db


def sign_up(client, username: str, nickname: str | None = None):
    r = client.post(
        "/api/auth/register", json={"username": username, "password": "pikachu123"}
    )
    assert r.status_code == 201, r.text
    if nickname:
        assert client.patch("/api/me", json={"nickname": nickname}).status_code == 200
    return client


def second_user(api, username="misty", nickname="Misty"):
    """Another browser, with its own cookies, sharing the same database."""
    return sign_up(TestClient(app, headers=dict(api.headers)), username, nickname)


# --- Favourites ---------------------------------------------------------------


def test_add_list_and_remove_favourites(api):
    sign_up(api, "ash", "Ash")
    assert api.put("/api/me/favourites/25").status_code == 204
    assert api.put("/api/me/favourites/1").status_code == 204
    assert [p["id"] for p in api.get("/api/me/favourites").json()] == [1, 25]
    assert api.delete("/api/me/favourites/25").status_code == 204
    assert [p["name"] for p in api.get("/api/me/favourites").json()] == ["bulbasaur"]


def test_favourites_are_idempotent(api, session):
    sign_up(api, "ash", "Ash")
    api.put("/api/me/favourites/25")
    api.put("/api/me/favourites/25")
    assert len(session.exec(select(Favourite)).all()) == 1
    assert api.delete("/api/me/favourites/4").status_code == 204  # never added: fine


def test_favourites_are_per_user(api):
    sign_up(api, "ash", "Ash")
    api.put("/api/me/favourites/25")
    misty = second_user(api)
    assert misty.get("/api/me/favourites").json() == []


def test_favourite_unknown_pokemon_is_404(api):
    sign_up(api, "ash", "Ash")
    assert api.put("/api/me/favourites/9999").status_code == 404


def test_guests_have_no_favourites(api):
    assert api.get("/api/me/favourites").status_code == 401
    assert api.put("/api/me/favourites/25").status_code == 401


# --- Comments -----------------------------------------------------------------


def test_anyone_can_read_comments_newest_first(api, client):
    sign_up(api, "ash", "Ash")
    api.post("/api/pokemon/25/comments", json={"body": "First!"})
    api.post("/api/pokemon/25/comments", json={"body": "Second"})
    r = client.get("/api/pokemon/25/comments")  # a guest
    assert r.status_code == 200
    comments = r.json()
    assert [c["body"] for c in comments] == ["Second", "First!"]
    assert {c["author"] for c in comments} == {"Ash"}
    assert all(c["mine"] is False for c in comments)  # guest owns nothing


def test_comment_on_any_pokemon_not_only_favourites(api):
    sign_up(api, "ash", "Ash")
    r = api.post("/api/pokemon/4/comments", json={"body": "  Nice flame  "})
    assert r.status_code == 201
    body = r.json()
    assert body["body"] == "Nice flame"  # trimmed
    assert body["mine"] is True
    assert body["author"] == "Ash"
    assert body["updated_at"] is None


def test_comments_show_nickname_never_username(api):
    sign_up(api, "ash_private_login", "Ash")
    api.post("/api/pokemon/25/comments", json={"body": "hi"})
    text = api.get("/api/pokemon/25/comments").text
    assert "Ash" in text
    assert "ash_private_login" not in text


def test_commenting_needs_a_nickname(api):
    sign_up(api, "ash")  # no nickname yet
    r = api.post("/api/pokemon/25/comments", json={"body": "hi"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Choose a nickname before commenting"


def test_guests_cannot_comment(api):
    assert api.post("/api/pokemon/25/comments", json={"body": "hi"}).status_code == 401


def test_comment_length_rules(api):
    sign_up(api, "ash", "Ash")
    assert api.post("/api/pokemon/25/comments", json={"body": "   "}).status_code == 422
    too_long = "x" * 501
    assert (
        api.post("/api/pokemon/25/comments", json={"body": too_long}).status_code == 422
    )
    assert (
        api.post("/api/pokemon/25/comments", json={"body": "x" * 500}).status_code
        == 201
    )


def test_comment_on_unknown_pokemon_is_404(api):
    sign_up(api, "ash", "Ash")
    assert (
        api.post("/api/pokemon/9999/comments", json={"body": "hi"}).status_code == 404
    )
    assert api.get("/api/pokemon/9999/comments").status_code == 404


def test_html_is_stored_as_plain_text(api):
    sign_up(api, "ash", "Ash")
    api.post("/api/pokemon/25/comments", json={"body": "<script>alert(1)</script>"})
    assert api.get("/api/pokemon/25/comments").json()[0]["body"] == (
        "<script>alert(1)</script>"  # returned as data; the frontend shows it as text
    )


def test_author_can_edit_and_delete(api, session):
    sign_up(api, "ash", "Ash")
    cid = api.post("/api/pokemon/25/comments", json={"body": "typo"}).json()["id"]
    r = api.patch(f"/api/comments/{cid}", json={"body": "fixed"})
    assert r.status_code == 200
    assert r.json()["body"] == "fixed"
    assert r.json()["updated_at"] is not None
    assert api.delete(f"/api/comments/{cid}").status_code == 204
    assert session.exec(select(Comment)).all() == []


def test_others_cannot_edit_or_delete(api, session):
    sign_up(api, "ash", "Ash")
    cid = api.post("/api/pokemon/25/comments", json={"body": "mine"}).json()["id"]
    misty = second_user(api)
    assert (
        misty.patch(f"/api/comments/{cid}", json={"body": "hacked"}).status_code == 403
    )
    assert misty.delete(f"/api/comments/{cid}").status_code == 403
    assert session.get(Comment, cid).body == "mine"
    # And Misty sees it as not hers.
    assert misty.get("/api/pokemon/25/comments").json()[0]["mine"] is False


def test_edit_missing_comment_is_404(api):
    sign_up(api, "ash", "Ash")
    assert api.patch("/api/comments/999", json={"body": "x"}).status_code == 404


def test_changes_need_the_cross_site_header(api):
    sign_up(api, "ash", "Ash")
    r = api.post(
        "/api/pokemon/25/comments", json={"body": "hi"}, headers={"X-Requested-By": ""}
    )
    assert r.status_code == 403


# --- Re-seeding keeps user data ------------------------------------------------


def test_reseeding_keeps_favourites_and_comments(api, session):
    sign_up(api, "ash", "Ash")
    api.put("/api/me/favourites/25")
    api.post("/api/pokemon/25/comments", json={"body": "keep me"})
    write_db(session, [(25, "pikachu", 1)], [(25, 1, "electric")], [])
    assert [p["id"] for p in api.get("/api/me/favourites").json()] == [25]
    assert api.get("/api/pokemon/25/comments").json()[0]["body"] == "keep me"
