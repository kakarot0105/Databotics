"""Real-time streaming API with WebSocket support."""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiosqlite
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

DB_PATH = Path(os.getenv("DATABOTICS_DB", "/tmp/databotics.db"))

router = APIRouter()

# -------------------------------
# Database helpers
# -------------------------------

CREATE_SOURCES_TABLE = """
CREATE TABLE IF NOT EXISTS streaming_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    interval_seconds INTEGER DEFAULT 10,
    is_active INTEGER DEFAULT 1,
    last_polled_at TEXT
)
"""

CREATE_ALERTS_TABLE = """
CREATE TABLE IF NOT EXISTS streaming_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    condition TEXT NOT NULL,
    channel TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_EVENTS_TABLE = """
CREATE TABLE IF NOT EXISTS streaming_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
"""


async def _get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_streaming_db() -> None:
    db = await _get_db()
    try:
        await db.execute(CREATE_SOURCES_TABLE)
        await db.execute(CREATE_ALERTS_TABLE)
        await db.execute(CREATE_EVENTS_TABLE)
        await db.commit()
    finally:
        await db.close()


# -------------------------------
# Models
# -------------------------------

class StreamingSourceCreate(BaseModel):
    id: Optional[int] = None
    name: str
    type: str = Field(..., description="database | api | webhook | file")
    config: Dict[str, Any]
    interval_seconds: int = 10
    is_active: bool = True


class StreamingSource(StreamingSourceCreate):
    last_polled_at: Optional[str] = None


class AlertCreate(BaseModel):
    source_id: int
    condition: Dict[str, Any]
    channel: str = Field("in_app", description="in_app | email | webhook")


class AlertRecord(AlertCreate):
    id: int
    created_at: str


class AlertHistoryRecord(BaseModel):
    id: int
    source_id: int
    payload: Dict[str, Any]
    created_at: str


# -------------------------------
# WebSocket manager
# -------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, source_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(source_id, set()).add(websocket)

    async def disconnect(self, source_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            if source_id in self._connections:
                self._connections[source_id].discard(websocket)
                if not self._connections[source_id]:
                    self._connections.pop(source_id, None)

    async def broadcast(self, source_id: int, message: Dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._connections.get(source_id, set()))
        if not targets:
            return
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.get(source_id, set()).discard(ws)


manager = ConnectionManager()

# -------------------------------
# Background polling
# -------------------------------

_poll_tasks: dict[int, asyncio.Task] = {}
_source_state: dict[int, Dict[str, Any]] = {}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_payload(payload: Any) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


async def _record_event(source_id: int, event_type: str, payload: Dict[str, Any]) -> None:
    db = await _get_db()
    try:
        await db.execute(
            "INSERT INTO streaming_events (source_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)",
            (source_id, event_type, json.dumps(payload), _utc_now()),
        )
        await db.commit()
    finally:
        await db.close()


async def _list_alerts_for_source(source_id: int) -> list[AlertRecord]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT id, source_id, condition, channel, created_at FROM streaming_alerts WHERE source_id = ?",
            (source_id,),
        )
        rows = await cursor.fetchall()
        return [
            AlertRecord(
                id=row["id"],
                source_id=row["source_id"],
                condition=json.loads(row["condition"]),
                channel=row["channel"],
                created_at=row["created_at"],
            )
            for row in rows
        ]
    finally:
        await db.close()


def _evaluate_condition(condition: Dict[str, Any], rows: List[Dict[str, Any]]) -> bool:
    if not rows:
        return False
    ctype = condition.get("type", "threshold")
    if ctype == "new_rows":
        min_new = int(condition.get("min", 1))
        return len(rows) >= min_new
    if ctype == "count_changes":
        min_changes = int(condition.get("min_changes", 1))
        return len(rows) >= min_changes
    # default threshold
    field = condition.get("field")
    op = condition.get("op", ">")
    target = condition.get("value")
    if not field:
        return False
    for row in rows:
        if field not in row:
            continue
        try:
            value = row[field]
            if op == ">" and value > target:
                return True
            if op == ">=" and value >= target:
                return True
            if op == "<" and value < target:
                return True
            if op == "<=" and value <= target:
                return True
            if op == "==" and value == target:
                return True
        except Exception:
            continue
    return False


async def _trigger_alerts(source_id: int, rows: List[Dict[str, Any]], payload: Dict[str, Any]) -> None:
    alerts = await _list_alerts_for_source(source_id)
    for alert in alerts:
        if _evaluate_condition(alert.condition, rows):
            alert_payload = {
                "alert_id": alert.id,
                "source_id": source_id,
                "channel": alert.channel,
                "condition": alert.condition,
                "triggered_at": _utc_now(),
                "sample": rows[:5],
            }
            await _record_event(source_id, "alert_triggered", alert_payload)
            await manager.broadcast(source_id, {"type": "alert", **alert_payload})
            if alert.channel == "webhook":
                url = alert.condition.get("webhook_url") or payload.get("webhook_url")
                if url:
                    await asyncio.to_thread(_post_webhook, url, alert_payload)


def _post_webhook(url: str, payload: Dict[str, Any]) -> None:
    try:
        import requests

        requests.post(url, json=payload, timeout=5)
    except Exception:
        return


async def _poll_api(source_id: int, config: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = config.get("url")
    if not url:
        return []
    headers = config.get("headers") or {}
    params = config.get("params") or {}

    def _fetch():
        import requests

        r = requests.get(url, headers=headers, params=params, timeout=10)
        r.raise_for_status()
        try:
            return r.json()
        except Exception:
            return {"text": r.text}

    data = await asyncio.to_thread(_fetch)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    return [{"value": data}]


async def _poll_database(source_id: int, config: Dict[str, Any]) -> List[Dict[str, Any]]:
    engine = (config.get("engine") or "postgres").lower()
    query = config.get("query") or "SELECT NOW() as timestamp"
    if engine.startswith("postgres"):
        return await asyncio.to_thread(_query_postgres, config, query)
    if engine.startswith("mysql"):
        return await asyncio.to_thread(_query_mysql, config, query)
    return []


def _query_postgres(config: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
    import psycopg2

    conn = psycopg2.connect(
        host=config.get("host"),
        port=config.get("port") or 5432,
        dbname=config.get("database"),
        user=config.get("user"),
        password=config.get("password"),
    )
    cur = conn.cursor()
    cur.execute(query)
    columns = [d[0] for d in cur.description]
    rows = [dict(zip(columns, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def _query_mysql(config: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
    import pymysql

    conn = pymysql.connect(
        host=config.get("host"),
        port=int(config.get("port") or 3306),
        user=config.get("user"),
        password=config.get("password"),
        database=config.get("database"),
        cursorclass=pymysql.cursors.DictCursor,
    )
    with conn.cursor() as cursor:
        cursor.execute(query)
        rows = cursor.fetchall()
    conn.close()
    return list(rows)


async def _poll_file(source_id: int, config: Dict[str, Any]) -> List[Dict[str, Any]]:
    directory = config.get("directory")
    if not directory:
        return []
    path = Path(directory)
    if not path.exists():
        return []
    known = _source_state.get(source_id, {}).setdefault("files", set())
    new_rows = []
    for file in path.glob("*"):
        if not file.is_file():
            continue
        if file.name in known:
            continue
        known.add(file.name)
        new_rows.append({
            "filename": file.name,
            "size": file.stat().st_size,
            "modified_at": datetime.fromtimestamp(file.stat().st_mtime, tz=timezone.utc).isoformat(),
        })
    return new_rows


async def _poll_source(source: StreamingSource) -> None:
    source_id = source.id  # type: ignore
    while True:
        try:
            if not source.is_active:
                await asyncio.sleep(2)
                continue
            rows: List[Dict[str, Any]] = []
            if source.type == "api":
                rows = await _poll_api(source_id, source.config)
            elif source.type == "database":
                rows = await _poll_database(source_id, source.config)
            elif source.type == "file":
                rows = await _poll_file(source_id, source.config)
            payload = {
                "source_id": source_id,
                "type": source.type,
                "rows": rows,
                "fetched_at": _utc_now(),
            }
            payload_hash = _hash_payload(payload)
            state = _source_state.setdefault(source_id, {})
            if payload_hash != state.get("last_hash"):
                state["last_hash"] = payload_hash
                await _record_event(source_id, "data", payload)
                await manager.broadcast(source_id, {"type": "data", **payload})
                await _trigger_alerts(source_id, rows, payload)
            await _update_last_polled(source_id)
            await asyncio.sleep(max(2, source.interval_seconds))
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(max(5, source.interval_seconds))


async def _update_last_polled(source_id: int) -> None:
    db = await _get_db()
    try:
        await db.execute(
            "UPDATE streaming_sources SET last_polled_at = ? WHERE id = ?",
            (_utc_now(), source_id),
        )
        await db.commit()
    finally:
        await db.close()


async def _refresh_task(source_id: int) -> None:
    if source_id in _poll_tasks:
        _poll_tasks[source_id].cancel()
        _poll_tasks.pop(source_id, None)
    source = await _get_source(source_id)
    if source and source.is_active and source.type in ("api", "database", "file"):
        _poll_tasks[source_id] = asyncio.create_task(_poll_source(source))


async def init_streaming() -> None:
    await init_streaming_db()
    sources = await _list_sources()
    for source in sources:
        if source.is_active and source.type in ("api", "database", "file"):
            _poll_tasks[source.id] = asyncio.create_task(_poll_source(source))


# -------------------------------
# CRUD helpers
# -------------------------------

async def _list_sources() -> List[StreamingSource]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name, type, config, interval_seconds, is_active, last_polled_at FROM streaming_sources ORDER BY id DESC"
        )
        rows = await cursor.fetchall()
        return [
            StreamingSource(
                id=row["id"],
                name=row["name"],
                type=row["type"],
                config=json.loads(row["config"]),
                interval_seconds=row["interval_seconds"],
                is_active=bool(row["is_active"]),
                last_polled_at=row["last_polled_at"],
            )
            for row in rows
        ]
    finally:
        await db.close()


async def _get_source(source_id: int) -> Optional[StreamingSource]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name, type, config, interval_seconds, is_active, last_polled_at FROM streaming_sources WHERE id = ?",
            (source_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return StreamingSource(
            id=row["id"],
            name=row["name"],
            type=row["type"],
            config=json.loads(row["config"]),
            interval_seconds=row["interval_seconds"],
            is_active=bool(row["is_active"]),
            last_polled_at=row["last_polled_at"],
        )
    finally:
        await db.close()


# -------------------------------
# Endpoints
# -------------------------------

@router.get("/sources", response_model=List[StreamingSource])
async def list_sources() -> List[StreamingSource]:
    return await _list_sources()


@router.post("/sources", response_model=StreamingSource)
async def create_source(body: StreamingSourceCreate) -> StreamingSource:
    if body.type not in ("database", "api", "webhook", "file"):
        raise HTTPException(status_code=400, detail="Invalid source type")
    db = await _get_db()
    try:
        if body.id:
            await db.execute(
                "UPDATE streaming_sources SET name = ?, type = ?, config = ?, interval_seconds = ?, is_active = ? WHERE id = ?",
                (
                    body.name,
                    body.type,
                    json.dumps(body.config),
                    body.interval_seconds,
                    int(body.is_active),
                    body.id,
                ),
            )
            await db.commit()
            await _refresh_task(body.id)
            source = await _get_source(body.id)
            if not source:
                raise HTTPException(status_code=404, detail="Source not found")
            return source
        cursor = await db.execute(
            "INSERT INTO streaming_sources (name, type, config, interval_seconds, is_active) VALUES (?, ?, ?, ?, ?)",
            (
                body.name,
                body.type,
                json.dumps(body.config),
                body.interval_seconds,
                int(body.is_active),
            ),
        )
        await db.commit()
        source_id = cursor.lastrowid
    finally:
        await db.close()
    await _refresh_task(source_id)
    source = await _get_source(source_id)
    if not source:
        raise HTTPException(status_code=500, detail="Failed to create source")
    return source


@router.delete("/sources/{source_id}")
async def delete_source(source_id: int) -> Dict[str, Any]:
    db = await _get_db()
    try:
        await db.execute("DELETE FROM streaming_sources WHERE id = ?", (source_id,))
        await db.commit()
    finally:
        await db.close()
    if source_id in _poll_tasks:
        _poll_tasks[source_id].cancel()
        _poll_tasks.pop(source_id, None)
    return {"deleted": True, "id": source_id}


@router.post("/alerts", response_model=AlertRecord)
async def create_alert(body: AlertCreate) -> AlertRecord:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO streaming_alerts (source_id, condition, channel, created_at) VALUES (?, ?, ?, ?)",
            (body.source_id, json.dumps(body.condition), body.channel, _utc_now()),
        )
        await db.commit()
        alert_id = cursor.lastrowid
        cursor = await db.execute(
            "SELECT id, source_id, condition, channel, created_at FROM streaming_alerts WHERE id = ?",
            (alert_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create alert")
        return AlertRecord(
            id=row["id"],
            source_id=row["source_id"],
            condition=json.loads(row["condition"]),
            channel=row["channel"],
            created_at=row["created_at"],
        )
    finally:
        await db.close()


@router.get("/alerts")
async def list_alerts(include_history: bool = True) -> Dict[str, Any]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT id, source_id, condition, channel, created_at FROM streaming_alerts ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        alerts = [
            AlertRecord(
                id=row["id"],
                source_id=row["source_id"],
                condition=json.loads(row["condition"]),
                channel=row["channel"],
                created_at=row["created_at"],
            )
            for row in rows
        ]
        history: List[AlertHistoryRecord] = []
        if include_history:
            cursor = await db.execute(
                "SELECT id, source_id, payload, created_at FROM streaming_events WHERE event_type = 'alert_triggered' ORDER BY created_at DESC LIMIT 100"
            )
            events = await cursor.fetchall()
            history = [
                AlertHistoryRecord(
                    id=row["id"],
                    source_id=row["source_id"],
                    payload=json.loads(row["payload"]),
                    created_at=row["created_at"],
                )
                for row in events
            ]
        return {"alerts": alerts, "history": history}
    finally:
        await db.close()


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int) -> Dict[str, Any]:
    db = await _get_db()
    try:
        await db.execute("DELETE FROM streaming_alerts WHERE id = ?", (alert_id,))
        await db.commit()
    finally:
        await db.close()
    return {"deleted": True, "id": alert_id}


@router.post("/webhook/{source_id}")
async def ingest_webhook(source_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    source = await _get_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    data_rows = payload.get("rows") if isinstance(payload, dict) else None
    rows = data_rows if isinstance(data_rows, list) else [payload]
    event_payload = {
        "source_id": source_id,
        "type": "webhook",
        "rows": rows,
        "received_at": _utc_now(),
    }
    await _record_event(source_id, "data", event_payload)
    await manager.broadcast(source_id, {"type": "data", **event_payload})
    await _trigger_alerts(source_id, rows, event_payload)
    return {"received": True}


@router.websocket("/ws/stream/{source_id}")
async def websocket_stream(websocket: WebSocket, source_id: int) -> None:
    await manager.connect(source_id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(source_id, websocket)
    except Exception:
        await manager.disconnect(source_id, websocket)
