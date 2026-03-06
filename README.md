# Databotics

Databotics is a full-stack data quality workbench for CSV/XLSX datasets. It combines a FastAPI backend and a Next.js frontend so teams can upload data, profile schema quality, validate rules, run SQL, clean records, and detect anomalies from one interface.

## Features

### Core
- JWT-based authentication (SQLite user database)
- Upload CSV/XLSX files with session-backed processing
- Dataset profiling (row counts, column stats, sample rows)
- Rule-based validation with violation reporting
- SQL querying on uploaded files (DuckDB)
- Data cleaning helpers (trim, de-duplication, case normalization)

### Advanced Analytics
- **Correlation analysis** (Pearson, Spearman, Kendall)
- **Anomaly detection** (IQR, Z-score methods)
- **Box plot analysis** with outlier identification
- **Distribution statistics** (mean, median, std dev, quartiles)
- **Advanced profiling** with data quality metrics

### AI & Automation
- **AI Insights** (Claude API + heuristic fallback)
- Natural language SQL generation
- AI-assisted data cleaning recommendations
- Automatic pattern & trend detection

### Data Integration
- **17 database engines** supported (PostgreSQL, MySQL, MongoDB, BigQuery, Snowflake, etc.)
- Connection string & field-based configuration
- Schema browser & live query editor
- Import data to Databotics sessions

### Notifications & Rules
- Rule-based notification engine
- Multiple channels (SMTP, Slack, webhooks, digest emails)
- Event filtering with custom Handlebars templates
- Quiet hours & rate limiting

### Session Management
- Save/load/export analysis sessions
- Undo/redo with keyboard shortcuts (Cmd+Z, Cmd+Y)
- Session history & metadata tracking
- Full state preservation

### Premium UI
- Dark mode with glassmorphism design
- Responsive mobile layout
- Framer Motion page transitions
- Micro-interactions & smooth animations
- Toast notifications & loading skeletons

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

## Testing

### Unit Tests (Backend)
```bash
cd Databotics
PYTHONPATH=Databotics python -m pytest tests/ -v
```

**Coverage:** 33 passing tests
- Auth (register/login/JWT)
- File upload & profiling
- Data validation & cleaning
- SQL querying
- Analytics (correlation, outliers, distributions, box plots)
- Connectors (17 database engines)
- Insights (heuristic + Claude API)
- Sessions (save/load/export)

### E2E Tests (Frontend)
```bash
# Requires running backend + frontend
npx playwright test
```

Tests:
- Login flow
- Navigation & page rendering
- Dark mode
- Sidebar visibility

## Tech Stack

- **Backend:** FastAPI, Pandas, DuckDB, SQLAlchemy, Pydantic, PyJWT, Passlib
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui, Framer Motion, Sonner
- **Database:** SQLite (local) / PostgreSQL (production)
- **Infra:** Docker Compose, GitHub Actions, Playwright E2E

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Local development setup
- Docker deployment
- Production checklist
- Database configuration (SQLite/PostgreSQL)
- Scaling & monitoring
- CI/CD pipeline
