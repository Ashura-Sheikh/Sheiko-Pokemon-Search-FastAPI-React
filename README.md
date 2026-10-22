# GitHub-Python-FastAPI

A Pokémon search app: browse and search Pokémon from Gen 1 to the newest generation, pick a nickname, and comment on favourites.

- `backend/`: FastAPI (Python 3.12), managed with [uv](https://docs.astral.sh/uv/)
- `frontend/`: React + TypeScript + MUI (coming next)

## Run the backend

```bash
cd backend
uv run python -m scripts.seed_pokemon   # once: loads all Pokémon into data/pokemon.db
uv run main.py
```

Then open http://127.0.0.1:8000/docs.

The seed script makes about 30 requests to [PokeAPI](https://pokeapi.co/) and caches the responses in `backend/data/cache/`, as PokeAPI's fair-use policy asks. Re-running it uses the cache (`--refresh` downloads again). The API itself only reads the local SQLite database; it never calls PokeAPI.

## API

| Endpoint | What it does |
|---|---|
| `GET /api/pokemon` | Search and list. `q` (name contains, or a Pokédex number), `generation`, `type`, `limit` (1–100, default 20), `offset` |
| `GET /api/pokemon/{id}` | One Pokémon by National Pokédex number (404 if not found) |
| `GET /api/types` | All types, for filters |
| `GET /api/generations` | All generations, for filters |
| `GET /api/health` | Health check |

Pokémon data comes from PokeAPI. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. This is a private, non-commercial learning project.

## Run the tests

```bash
cd backend
uv run pytest
```

## Checks on every pull request

GitHub Actions runs the tests (CI), Ruff lint and format checks (Lint), and `pip-audit` on the locked dependencies (Security audit). Dependabot opens weekly update PRs.
