"""Fill the local SQLite database with every Pokémon species from PokeAPI.

Run from backend/:  uv run python -m scripts.seed_pokemon
Add --refresh to ignore the local cache and download again.

About 30 requests in total: one per generation (name, number, generation) and
one per type (types and slots). Responses are cached in data/cache/, following
PokeAPI's fair-use policy ("Locally cache resources whenever you request them").
The API itself never calls PokeAPI; it only reads the database this script fills.
"""

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

from sqlmodel import Session, delete

from app.db import BACKEND_DIR, engine, init_db
from app.models import Pokemon, PokemonType

API = "https://pokeapi.co/api/v2"
CACHE_DIR = BACKEND_DIR / "data" / "cache"
USER_AGENT = "GitHub-Python-FastAPI-pokemon-app/0.1 (personal project)"
ID_FROM_URL = re.compile(r"/(\d+)/?$")


def id_from_url(url: str) -> int:
    match = ID_FROM_URL.search(url)
    if not match:
        raise ValueError(f"No numeric id at the end of {url!r}")
    return int(match.group(1))


def fetch_json(url: str, cache_dir: Path, refresh: bool = False) -> dict:
    """GET a PokeAPI URL, reusing a cached copy unless refresh is True."""
    cache_file = cache_dir / (
        url.removeprefix(API).strip("/").replace("/", "_") + ".json"
    )
    if cache_file.exists() and not refresh:
        return json.loads(cache_file.read_text())
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(data))
    return data


def parse_generation(data: dict) -> list[tuple[int, str, int]]:
    """(pokedex number, name, generation) for every species in one generation."""
    generation = data["id"]
    return [
        (id_from_url(s["url"]), s["name"], generation) for s in data["pokemon_species"]
    ]


def parse_type(data: dict, species_ids: set[int]) -> list[tuple[int, int, str]]:
    """(pokedex number, slot, type) for default forms only.

    A type lists alternate forms too (ids above 10000); a species' default form
    has the same id as the species, so anything not in species_ids is skipped.
    """
    rows = []
    for entry in data["pokemon"]:
        pokemon_id = id_from_url(entry["pokemon"]["url"])
        if pokemon_id in species_ids:
            rows.append((pokemon_id, entry["slot"], data["name"]))
    return rows


def check_complete(
    species: list[tuple[int, str, int]], types: list[tuple[int, int, str]]
) -> None:
    """Fail loudly rather than save a database with gaps."""
    ids = [s[0] for s in species]
    if len(ids) != len(set(ids)):
        raise ValueError("A Pokédex number appears in more than one generation")
    typed = {t[0] for t in types}
    missing = sorted(set(ids) - typed)
    if missing:
        raise ValueError(f"{len(missing)} species have no type, e.g. {missing[:5]}")
    if len(types) != len({(t[0], t[1]) for t in types}):
        raise ValueError("A Pokémon has two types in the same slot")


def write_db(session: Session, species, types) -> None:
    """Replace the Pokémon tables' contents in one transaction (safe to re-run)."""
    session.exec(delete(PokemonType))
    session.exec(delete(Pokemon))
    session.add_all(Pokemon(id=i, name=n, generation=g) for i, n, g in species)
    session.flush()
    session.add_all(PokemonType(pokemon_id=i, slot=s, type_name=t) for i, s, t in types)
    session.commit()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="ignore the local cache")
    args = parser.parse_args(argv)

    generation_list = fetch_json(f"{API}/generation?limit=100", CACHE_DIR, args.refresh)
    species = []
    for g in generation_list["results"]:
        species += parse_generation(fetch_json(g["url"], CACHE_DIR, args.refresh))
    species_ids = {s[0] for s in species}

    type_list = fetch_json(f"{API}/type?limit=100", CACHE_DIR, args.refresh)
    types = []
    for t in type_list["results"]:
        types += parse_type(fetch_json(t["url"], CACHE_DIR, args.refresh), species_ids)

    check_complete(species, types)
    init_db()
    with Session(engine) as session:
        write_db(session, species, types)

    generations = len({s[2] for s in species})
    print(
        f"Saved {len(species)} Pokémon across {generations} generations "
        f"({len(types)} type rows)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
