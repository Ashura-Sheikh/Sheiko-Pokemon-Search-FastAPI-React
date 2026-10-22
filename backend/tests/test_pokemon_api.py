def ids(response):
    return [p["id"] for p in response.json()["items"]]


def test_list_all_in_pokedex_order(client):
    r = client.get("/api/pokemon")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 5
    assert ids(r) == [1, 4, 25, 122, 152]


def test_item_shape(client):
    item = client.get("/api/pokemon", params={"q": "bulbasaur"}).json()["items"][0]
    assert item == {
        "id": 1,
        "name": "bulbasaur",
        "generation": 1,
        "types": ["grass", "poison"],
        "sprite_url": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
    }


def test_search_by_partial_name_is_case_insensitive(client):
    assert ids(client.get("/api/pokemon", params={"q": "CHAR"})) == [4]


def test_search_by_pokedex_number(client):
    assert ids(client.get("/api/pokemon", params={"q": "25"})) == [25]


def test_search_wildcards_are_literal(client):
    # "%" would match everything if passed through to SQL LIKE unescaped.
    assert client.get("/api/pokemon", params={"q": "%"}).json()["total"] == 0
    assert client.get("/api/pokemon", params={"q": "_"}).json()["total"] == 0


def test_filter_by_generation(client):
    assert ids(client.get("/api/pokemon", params={"generation": 2})) == [152]


def test_filter_by_type_matches_either_slot(client):
    assert ids(client.get("/api/pokemon", params={"type": "grass"})) == [1, 152]
    assert ids(client.get("/api/pokemon", params={"type": "fairy"})) == [122]


def test_filters_combine(client):
    r = client.get("/api/pokemon", params={"type": "grass", "generation": 1})
    assert ids(r) == [1]


def test_pagination(client):
    r = client.get("/api/pokemon", params={"limit": 2, "offset": 2})
    body = r.json()
    assert body["total"] == 5
    assert (body["limit"], body["offset"]) == (2, 2)
    assert ids(r) == [25, 122]


def test_invalid_query_values_rejected(client):
    assert client.get("/api/pokemon", params={"limit": 0}).status_code == 422
    assert client.get("/api/pokemon", params={"limit": 101}).status_code == 422
    assert client.get("/api/pokemon", params={"offset": -1}).status_code == 422
    assert client.get("/api/pokemon", params={"generation": 0}).status_code == 422
    assert client.get("/api/pokemon", params={"q": "x" * 51}).status_code == 422


def test_get_one(client):
    r = client.get("/api/pokemon/122")
    assert r.status_code == 200
    assert r.json()["types"] == ["psychic", "fairy"]


def test_get_one_not_found(client):
    r = client.get("/api/pokemon/9999")
    assert r.status_code == 404
    assert r.json() == {"detail": "Pokémon not found"}


def test_types_and_generations(client):
    assert client.get("/api/types").json() == [
        "electric",
        "fairy",
        "fire",
        "grass",
        "poison",
        "psychic",
    ]
    assert client.get("/api/generations").json() == [1, 2]


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
