"""Favourite and comment counts on Pokémon responses (shown as pills in the UI)."""

from fastapi.testclient import TestClient

from app.app import app


def user(api, username: str, nickname: str):
    c = TestClient(app, headers=dict(api.headers))
    c.post("/api/auth/register", json={"username": username, "password": "pikachu123"})
    c.patch("/api/me", json={"nickname": nickname})
    return c


def counts(item: dict) -> tuple[int, int]:
    return item["favourite_count"], item["comment_count"]


def test_counts_start_at_zero(client):
    assert counts(client.get("/api/pokemon/25").json()) == (0, 0)


def test_counts_across_users_on_detail_search_and_favourites(api, client):
    ash, misty = user(api, "ash", "Ash"), user(api, "misty", "Misty")
    ash.put("/api/me/favourites/25")
    misty.put("/api/me/favourites/25")
    misty.put("/api/me/favourites/1")
    ash.post("/api/pokemon/25/comments", json={"body": "one"})
    ash.post("/api/pokemon/25/comments", json={"body": "two"})
    misty.post("/api/pokemon/25/comments", json={"body": "three"})

    # Detail page (seen by a guest: counts are public)
    assert counts(client.get("/api/pokemon/25").json()) == (2, 3)
    # Search results: each item gets its own counts
    items = {p["id"]: counts(p) for p in client.get("/api/pokemon").json()["items"]}
    assert items[25] == (2, 3)
    assert items[1] == (1, 0)
    assert items[4] == (0, 0)
    # My favourites
    assert {p["id"]: counts(p) for p in misty.get("/api/me/favourites").json()} == {
        1: (1, 0),
        25: (2, 3),
    }


def test_counts_go_down_when_removed(api, client):
    ash = user(api, "ash", "Ash")
    ash.put("/api/me/favourites/25")
    cid = ash.post("/api/pokemon/25/comments", json={"body": "bye"}).json()["id"]
    ash.delete("/api/me/favourites/25")
    ash.delete(f"/api/comments/{cid}")
    assert counts(client.get("/api/pokemon/25").json()) == (0, 0)


def test_favouriting_twice_counts_once(api, client):
    ash = user(api, "ash", "Ash")
    ash.put("/api/me/favourites/25")
    ash.put("/api/me/favourites/25")
    assert counts(client.get("/api/pokemon/25").json()) == (1, 0)
