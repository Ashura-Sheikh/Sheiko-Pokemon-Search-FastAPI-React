# GitHub-Python-FastAPI

A Pokémon search app: browse and search Pokémon from Gen 1 to the newest generation, pick a nickname, and comment on favourites.

- `backend/`: FastAPI (Python 3.12), managed with [uv](https://docs.astral.sh/uv/)
- `frontend/`: React + TypeScript + MUI, built with Vite

## Run the backend

```bash
cd backend
uv run python -m scripts.seed_pokemon   # once: loads all Pokémon into data/pokemon.db
uv run main.py
```

Then open http://127.0.0.1:8000/docs.

The seed script makes about 30 requests to [PokeAPI](https://pokeapi.co/) and caches the responses in `backend/data/cache/`, as PokeAPI's fair-use policy asks. Re-running it uses the cache (`--refresh` downloads again). The API itself only reads the local SQLite database; it never calls PokeAPI.

## Run the frontend

With the backend running, in a second terminal:

```bash
cd frontend
npm install        # first time only
npm run dev
```

Then open http://localhost:5173. The Vite dev server forwards `/api` requests to the backend on port 8000, so the browser sees one origin and the backend needs no CORS settings.

- **Search page (`/`):** search by name or number, filter by generation and type, with pages. Filters live in the URL, so a search can be bookmarked or shared, and Back returns to it.
- **Detail page (`/pokemon/:id`):** one Pokémon's sprite, number, generation and types.

Frontend checks: `npm run lint` (oxlint), `npm test` (Vitest + Testing Library), `npm run build` (strict TypeScript, then Vite).

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

GitHub Actions runs:
- **CI:** backend tests
- **Lint:** Ruff lint and format checks on the backend
- **Frontend:** `npm ci`, lint, tests, then strict type-check and build
- **Security audit:** `pip-audit` on `uv.lock`, and `npm audit` on `package-lock.json`

Dependabot opens weekly update PRs for Python packages, npm packages and GitHub Actions.
