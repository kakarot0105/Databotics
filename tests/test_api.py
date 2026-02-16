"""Tests for all FastAPI endpoints."""
import io
from fastapi.testclient import TestClient
from app.api import app

client = TestClient(app)

SAMPLE_CSV = b"name,age,email\nAlice,30,a@example.com\nBob,25,b@example.com\nCharlie,-5,invalid\n"
TS_CSV = b"timestamp,value\n2024-01-01,10\n2024-01-02,12\n2024-01-03,11\n2024-01-04,100\n2024-01-05,13\n2024-01-06,11\n2024-01-07,12\n2024-01-08,10\n2024-01-09,11\n2024-01-10,9\n"


def _upload(data: bytes, filename: str = "test.csv", content_type: str = "text/csv"):
    return ("file", (filename, io.BytesIO(data), content_type))


def _auth_headers() -> dict[str, str]:
    username = "testuser"
    password = "testpass"
    reg = client.post("/auth/register", json={"username": username, "password": password})
    if reg.status_code not in (200, 400):
        raise AssertionError(f"Unexpected register status: {reg.status_code}")

    login = client.post("/auth/login", json={"username": username, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


AUTH_HEADERS = _auth_headers()


def test_register_and_login():
    username = "newuser"
    password = "newpass"
    reg = client.post("/auth/register", json={"username": username, "password": password})
    assert reg.status_code == 200
    assert "access_token" in reg.json()

    login = client.post("/auth/login", json={"username": username, "password": password})
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_protected_endpoint_without_token():
    resp = client.post("/profile", files=[_upload(SAMPLE_CSV)])
    assert resp.status_code in (401, 403)


def test_upload_size_limit():
    too_big = b"a" * (52_428_800 + 1)
    resp = client.post("/upload", files=[_upload(too_big, "huge.csv")], headers=AUTH_HEADERS)
    assert resp.status_code == 413


# ---- /profile ----

class TestProfile:
    def test_profile_csv(self):
        resp = client.post("/profile", files=[_upload(SAMPLE_CSV)], headers=AUTH_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["row_count"] == 3
        assert len(body["columns"]) == 3
        col_names = [c["name"] for c in body["columns"]]
        assert "name" in col_names
        assert "age" in col_names
        assert "email" in col_names

    def test_profile_returns_sample_rows(self):
        resp = client.post("/profile", files=[_upload(SAMPLE_CSV)], headers=AUTH_HEADERS)
        body = resp.json()
        assert len(body["sample_rows"]) == 3
        assert body["sample_rows"][0]["name"] == "Alice"

    def test_profile_numeric_stats(self):
        resp = client.post("/profile", files=[_upload(SAMPLE_CSV)], headers=AUTH_HEADERS)
        body = resp.json()
        age_col = [c for c in body["columns"] if c["name"] == "age"][0]
        assert age_col["stats"] is not None
        assert age_col["stats"]["min"] == -5.0
        assert age_col["stats"]["max"] == 30.0

    def test_profile_empty_file(self):
        resp = client.post("/profile", files=[_upload(b"", "empty.csv", "text/csv")], headers=AUTH_HEADERS)
        assert resp.status_code == 400


# ---- /validate ----

class TestValidate:
    def test_validate_finds_violations(self):
        resp = client.post("/validate", files=[_upload(SAMPLE_CSV)], headers=AUTH_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert "violations" in body
        assert "summary" in body
        # age=-5 violates min:0, "invalid" violates email regex
        assert len(body["violations"]) >= 2

    def test_validate_clean_data(self):
        clean = b"name,age,email\nAlice,30,a@example.com\nBob,25,b@example.com\n"
        resp = client.post("/validate", files=[_upload(clean)], headers=AUTH_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["violations"]) == 0

    def test_validate_missing_required_column(self):
        no_name = b"age,email\n30,a@example.com\n"
        resp = client.post("/validate", files=[_upload(no_name)], headers=AUTH_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        msgs = [v["message"] for v in body["violations"]]
        assert any("required" in m.lower() or "missing" in m.lower() for m in msgs)


# ---- /clean ----

class TestClean:
    def test_clean_trim(self):
        messy = b"name,age\n  Alice  ,30\n Bob ,25\n"
        resp = client.post("/clean?trim_strings=true&drop_duplicates=false", files=[_upload(messy)], headers=AUTH_HEADERS)
        assert resp.status_code == 200
        # Should return a file (CSV or parquet)
        assert len(resp.content) > 0

    def test_clean_dedup(self):
        duped = b"name,age\nAlice,30\nAlice,30\nBob,25\n"
        resp = client.post("/clean?trim_strings=false&drop_duplicates=true", files=[_upload(duped)], headers=AUTH_HEADERS)
        assert resp.status_code == 200

    def test_clean_normalize_lower(self):
        resp = client.post("/clean?trim_strings=false&drop_duplicates=false&normalize_case=lower", files=[_upload(SAMPLE_CSV)], headers=AUTH_HEADERS)
        assert resp.status_code == 200


# ---- /generate_sql ----

class TestGenerateSQL:
    def test_deterministic_fallback(self):
        """Without API keys, should return fallback SQL."""
        resp = client.post("/generate_sql", json={
            "question": "Show all users",
            "table": "users",
            "schema": {"name": "str", "age": "int"},
        }, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert "sql" in body
        assert "SELECT" in body["sql"]
        assert "explanation" in body
        assert body["safety"]["is_safe"] is True

    def test_generate_sql_with_sample_rows(self):
        resp = client.post("/generate_sql", json={
            "question": "Average age",
            "table": "users",
            "schema": {"name": "str", "age": "int"},
            "sample_rows": [{"name": "Alice", "age": 30}],
        }, headers=AUTH_HEADERS)
        assert resp.status_code == 200


# ---- /analyze ----

class TestAnalyze:
    def test_analyze_z_score(self):
        resp = client.post(
            "/analyze?timestamp_col=timestamp&metric_col=value",
            files=[_upload(TS_CSV)],
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "anomalies" in body
        assert "summary" in body
        assert "narrative" in body

    def test_analyze_detects_outlier(self):
        # value=1000 is a clear outlier among ~10-13 (z-score > 3)
        big_outlier_csv = b"timestamp,value\n2024-01-01,10\n2024-01-02,12\n2024-01-03,11\n2024-01-04,10\n2024-01-05,13\n2024-01-06,11\n2024-01-07,12\n2024-01-08,10\n2024-01-09,11\n2024-01-10,9\n2024-01-11,12\n2024-01-12,10\n2024-01-13,11\n2024-01-14,10\n2024-01-15,1000\n"
        resp = client.post(
            "/analyze?timestamp_col=timestamp&metric_col=value",
            files=[_upload(big_outlier_csv)],
            headers=AUTH_HEADERS,
        )
        body = resp.json()
        assert body["summary"]["count"] >= 1
        values = [a["value"] for a in body["anomalies"]]
        assert 1000.0 in values


# ---- /query ----

class TestQuery:
    def test_query_select(self):
        resp = client.post(
            "/query?sql=SELECT+*+FROM+loaded_table+LIMIT+2",
            files=[_upload(SAMPLE_CSV)],
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["row_count"] == 2
        assert "name" in body["columns"]

    def test_query_aggregate(self):
        resp = client.post(
            "/query?sql=SELECT+COUNT(*)+as+cnt+FROM+loaded_table",
            files=[_upload(SAMPLE_CSV)],
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["rows"][0]["cnt"] == 3

    def test_query_bad_sql(self):
        resp = client.post(
            "/query?sql=INVALID+SQL+GARBAGE",
            files=[_upload(SAMPLE_CSV)],
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 400
