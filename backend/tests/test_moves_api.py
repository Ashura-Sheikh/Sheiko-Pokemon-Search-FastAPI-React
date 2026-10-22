def test_moves_grouped_in_method_order(client):
    r = client.get("/api/pokemon/25/moves")
    assert r.status_code == 200
    body = r.json()
    assert body["game"] == "Scarlet/Violet"
    assert [g["method"] for g in body["groups"]] == [
        "level-up",
        "machine",
        "egg",
        "tutor",
        "form-change",  # unknown methods come after the known ones
    ]


def test_level_up_sorted_by_level_then_name(client):
    groups = client.get("/api/pokemon/25/moves").json()["groups"]
    level_up = groups[0]["moves"]
    assert level_up == [
        {"name": "growl", "level": 1},
        {"name": "thunder-shock", "level": 1},
        {"name": "thunderbolt", "level": 26},
        {"name": "agility", "level": 30},
    ]


def test_other_methods_sorted_by_name_without_level(client):
    groups = {
        g["method"]: g["moves"]
        for g in client.get("/api/pokemon/25/moves").json()["groups"]
    }
    assert groups["machine"] == [
        {"name": "protect", "level": None},
        {"name": "thunderbolt", "level": None},
    ]


def test_same_move_can_appear_under_two_methods(client):
    groups = {
        g["method"]: g["moves"]
        for g in client.get("/api/pokemon/25/moves").json()["groups"]
    }
    assert "thunderbolt" in [m["name"] for m in groups["level-up"]]
    assert "thunderbolt" in [m["name"] for m in groups["machine"]]


def test_moves_are_only_for_the_requested_pokemon(client):
    groups = client.get("/api/pokemon/1/moves").json()["groups"]
    assert groups == [{"method": "level-up", "moves": [{"name": "tackle", "level": 1}]}]


def test_pokemon_without_moves_returns_no_groups(client):
    r = client.get("/api/pokemon/152/moves")
    assert r.status_code == 200
    assert r.json() == {"game": "Scarlet/Violet", "groups": []}


def test_unknown_pokemon_is_404(client):
    r = client.get("/api/pokemon/9999/moves")
    assert r.status_code == 404
    assert r.json() == {"detail": "Pokémon not found"}


def test_invalid_id_rejected(client):
    assert client.get("/api/pokemon/0/moves").status_code == 422
