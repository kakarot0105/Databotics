from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_connection

router = APIRouter(prefix="/api/nl-query", tags=["nl-query"])


class NLQueryRequest(BaseModel):
    query: str


class NLQueryExplainRequest(BaseModel):
    sql: str


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _load_schema() -> Dict[str, Dict[str, str]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]
    schema: Dict[str, Dict[str, str]] = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info('{table}')")
        cols = cursor.fetchall()
        schema[table] = {c[1]: (c[2] or "") for c in cols}
    conn.close()
    return schema


def _find_table(query: str, schema: Dict[str, Dict[str, str]]) -> Optional[str]:
    normalized = _normalize(query)
    for table in schema.keys():
        if table.lower() in normalized:
            return table
        if table.lower().replace("_", " ") in normalized:
            return table
    if len(schema) == 1:
        return next(iter(schema.keys()))
    return None


def _match_column(query: str, columns: List[str]) -> List[str]:
    normalized = _normalize(query)
    matched = []
    for col in columns:
        col_norm = col.lower()
        if col_norm in normalized or col_norm.replace("_", " ") in normalized:
            matched.append(col)
    return matched


def _infer_column_from_phrase(phrase: str, columns: List[str]) -> Optional[str]:
    normalized = _normalize(phrase)
    for col in columns:
        col_norm = col.lower()
        if col_norm in normalized or col_norm.replace("_", " ") in normalized:
            return col
    return None


def _is_numeric_type(type_str: str) -> bool:
    t = (type_str or "").lower()
    return any(token in t for token in ["int", "real", "numeric", "float", "double", "decimal"])


def _is_date_value(value: str) -> bool:
    try:
        datetime.fromisoformat(value)
        return True
    except Exception:
        return False


def _parse_between_clause(query: str, columns: List[str]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    match = re.search(r"between\s+([^\s]+)\s+and\s+([^\s]+)", query, re.IGNORECASE)
    if not match:
        return None, None, None
    start, end = match.group(1).strip("'\""), match.group(2).strip("'\"")
    date_col = _infer_column_from_phrase(query, columns)
    return date_col, start, end


def _parse_where_clause(query: str, columns: List[str]) -> Optional[str]:
    if "where" not in query and "with" not in query:
        return None
    clause = query.split("where", 1)[-1] if "where" in query else query.split("with", 1)[-1]
    clause = clause.strip()
    for col in columns:
        if col.lower() in clause:
            pattern = re.compile(rf"{re.escape(col)}\s*(=|!=|>=|<=|>|<|contains)\s*(.+)", re.IGNORECASE)
            match = pattern.search(clause)
            if match:
                op = match.group(1).lower()
                value = match.group(2).strip().strip(".")
                clean_value = value.strip("'\"")
                if op == "contains":
                    return f"{col} LIKE '%{clean_value}%'"
                if not re.match(r"^-?\d+(\.\d+)?$", value) and not _is_date_value(value.strip("'\"")):
                    value = f"'{clean_value}'"
                return f"{col} {op} {value}"
    return None


def _build_sql(query: str, table: str, columns: Dict[str, str]) -> Tuple[str, Optional[str]]:
    normalized = _normalize(query)
    col_names = list(columns.keys())
    matched_cols = _match_column(query, col_names)
    numeric_cols = [c for c, t in columns.items() if _is_numeric_type(t)]
    non_numeric_cols = [c for c in col_names if c not in numeric_cols]

    limit_match = re.search(r"top\s+(\d+)", normalized)
    limit = int(limit_match.group(1)) if limit_match else None

    agg = None
    if "count" in normalized:
        agg = "COUNT"
    elif "average" in normalized or "avg" in normalized:
        agg = "AVG"
    elif "sum" in normalized or "total" in normalized:
        agg = "SUM"
    elif "min" in normalized:
        agg = "MIN"
    elif "max" in normalized:
        agg = "MAX"

    group_by = None
    group_match = re.search(r"group by\s+([\w\s_]+)", normalized)
    if group_match:
        group_by = _infer_column_from_phrase(group_match.group(1), col_names)
    elif "by" in normalized and agg:
        by_phrase = normalized.split("by", 1)[-1]
        group_by = _infer_column_from_phrase(by_phrase, col_names)
    elif "per" in normalized and agg:
        per_phrase = normalized.split("per", 1)[-1]
        group_by = _infer_column_from_phrase(per_phrase, col_names)

    target_col = None
    of_match = re.search(r"of\s+([\w\s_]+)", normalized)
    if of_match:
        target_col = _infer_column_from_phrase(of_match.group(1), col_names)
    if not target_col and agg:
        target_col = numeric_cols[0] if numeric_cols else (matched_cols[0] if matched_cols else col_names[0])

    between_col, start, end = _parse_between_clause(query, col_names)
    where_clause = _parse_where_clause(query, col_names)

    top_by_col = None
    if "top" in normalized and "by" in normalized:
        by_phrase = normalized.split("by", 1)[-1]
        top_by_col = _infer_column_from_phrase(by_phrase, col_names)
        if not top_by_col and numeric_cols:
            top_by_col = numeric_cols[0]

    # Build SQL
    if agg:
        select_parts = [f"{agg}({target_col}) AS value"]
        if group_by:
            select_parts.insert(0, group_by)
        sql = f"SELECT {', '.join(select_parts)} FROM {table}"
    elif limit and top_by_col:
        entity_col = matched_cols[0] if matched_cols else (non_numeric_cols[0] if non_numeric_cols else col_names[0])
        sql = f"SELECT {entity_col}, {top_by_col} FROM {table}"
    elif matched_cols:
        sql = f"SELECT {', '.join(matched_cols)} FROM {table}"
    else:
        sql = f"SELECT * FROM {table}"

    conditions = []
    if where_clause:
        conditions.append(where_clause)
    if between_col and start and end:
        if not _is_date_value(start):
            start = f"'{start}'"
        if not _is_date_value(end):
            end = f"'{end}'"
        conditions.append(f"{between_col} BETWEEN {start} AND {end}")
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    if agg and group_by:
        sql += f" GROUP BY {group_by}"

    if limit and top_by_col:
        sql += f" ORDER BY {top_by_col} DESC LIMIT {limit}"
    elif limit and not agg:
        sql += f" LIMIT {limit}"
    else:
        sql += " LIMIT 100"

    return sql + ";", None


def _suggest_chart(columns: List[str], rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not rows or not columns:
        return {"type": "table"}

    sample = rows[0]
    types: Dict[str, str] = {}
    for col in columns:
        val = sample.get(col)
        if isinstance(val, (int, float)):
            types[col] = "numeric"
        elif isinstance(val, str) and _is_date_value(val):
            types[col] = "date"
        else:
            types[col] = "string"

    numeric_cols = [c for c, t in types.items() if t == "numeric"]
    date_cols = [c for c, t in types.items() if t == "date"]
    string_cols = [c for c, t in types.items() if t == "string"]

    if len(columns) == 2 and numeric_cols and date_cols:
        return {"type": "line", "x": date_cols[0], "y": numeric_cols[0]}
    if len(columns) == 2 and numeric_cols and string_cols:
        chart_type = "pie" if len(rows) <= 6 else "bar"
        return {"type": chart_type, "x": string_cols[0], "y": numeric_cols[0]}
    if len(columns) >= 2 and numeric_cols and date_cols:
        return {"type": "line", "x": date_cols[0], "y": numeric_cols[0]}
    return {"type": "bar", "x": columns[0], "y": numeric_cols[0] if numeric_cols else columns[1]}


def _execute_sql(sql: str) -> Dict[str, Any]:
    if not sql.strip().lower().startswith("select"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        results = [dict(zip(columns, row)) for row in rows]
        return {"columns": columns, "rows": results, "row_count": len(results)}
    finally:
        conn.close()


def _explain_sql(sql: str) -> str:
    normalized = sql.strip().strip(";")
    parts = []
    select_match = re.search(r"select\s+(.*?)\s+from\s+([\w_]+)", normalized, re.IGNORECASE)
    if select_match:
        parts.append(f"Selects {select_match.group(1)} from the {select_match.group(2)} table")
    where_match = re.search(r"where\s+(.*?)\s+(group by|order by|limit|$)", normalized, re.IGNORECASE)
    if where_match:
        parts.append(f"filters rows where {where_match.group(1).strip()}")
    group_match = re.search(r"group by\s+([\w_,\s]+)", normalized, re.IGNORECASE)
    if group_match:
        parts.append(f"groups by {group_match.group(1).strip()}")
    order_match = re.search(r"order by\s+([\w_\s,]+)", normalized, re.IGNORECASE)
    if order_match:
        parts.append(f"orders results by {order_match.group(1).strip()}")
    limit_match = re.search(r"limit\s+(\d+)", normalized, re.IGNORECASE)
    if limit_match:
        parts.append(f"limits output to {limit_match.group(1)} rows")
    return ", ".join(parts) + "." if parts else "Runs the provided SQL query."


@router.get("/schema")
async def get_schema():
    schema = _load_schema()
    return {"tables": schema}


@router.post("")
async def nl_query(req: NLQueryRequest):
    schema = _load_schema()
    if not schema:
        raise HTTPException(status_code=400, detail="No tables found in database.")
    table = _find_table(req.query, schema)
    if not table:
        raise HTTPException(status_code=400, detail="Could not determine which table to query.")

    sql, error = _build_sql(req.query, table, schema[table])
    if error:
        raise HTTPException(status_code=400, detail=error)
    try:
        results = _execute_sql(sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    chart = _suggest_chart(results["columns"], results["rows"])
    return {"sql": sql, "results": results, "chart": chart}


@router.post("/explain")
async def explain_query(req: NLQueryExplainRequest):
    return {"explanation": _explain_sql(req.sql)}