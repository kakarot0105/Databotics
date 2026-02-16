import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel

JWT_SECRET = os.getenv("JWT_SECRET", "databotics-dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class User(BaseModel):
    username: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCredentials(BaseModel):
    username: str
    password: str


_users: Dict[str, str] = {
    "admin": pwd_context.hash("databotics")
}


def get_user(username: str) -> Optional[User]:
    if username in _users:
        return User(username=username)
    return None


def register_user(username: str, password: str) -> User:
    if username in _users:
        raise HTTPException(status_code=400, detail="Username already exists")
    _users[username] = pwd_context.hash(password)
    return User(username=username)


def authenticate_user(username: str, password: str) -> Optional[User]:
    hashed = _users.get(username)
    if not hashed:
        return None
    if not pwd_context.verify(password, hashed):
        return None
    return User(username=username)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user
