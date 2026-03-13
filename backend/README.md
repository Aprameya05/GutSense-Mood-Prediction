## GutSense Backend (Python)

This folder exposes the existing GutSense pipeline via a small HTTP API.

### Run (PowerShell)

From the repo root:

```powershell
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

### API (high-level)

- `GET /health`
- `POST /profile/{user_id}` (create/overwrite profile)
- `GET /profile/{user_id}`
- `POST /pipeline/run` (multipart image + inputs) → returns stage outputs and writes `data/daily_logs/YYYY-MM-DD.json`
- `GET /daily_logs` (list)
- `GET /daily_logs/{date}` (fetch one daily record)

