from pathlib import Path
import random

from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(
    title="Standard Distribution Visualization",
    description="A simple Python FastAPI backend for Galton board distribution visualization.",
    version="0.1.0",
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return (BASE_DIR / "static" / "index.html").read_text(encoding="utf-8")

@app.get("/api/distribution")
def distribution(
    balls: int = Query(1000, ge=1, le=1000000),
    levels: int = Query(12, ge=1, le=20),
) -> dict:
    """Return a random Galton-board-style distribution for the requested parameters."""
    bins = [0] * (levels + 1)
    for _ in range(balls):
        position = sum(random.choice((0, 1)) for _ in range(levels))
        bins[position] += 1
    return {"balls": balls, "levels": levels, "bins": bins}
