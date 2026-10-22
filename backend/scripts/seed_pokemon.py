"""Fill the local SQLite database with every Pokémon species from PokeAPI.

Run from backend/:  uv run python -m scripts.seed_pokemon
Add --refresh to ignore the local cache and download again.

Requests: one per generation (name, number, generation), one per type (types and
slots), and one per Pokémon for its moves (about 1,055 in total the first time).
Responses are cached in data/cache/, following PokeAPI's fair-use policy
("Locally cache resources whenever you request them"), so later runs make none.
The API itself never calls PokeAPI; it only reads the database this script fills.
"""

import argparse
import json
import re
import sys
import urllib.request
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from sqlmodel import Session, delete

from app.db import BACKEND_DIR, engine, init_db
from app.models import Pokemon, PokemonMove, PokemonType

API = "https://pokeapi.co/api/v2"
CACHE_DIR = BACKEND_DIR / "data" / "cache"
USER_AGENT = "GitHub-Python-FastAPI-pokemon-app/0.1 (personal project)"
ID_FROM_URL = re.compile(r"/(\d+)/?$")

# Scarlet/Violet and its two DLC. PokeAPI currently files DLC moves under
# "scarlet-violet" itself; the DLC names are listed in case that changes.
SV_GROUPS = {"scarlet-violet", "the-teal-mask", "the-indigo-disk"}

# A few requests at a time: fast enough, and gentle on a free, volunteer-run API.
MAX_PARALLEL_REQUESTS = 4


def id_from_url(url: str) -> int:
    match = ID_FROM_URL.search(url)
    if not match:
        raise ValueError(f"No numeric id at the end of {url!r}")
    return int(match.group(1))


def fetch_json(
    url: str,
    cache_dir: Path,
    refresh: bool = False,
    trim: Callable[[dict], dict] | None = None,
) -> dict:
    """GET a PokeAPI URL, reusing a cached copy unless refresh is True.

    `trim`, if given, keeps only the fields we use before caching, so large
    responses don't fill the disk.
    """
    cache_file = cache_dir / (
        url.removeprefix(API).strip("/").replace("/", "_") + ".json"
    )
    if cache_file.exists() and not refresh:
        return json.loads(cache_file.read_text())
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
    if trim:
        data = trim(data)
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(data))
    return data


def trim_pokemon(data: dict) -> dict:
    """Keep only the move fields from a /pokemon/{id} response (it can be ~700 kB).

    Every game is kept, not just Scarlet/Violet, so changing the game filter later
    doesn't need a fresh download.
    """
    return {
        "id": data["id"],
        "name": data["name"],
        "moves": [
            {
                "move": {"name": m["move"]["name"]},
                "version_group_details": [
                    {
                        "level_learned_at": d["level_learned_at"],
                        "move_learn_method": {"name": d["move_learn_method"]["name"]},
                        "version_group": {"name": d["version_group"]["name"]},
                    }
                    for d in m["version_group_details"]
                ],
            }
            for m in data["moves"]
        ],
    }


def parse_moves(data: dict) -> list[tuple[int, str, str, int | None]]:
    """(pokedex number, move, method, level) for Scarlet/Violet moves only.

    A move listed for several SV groups is kept once per method; for level-up the
    lowest level wins. `level` is None for methods other than level-up.
    """
    best: dict[tuple[str, str], int | None] = {}
    for m in data["moves"]:
        for d in m["version_group_details"]:
            if d["version_group"]["name"] not in SV_GROUPS:
                continue
            method = d["move_learn_method"]["name"]
            level = d["level_learned_at"] if method == "level-up" else None
            key = (m["move"]["name"], method)
            if key not in best or (level is not None and level < best[key]):
                best[key] = level
    return [(data["id"], move, method, lvl) for (move, method), lvl in best.items()]


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


def check_moves(moves, species_ids: set[int]) -> int:
    """Fail on clearly broken move data; return how many Pokémon have no moves.

    Some Pokémon aren't in Scarlet/Violet at all (e.g. Zygarde), so "every Pokémon
    has moves" is not a valid check. "Nobody has moves" means the filter is broken.
    """
    if not moves:
        raise ValueError("No Pokémon has any Scarlet/Violet moves; check SV_GROUPS")
    unknown = {m[0] for m in moves} - species_ids
    if unknown:
        raise ValueError(f"Moves for unknown Pokémon ids, e.g. {sorted(unknown)[:5]}")
    keys = [(m[0], m[1], m[2]) for m in moves]
    if len(keys) != len(set(keys)):
        raise ValueError("The same move and method appears twice for one Pokémon")
    return len(species_ids - {m[0] for m in moves})


def write_db(session: Session, species, types, moves=()) -> None:
    """Replace the Pokémon tables' contents in one transaction (safe to re-run)."""
    session.exec(delete(PokemonMove))
    session.exec(delete(PokemonType))
    session.exec(delete(Pokemon))
    session.add_all(Pokemon(id=i, name=n, generation=g) for i, n, g in species)
    session.flush()
    session.add_all(PokemonType(pokemon_id=i, slot=s, type_name=t) for i, s, t in types)
    session.add_all(
        PokemonMove(pokemon_id=i, move_name=n, method=m, level=lvl)
        for i, n, m, lvl in moves
    )
    session.commit()


def fetch_all_moves(species_ids: set[int], refresh: bool) -> list:
    """Fetch (or read from cache) every Pokémon's moves, a few at a time."""

    def one(pokemon_id: int):
        url = f"{API}/pokemon/{pokemon_id}"
        return parse_moves(fetch_json(url, CACHE_DIR, refresh, trim=trim_pokemon))

    moves = []
    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_REQUESTS) as pool:
        for done, rows in enumerate(pool.map(one, sorted(species_ids)), start=1):
            moves += rows
            if done % 100 == 0:
                print(f"  moves: {done}/{len(species_ids)} Pokémon", flush=True)
    return moves


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

    moves = fetch_all_moves(species_ids, args.refresh)
    without_moves = check_moves(moves, species_ids)

    init_db()
    with Session(engine) as session:
        write_db(session, species, types, moves)

    generations = len({s[2] for s in species})
    print(
        f"Saved {len(species)} Pokémon across {generations} generations "
        f"({len(types)} type rows, {len(moves)} Scarlet/Violet move rows; "
        f"{without_moves} Pokémon have no Scarlet/Violet moves)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
