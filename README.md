# GitHub-Python-FastAPI

A Pokémon search app: browse and search Pokémon from Gen 1 to the newest generation, pick a nickname, and comment on favourites.

- `backend/`: FastAPI (Python 3.12), managed with [uv](https://docs.astral.sh/uv/)
- `frontend/`: React + TypeScript + MUI (coming next)

## Run the backend

```bash
cd backend
uv run main.py
```

Then open http://127.0.0.1:8000/docs.

## Run the tests

```bash
cd backend
uv run pytest
```

## Checks on every pull request

GitHub Actions runs the tests (CI), Ruff lint and format checks (Lint), and `pip-audit` on the locked dependencies (Security audit). Dependabot opens weekly update PRs.
