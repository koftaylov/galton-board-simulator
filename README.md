# Standard Distribution Visualization

A browser-based Galton board simulator for exploring normal distribution, launch modes, wildcard peg behavior, saved histogram overlays, and sound/effect feedback.

## Run Locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Then open http://127.0.0.1:8000.

The app can also be opened directly from `static/index.html`, but the FastAPI server is the normal local development path.

## Project Files

- `static/index.html` - app markup
- `static/style.css` - app layout and visual styling
- `static/app.js` - simulation, drawing, controls, audio, and wildcard behavior
- `app.py` - local FastAPI static-file server
- `requirements.txt` - local Python dependencies
- `.github/workflows/pages.yml` - GitHub Pages deployment
- `agent.md` - local development rule notes

## Deployment

GitHub Pages is deployed from the `main` branch using the Pages workflow.

Live site:

https://koftaylov.github.io/standard-distribution-vis/
