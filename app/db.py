"""SQLite database for user management."""
import sqlite3
from pathlib import Path
from typing import Optional
import os

# SQLAlchemy for ORM support
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

Base = declarative_base()

# SQLAlchemy engine
DB_PATH = Path(os.getenv("DATABOTICS_DB", "/tmp/databotics.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Get SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_connection():
    """Get database connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database schema."""
    # Create SQLAlchemy tables
    Base.metadata.create_all(bind=engine)
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profile_settings (
            profile_id TEXT PRIMARY KEY,
            webhook_url TEXT,
            webhook_threshold INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL,
            chart_id TEXT,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def get_user_by_username(username: str) -> Optional[dict]:
    """Get user by username."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_password_hash(username: str) -> Optional[str]:
    """Get password hash for user."""
    user = get_user_by_username(username)
    return user["password_hash"] if user else None


def user_exists(username: str) -> bool:
    """Check if user exists."""
    return get_user_by_username(username) is not None


def create_user(username: str, password_hash: str) -> bool:
    """Create new user."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False


def delete_user(username: str) -> bool:
    """Delete user (for testing)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE username = ?", (username,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def list_users() -> list[str]:
    """List all usernames."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users ORDER BY created_at")
    usernames = [row["username"] for row in cursor.fetchall()]
    conn.close()
    return usernames


# ---- Reports ----

def create_report(user_id: str, name: str, payload: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reports (user_id, name, payload) VALUES (?, ?, ?)", (user_id, name, payload))
    conn.commit()
    report_id = cursor.lastrowid
    cursor.execute("SELECT id, user_id, name, payload, created_at FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def list_reports(user_id: str) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, name, payload, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_report(report_id: int, user_id: str) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, name, payload, created_at FROM reports WHERE id = ? AND user_id = ?", (report_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def delete_report(report_id: int, user_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE id = ? AND user_id = ?", (report_id, user_id))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


# ---- Profile settings ----

def upsert_profile_settings(profile_id: str, webhook_url: str | None, webhook_threshold: int | None) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO profile_settings (profile_id, webhook_url, webhook_threshold, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(profile_id) DO UPDATE SET webhook_url=excluded.webhook_url, webhook_threshold=excluded.webhook_threshold, updated_at=CURRENT_TIMESTAMP
        """,
        (profile_id, webhook_url, webhook_threshold if webhook_threshold is not None else 1),
    )
    conn.commit()
    cursor.execute("SELECT profile_id, webhook_url, webhook_threshold, updated_at FROM profile_settings WHERE profile_id = ?", (profile_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def get_profile_settings(profile_id: str) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT profile_id, webhook_url, webhook_threshold, updated_at FROM profile_settings WHERE profile_id = ?", (profile_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ---- Shares ----

def create_share(profile_id: str, token: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO shares (profile_id, token) VALUES (?, ?)", (profile_id, token))
    conn.commit()
    cursor.execute("SELECT profile_id, token, created_at FROM shares WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def get_share(token: str) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT profile_id, token, created_at FROM shares WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ---- Comments ----

def list_comments(profile_id: str) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, profile_id, chart_id, user_id, content, created_at FROM comments WHERE profile_id = ? ORDER BY created_at DESC", (profile_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def create_comment(profile_id: str, chart_id: str | None, user_id: str, content: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO comments (profile_id, chart_id, user_id, content) VALUES (?, ?, ?, ?)", (profile_id, chart_id, user_id, content))
    conn.commit()
    comment_id = cursor.lastrowid
    cursor.execute("SELECT id, profile_id, chart_id, user_id, content, created_at FROM comments WHERE id = ?", (comment_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def delete_comment(comment_id: int, user_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM comments WHERE id = ? AND user_id = ?", (comment_id, user_id))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted
