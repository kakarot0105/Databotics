# Databotics Deployment Guide

## Overview

Databotics is a full-stack data analytics platform with:
- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (TypeScript/React)
- **Database**: SQLite (or PostgreSQL for production)
- **Tests**: 33 unit tests + E2E tests with Playwright

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 22+
- pip, npm

### Setup

```bash
# Backend
cd Databotics
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# Run tests
cd ..
PYTHONPATH=Databotics python -m pytest Databotics/tests/ -v

# Start backend
uvicorn app.api:app --host 0.0.0.0 --port 8000

# Start frontend (in another terminal)
cd frontend
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Visit: `http://localhost:3000`  
Login: `admin` / `databotics`

## Docker Deployment

### Build Images

```bash
# Backend
docker build -f Dockerfile.api -t databotics-api .

# Frontend
docker build -f Dockerfile.frontend -t databotics-frontend .
```

### Run with Docker Compose

```bash
# Production
docker-compose up -d

# Logs
docker-compose logs -f
```

**Access:**
- Frontend: `http://localhost:3000`
- API: `http://localhost:8000/docs`

### Environment Variables

```bash
# Backend
JWT_SECRET=your-secret-key
DATABOTICS_DB=/var/lib/databotics/databotics.db

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Production Checklist

- [ ] Set `JWT_SECRET` to a secure random key
- [ ] Configure database: SQLite or PostgreSQL
- [ ] Set up SSL/TLS (nginx reverse proxy)
- [ ] Configure CORS for your domain
- [ ] Enable API rate limiting
- [ ] Set up logging/monitoring
- [ ] Use proper secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Run database migrations
- [ ] Set up backups

## Database

### SQLite (Default)
- Stored at `/tmp/databotics.db`
- Good for small deployments
- Set `DATABOTICS_DB` env var to change location

### PostgreSQL (Recommended for Production)
Update `app/db.py` to use `psycopg2`:

```python
import psycopg2
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/databotics")

def get_connection():
    return psycopg2.connect(DB_URL)
```

Then run migrations:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Scaling

### Horizontal Scaling
1. Run multiple API instances behind a load balancer (nginx, HAProxy)
2. Use shared database (PostgreSQL)
3. Implement Redis for session management (optional)

### Example nginx config:
```nginx
upstream api {
    server api1:8000;
    server api2:8000;
    server api3:8000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
    }
}
```

## Monitoring

### Health Check
```bash
curl http://localhost:8000/docs
```

### Logs
```bash
# Docker
docker-compose logs -f api
docker-compose logs -f frontend

# Direct
tail -f /var/log/databotics/api.log
```

## CI/CD

### GitHub Actions (included)
- Runs on every push
- Tests: `pytest`
- Build: `next build`
- Passes: 33 tests

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: pytest Databotics/tests/ -v
      - name: Build frontend
        run: cd frontend && npm install && npm run build
```

## Troubleshooting

### Database Error
```
Error: Cannot find module 'sqlite3'
```
Solution:
```bash
pip install sqlite3  # or psycopg2 for PostgreSQL
```

### Port Already in Use
```bash
# Find process using port
lsof -i :8000
kill -9 <PID>
```

### CORS Issues
Update `app/api.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Performance Tips

1. **Frontend**: Use Next.js Image optimization
2. **Backend**: Enable query caching (Redis)
3. **Database**: Add indexes on frequently queried columns
4. **API**: Use async endpoints (FastAPI default)
5. **Compression**: Enable gzip in nginx

## Support

- GitHub Issues: https://github.com/kakarot0105/Databotics
- Documentation: See README.md
- API Docs: `http://localhost:8000/docs`
