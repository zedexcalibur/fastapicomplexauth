import secrets
from fastapi import Request
from datetime import datetime, timedelta, timezone
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

from app.core.exceptions import raise_error

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Creates object that knows how to hash and verify passwords.
# CrpytContext = password hashing manager
# schemes=["bcrypt"] - which hashing algorithms it's allowed to use
# deprecated="auto" - if a password was hashed with an old or non-preferred scheme
# recognize that it is outdated and indicate that it should be upgraded.

oauth2_scheme = HTTPBearer()
# Creates a FastAPI security dependency that knows how to extract a Bearer token 
# from the Authorization header of an incoming request.

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
    token_version: int | None = None,
):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    to_encode.update({"exp": expire})

    if token_version is not None:
        to_encode.update({"token_version": token_version})

    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

def create_refresh_token(data: dict, token_version: int | None = None):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )

    to_encode.update({
        "exp": expire,
        "jti": secrets.token_urlsafe(32)
    })

    if token_version is not None:
        to_encode.update({"token_version": token_version})

    return jwt.encode(
        to_encode,
        settings.refresh_secret_key,
        algorithm=ALGORITHM
    )

def generate_csrf_token():
    return secrets.token_urlsafe(32)

def verify_csrf_token(request: Request):
    cookie = request.cookies.get("csrf_token")
    header = request.headers.get("X-CSRF-Token")

    if not cookie or not header or cookie != header:
        raise_error(403, "CSRF validation failed", "CSRF_VALIDATION_FAILED")

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def decode_refresh_token(refresh_token: str) -> dict:
    try:
        payload = jwt.decode(
            refresh_token,
            settings.refresh_secret_key,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        if not username:
            raise_error(
                401,
                "Invalid refresh token",
                "INVALID_REFRESH_TOKEN"
            )

        return payload

    except JWTError:
        raise_error(
            401,
            "Invalid refresh token",
            "INVALID_REFRESH_TOKEN"
        )