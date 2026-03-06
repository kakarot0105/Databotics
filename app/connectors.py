"""
Database Connectors Module
Supports: PostgreSQL, MySQL, SQLite, MongoDB, BigQuery, Snowflake, Redshift, ClickHouse, MSSQL, Oracle, DuckDB
"""

import time
import uuid
import hashlib
import os
from typing import Any, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


class DBEngine(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    MONGODB = "mongodb"
    BIGQUERY = "bigquery"
    SNOWFLAKE = "snowflake"
    REDSHIFT = "redshift"
    CLICKHOUSE = "clickhouse"
    MSSQL = "mssql"
    ORACLE = "oracle"
    DUCKDB = "duckdb"
    MARIADB = "mariadb"
    COCKROACHDB = "cockroachdb"
    SUPABASE = "supabase"
    NEON = "neon"
    PLANETSCALE = "planetscale"
    TURSO = "turso"
    REST_API = "rest_api"
    GOOGLE_SHEETS = "google_sheets"


ENGINE_META = {
    DBEngine.POSTGRESQL: {"name": "PostgreSQL", "default_port": 5432, "icon": "🐘", "category": "relational"},
    DBEngine.MYSQL: {"name": "MySQL", "default_port": 3306, "icon": "🐬", "category": "relational"},
    DBEngine.SQLITE: {"name": "SQLite", "default_port": None, "icon": "📦", "category": "relational"},
    DBEngine.MONGODB: {"name": "MongoDB", "default_port": 27017, "icon": "🍃", "category": "nosql"},
    DBEngine.BIGQUERY: {"name": "BigQuery", "default_port": None, "icon": "☁️", "category": "warehouse"},
    DBEngine.SNOWFLAKE: {"name": "Snowflake", "default_port": 443, "icon": "❄️", "category": "warehouse"},
    DBEngine.REDSHIFT: {"name": "Redshift", "default_port": 5439, "icon": "🔴", "category": "warehouse"},
    DBEngine.CLICKHOUSE: {"name": "ClickHouse", "default_port": 8123, "icon": "🏠", "category": "analytics"},
    DBEngine.MSSQL: {"name": "SQL Server", "default_port": 1433, "icon": "🪟", "category": "relational"},
    DBEngine.ORACLE: {"name": "Oracle", "default_port": 1521, "icon": "🔶", "category": "relational"},
    DBEngine.DUCKDB: {"name": "DuckDB", "default_port": None, "icon": "🦆", "category": "analytics"},
    DBEngine.MARIADB: {"name": "MariaDB", "default_port": 3306, "icon": "🦭", "category": "relational"},
    DBEngine.COCKROACHDB: {"name": "CockroachDB", "default_port": 26257, "icon": "🪳", "category": "relational"},
    DBEngine.SUPABASE: {"name": "Supabase", "default_port": 5432, "icon": "⚡", "category": "baas"},
    DBEngine.NEON: {"name": "Neon", "default_port": 5432, "icon": "🟢", "category": "serverless"},
    DBEngine.PLANETSCALE: {"name": "PlanetScale", "default_port": 3306, "icon": "🪐", "category": "serverless"},
    DBEngine.TURSO: {"name": "Turso", "default_port": None, "icon": "🏎️", "category": "serverless"},
    DBEngine.REST_API: {"name": "REST API", "default_port": None, "icon": "🌐", "category": "integration"},
    DBEngine.GOOGLE_SHEETS: {"name": "Google Sheets", "default_port": None, "icon": "📄", "category": "integration"},
}


@dataclass
class ConnectionConfig:
    id: str = ""
    name: str = ""
    engine: str = ""
    host: str = ""
    port: Optional[int] = None
    database: str = ""
    username: str = ""
    password: str = ""
    ssl: bool = True
    connection_string: str = ""
    options: dict = field(default_factory=dict)
    created_at: float = 0.0
    updated_at: float = 0.0
    last_tested: Optional[float] = None
    status: str = "untested"
    error_message: str = ""
    tags: list = field(default_factory=list)
    color: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = time.time()
        self.updated_at = time.time()


_connections: dict[str, ConnectionConfig] = {}


def _get_connector(engine: str):
    try:
        if engine in ("postgresql", "redshift", "cockroachdb", "supabase", "neon"):
            import psycopg2; return "psycopg2"
        elif engine in ("mysql", "mariadb", "planetscale"):
            import pymysql; return "pymysql"
        elif engine == "sqlite":
            import sqlite3; return "sqlite3"
        elif engine == "mongodb":
            import pymongo; return "pymongo"
        elif engine == "mssql":
            import pyodbc; return "pyodbc"
        elif engine == "clickhouse":
            import clickhouse_connect; return "clickhouse_connect"
        elif engine == "duckdb":
            import duckdb; return "duckdb"
        elif engine == "bigquery":
            from google.cloud import bigquery; return "bigquery"
        elif engine == "snowflake":
            import snowflake.connector; return "snowflake"
        elif engine == "oracle":
            import oracledb; return "oracledb"
        elif engine == "turso":
            import libsql_experimental; return "libsql"
    except ImportError:
        return None
    return None


def _connect(config: ConnectionConfig):
    engine = config.engine
    if engine in ("postgresql", "redshift", "cockroachdb", "supabase", "neon"):
        import psycopg2
        if config.connection_string:
            return psycopg2.connect(config.connection_string)
        return psycopg2.connect(host=config.host, port=config.port or 5432, dbname=config.database, user=config.username, password=config.password, sslmode="require" if config.ssl else "disable")
    elif engine in ("mysql", "mariadb", "planetscale"):
        import pymysql
        if config.connection_string:
            from urllib.parse import urlparse
            p = urlparse(config.connection_string)
            return pymysql.connect(host=p.hostname, port=p.port or 3306, user=p.username, password=p.password, database=p.path.lstrip("/"))
        return pymysql.connect(host=config.host, port=config.port or 3306, user=config.username, password=config.password, database=config.database)
    elif engine == "sqlite":
        import sqlite3
        return sqlite3.connect(config.database or config.connection_string or ":memory:")
    elif engine == "mongodb":
        import pymongo
        uri = config.connection_string or f"mongodb://{config.username}:{config.password}@{config.host}:{config.port or 27017}/{config.database}"
        client = pymongo.MongoClient(uri)
        return client[config.database]
    elif engine == "duckdb":
        import duckdb
        return duckdb.connect(config.database or config.connection_string or ":memory:")
    elif engine == "clickhouse":
        import clickhouse_connect
        return clickhouse_connect.get_client(host=config.host, port=config.port or 8123, username=config.username, password=config.password, database=config.database)
    elif engine == "snowflake":
        import snowflake.connector
        return snowflake.connector.connect(account=config.options.get("account", ""), user=config.username, password=config.password, database=config.database, warehouse=config.options.get("warehouse", ""), schema=config.options.get("schema", "public"))
    elif engine == "bigquery":
        from google.cloud import bigquery
        return bigquery.Client(project=config.options.get("project_id", ""))
    elif engine == "mssql":
        import pyodbc
        if config.connection_string:
            return pyodbc.connect(config.connection_string)
        return pyodbc.connect(f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={config.host},{config.port or 1433};DATABASE={config.database};UID={config.username};PWD={config.password};")
    elif engine == "oracle":
        import oracledb
        return oracledb.connect(user=config.username, password=config.password, dsn=f"{config.host}:{config.port or 1521}/{config.database}")
    elif engine == "turso":
        import libsql_experimental as libsql
        return libsql.connect(config.connection_string or config.host, auth_token=config.options.get("auth_token", ""))
    raise ValueError(f"Unsupported engine: {engine}")


def list_connections() -> list[dict]:
    result = []
    for conn in _connections.values():
        d = asdict(conn)
        d["password"] = "***" if conn.password else ""
        result.append(d)
    return sorted(result, key=lambda x: x["name"])


def save_connection(data: dict) -> dict:
    conn_id = data.get("id") or str(uuid.uuid4())
    existing = _connections.get(conn_id)
    config = ConnectionConfig(
        id=conn_id, name=data.get("name", ""), engine=data.get("engine", ""),
        host=data.get("host", ""), port=data.get("port"),
        database=data.get("database", ""), username=data.get("username", ""),
        password=data.get("password", existing.password if existing and data.get("password") == "***" else data.get("password", "")),
        ssl=data.get("ssl", True), connection_string=data.get("connection_string", ""),
        options=data.get("options", {}), created_at=existing.created_at if existing else time.time(),
        tags=data.get("tags", []), color=data.get("color", ""),
    )
    _connections[conn_id] = config
    d = asdict(config)
    d["password"] = "***" if config.password else ""
    return d


def delete_connection(conn_id: str) -> bool:
    if conn_id in _connections:
        del _connections[conn_id]
        return True
    return False


def test_connection(conn_id: str) -> dict:
    config = _connections.get(conn_id)
    if not config:
        return {"success": False, "error": "Connection not found"}
    start = time.time()
    try:
        driver = _get_connector(config.engine)
        if driver is None:
            engine_name = ENGINE_META.get(DBEngine(config.engine), {}).get("name", config.engine)
            config.status = "failed"
            config.error_message = f"Driver not installed for {engine_name}"
            config.last_tested = time.time()
            return {"success": False, "error": f"Driver not installed for {engine_name}. Install the required Python package.", "latency_ms": 0}
        conn = _connect(config)
        latency = (time.time() - start) * 1000
        if config.engine == "mongodb":
            conn.command("ping")
        elif config.engine == "bigquery":
            list(conn.query("SELECT 1").result())
        elif config.engine == "clickhouse":
            conn.query("SELECT 1")
        elif config.engine == "duckdb":
            conn.execute("SELECT 1"); conn.close()
        else:
            cursor = conn.cursor(); cursor.execute("SELECT 1"); cursor.close(); conn.close()
        config.status = "connected"
        config.error_message = ""
        config.last_tested = time.time()
        return {"success": True, "latency_ms": round(latency, 1)}
    except Exception as e:
        config.status = "failed"
        config.error_message = str(e)
        config.last_tested = time.time()
        return {"success": False, "error": str(e), "latency_ms": round((time.time() - start) * 1000, 1)}


def get_schema(conn_id: str) -> dict:
    config = _connections.get(conn_id)
    if not config:
        return {"error": "Connection not found"}
    try:
        conn = _connect(config)
        tables = []
        if config.engine in ("postgresql", "redshift", "cockroachdb", "supabase", "neon"):
            cursor = conn.cursor()
            cursor.execute("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
            for table_name, table_type in cursor.fetchall():
                cursor.execute("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position", (table_name,))
                columns = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES", "default": r[3]} for r in cursor.fetchall()]
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                row_count = cursor.fetchone()[0]
                tables.append({"name": table_name, "type": "view" if table_type == "VIEW" else "table", "columns": columns, "row_count": row_count})
            cursor.close(); conn.close()
        elif config.engine in ("mysql", "mariadb", "planetscale"):
            cursor = conn.cursor()
            cursor.execute("SHOW TABLES")
            for (table_name,) in cursor.fetchall():
                cursor.execute(f"DESCRIBE `{table_name}`")
                columns = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES", "key": r[3]} for r in cursor.fetchall()]
                cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                row_count = cursor.fetchone()[0]
                tables.append({"name": table_name, "type": "table", "columns": columns, "row_count": row_count})
            cursor.close(); conn.close()
        elif config.engine == "sqlite":
            cursor = conn.cursor()
            cursor.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
            for name, typ in cursor.fetchall():
                cursor.execute(f"PRAGMA table_info('{name}')")
                columns = [{"name": r[1], "type": r[2], "nullable": not r[3], "pk": bool(r[5])} for r in cursor.fetchall()]
                cursor.execute(f"SELECT COUNT(*) FROM '{name}'")
                row_count = cursor.fetchone()[0]
                tables.append({"name": name, "type": typ, "columns": columns, "row_count": row_count})
            conn.close()
        elif config.engine == "mongodb":
            for coll_name in sorted(conn.list_collection_names()):
                coll = conn[coll_name]
                row_count = coll.estimated_document_count()
                sample = coll.find_one()
                columns = [{"name": k, "type": type(v).__name__, "nullable": True} for k, v in sample.items()] if sample else []
                tables.append({"name": coll_name, "type": "collection", "columns": columns, "row_count": row_count})
        elif config.engine == "duckdb":
            cursor = conn.cursor()
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='main'")
            for (table_name,) in cursor.fetchall():
                cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table_name}'")
                columns = [{"name": r[0], "type": r[1]} for r in cursor.fetchall()]
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                row_count = cursor.fetchone()[0]
                tables.append({"name": table_name, "type": "table", "columns": columns, "row_count": row_count})
            conn.close()
        else:
            return {"error": f"Schema browsing not yet implemented for {config.engine}"}
        return {"tables": tables, "table_count": len(tables)}
    except Exception as e:
        return {"error": str(e)}


def execute_query(conn_id: str, query: str, limit: int = 1000) -> dict:
    config = _connections.get(conn_id)
    if not config:
        return {"error": "Connection not found"}
    query_upper = query.strip().upper()
    if any(query_upper.startswith(d) for d in ["DROP ", "DELETE ", "TRUNCATE ", "ALTER ", "UPDATE "]):
        if not config.options.get("allow_writes", False):
            return {"error": "Write operations disabled. Enable 'Allow Writes' in connection settings."}
    start = time.time()
    try:
        if config.engine in ("rest_api", "google_sheets"):
            df = import_to_dataframe(conn_id, query)
            rows = df.head(limit).values.tolist()
            columns = list(df.columns)
            return {"columns": columns, "rows": rows, "row_count": len(rows), "execution_time_ms": round((time.time() - start) * 1000, 1), "truncated": len(df) > limit}
        conn = _connect(config)
        if config.engine == "mongodb":
            return {"error": "Use MongoDB query syntax via the dedicated endpoint"}
        elif config.engine == "bigquery":
            job = conn.query(query)
            rows, columns = [], []
            for row in job.result():
                if not columns: columns = list(row.keys())
                rows.append([row[c] for c in columns])
                if len(rows) >= limit: break
            return {"columns": columns, "rows": rows, "row_count": len(rows), "execution_time_ms": round((time.time() - start) * 1000, 1), "truncated": len(rows) >= limit}
        elif config.engine == "clickhouse":
            result = conn.query(query)
            return {"columns": result.column_names, "rows": [list(r) for r in result.result_rows[:limit]], "row_count": min(len(result.result_rows), limit), "execution_time_ms": round((time.time() - start) * 1000, 1), "truncated": len(result.result_rows) >= limit}
        elif config.engine == "duckdb":
            result = conn.execute(query)
            columns = [desc[0] for desc in result.description] if result.description else []
            rows = [list(r) for r in result.fetchmany(limit)]
            conn.close()
            return {"columns": columns, "rows": rows, "row_count": len(rows), "execution_time_ms": round((time.time() - start) * 1000, 1), "truncated": len(rows) >= limit}
        else:
            cursor = conn.cursor()
            cursor.execute(query)
            if cursor.description:
                columns = [desc[0] for desc in cursor.description]
                rows = [[_serialize(v) for v in row] for row in cursor.fetchmany(limit)]
                result = {"columns": columns, "rows": rows, "row_count": len(rows), "execution_time_ms": round((time.time() - start) * 1000, 1), "truncated": len(rows) >= limit}
            else:
                result = {"columns": [], "rows": [], "row_count": cursor.rowcount if cursor.rowcount >= 0 else 0, "execution_time_ms": round((time.time() - start) * 1000, 1), "message": f"Query executed. {cursor.rowcount} rows affected."}
            cursor.close(); conn.close()
            return result
    except Exception as e:
        return {"error": str(e), "execution_time_ms": round((time.time() - start) * 1000, 1)}


def import_to_dataframe(conn_id: str, query: str):
    import pandas as pd
    import json as _json
    config = _connections.get(conn_id)
    if not config:
        raise ValueError("Connection not found")
    if config.engine == "rest_api":
        import requests
        url = config.connection_string or config.options.get("url") or config.host
        if not url:
            raise ValueError("REST API URL is required")
        headers = config.options.get("headers") or {}
        if isinstance(headers, str):
            try:
                headers = _json.loads(headers)
            except Exception:
                headers = {}
        json_path = config.options.get("json_path") or ""
        resp = requests.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        for key in json_path.split("."):
            if not key:
                continue
            if isinstance(data, dict):
                data = data.get(key)
            elif isinstance(data, list):
                try:
                    idx = int(key)
                    data = data[idx]
                except Exception:
                    break
        if isinstance(data, dict):
            records = [data]
        else:
            records = data or []
        return pd.json_normalize(records)
    if config.engine == "google_sheets":
        import gspread
        sheet_id = config.connection_string or config.options.get("sheet_id") or config.database
        worksheet = config.options.get("worksheet") or "Sheet1"
        service_json = config.options.get("service_account_json") or os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        if not sheet_id:
            raise ValueError("Google Sheet ID is required")
        if service_json:
            creds_dict = _json.loads(service_json) if isinstance(service_json, str) else service_json
            client = gspread.service_account_from_dict(creds_dict)
        else:
            client = gspread.service_account()
        ws = client.open_by_key(sheet_id).worksheet(worksheet)
        rows = ws.get_all_records()
        return pd.DataFrame(rows)
    if config.engine == "duckdb":
        import duckdb
        conn = duckdb.connect(config.database or ":memory:")
        return conn.execute(query).fetchdf()
    if config.engine == "bigquery":
        from google.cloud import bigquery
        return bigquery.Client(project=config.options.get("project_id", "")).query(query).to_dataframe()
    conn = _connect(config)
    df = pd.read_sql(query, conn)
    conn.close()
    return df


def get_available_drivers() -> dict:
    drivers = {}
    checks = {
        "psycopg2": ["postgresql", "redshift", "cockroachdb", "supabase", "neon"],
        "pymysql": ["mysql", "mariadb", "planetscale"],
        "sqlite3": ["sqlite"],
        "pymongo": ["mongodb"],
        "duckdb": ["duckdb"],
        "clickhouse_connect": ["clickhouse"],
        "snowflake.connector": ["snowflake"],
        "google.cloud.bigquery": ["bigquery"],
        "pyodbc": ["mssql"],
        "oracledb": ["oracle"],
        "libsql_experimental": ["turso"],
        "gspread": ["google_sheets"],
    }
    for pkg, engines in checks.items():
        try:
            __import__(pkg.split(".")[0]); installed = True
        except ImportError:
            installed = False
        for eng in engines:
            drivers[eng] = installed
    drivers["rest_api"] = True
    return drivers


def _serialize(val: Any) -> Any:
    if val is None: return None
    if isinstance(val, (int, float, str, bool)): return val
    if isinstance(val, bytes): return val.hex()
    if hasattr(val, "isoformat"): return val.isoformat()
    return str(val)


def get_engines_info() -> list[dict]:
    drivers = get_available_drivers()
    return [{"engine": e.value, "name": m["name"], "icon": m["icon"], "category": m["category"], "default_port": m["default_port"], "driver_installed": drivers.get(e.value, False)} for e, m in ENGINE_META.items()]
