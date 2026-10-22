from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_db
from app.routers import auth, pokemon


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Pokémon App API", lifespan=lifespan)
app.include_router(pokemon.router)
app.include_router(auth.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/hello-sheiko")
def hello_sheiko():
    return {"message": "Hello Sheiko - What you thinking"}
