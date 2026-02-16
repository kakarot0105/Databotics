# Databotics

Databotics is a full-stack data quality workbench for CSV/XLSX datasets. It combines a FastAPI backend and a Next.js frontend so teams can upload data, profile schema quality, validate rules, run SQL, clean records, and detect anomalies from one interface.

## Features

- JWT-based authentication (register/login)
- Upload CSV/XLSX files with session-backed processing
- Dataset profiling (row counts, column stats, sample rows)
- Rule-based validation with violation reporting
- SQL querying on uploaded files (DuckDB)
- Data cleaning helpers (trim, de-duplication, case normalization)
- Basic anomaly detection and AI-assisted SQL generation
- Responsive UI with dark mode and toast notifications

## Quick Start (Docker)

```bash
docker-compose up --build
```

Then open:
- Frontend: `http://localhost:3000`
- API: `http://localhost:8000/docs`

## Manual Setup

### 1) Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.api:app --host 0.0.0.0 --port 8000 --reload
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Set API URL if needed:

```bash
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## API Endpoints Overview

- `POST /auth/register` - Create account and return JWT
- `POST /auth/login` - Login and return JWT
- `POST /upload` - Upload a dataset and get `session_id`
- `GET /session/{session_id}` - Fetch session file metadata
- `POST /profile/{session_id}` - Profile uploaded session file
- `POST /profile` - Profile file directly
- `POST /validate` - Validate a file against rules
- `POST /clean` - Clean and return transformed file
- `POST /query` - Execute SQL against uploaded file
- `POST /analyze` - Run anomaly analysis
- `POST /generate_sql` - Generate SQL from NL prompt/context

## Default Credentials

Local development defaults in UI:
- Username: `admin`
- Password: `databotics`

(Or create your own account on `/register`.)

## Tech Stack

- **Backend:** FastAPI, Pandas, DuckDB, Pydantic, PyJWT, Passlib
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui, Sonner
- **Infra/Dev:** Docker Compose, GitHub Actions (CI for tests + frontend build)
