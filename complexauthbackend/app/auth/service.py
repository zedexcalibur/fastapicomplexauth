from datetime import datetime, timedelta, timezone
from fastapi import Depends
from jose import jwt, JWTError
from sqlmodel import Session, select
from sqlalchemy import or_

from app.core.config import settings
from app.core.exceptions import raise_error
from app.database import get_session
from app.models import User, RefreshToken
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
    oauth2_scheme,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS
)

def register_user(session: Session, data):

    existing = session.exec(
        select(User).where(
            (User.username == data.username) |
            (User.email == data.email)
        )
    ).first()

    if existing:
        raise_error(400, "User already exists", "USER_ALREADY_EXISTS")

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(data.password)
    )

    session.add(user)
    session.commit()
    session.refresh(user) # Reload this row from the database.

    return user

def login_user(session: Session, form_data):

    user = authenticate_user(
        session,
        form_data.identifier,
        form_data.password
    )

    if not user:
        raise_error(
            401,
            "Invalid credentials",
            "INVALID_CREDENTIALS"
        )

    access_token = create_access_token(
        {
            "sub": user.username,
            "token_version": user.token_version
        }
    )

    refresh_token = create_refresh_token(
        {"sub": user.username},
        token_version=user.token_version
    )

    decoded = jwt.decode(
        refresh_token,
        settings.refresh_secret_key,
        algorithms=[ALGORITHM]
    )

    db_refresh = RefreshToken(
        token=refresh_token,
        username=user.username,
        expires_at=datetime.fromtimestamp(
            decoded["exp"],
            timezone.utc
        ),
        revoked=False
    )

    session.add(db_refresh)
    session.commit()

    return access_token, refresh_token, user

def refresh_user(session: Session, refresh_token: str):

    stored = session.exec(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token
        )
    ).first()

    if not stored or stored.revoked:
        raise_error(
            401,
            "Invalid refresh token",
            "INVALID_REFRESH_TOKEN"
        )

    if stored.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise_error(
            401,
            "Expired refresh token",
            "REFRESH_TOKEN_EXPIRED"
        )

    payload = decode_refresh_token(refresh_token)
    username = payload["sub"]

    token_version = payload.get("token_version")

    if token_version is None:
        raise_error(
            401,
            "Invalid refresh token",
            "INVALID_REFRESH_TOKEN"
        )

    user = session.exec(
        select(User).where(User.username == username)
    ).first()

    if not user:
        raise_error(
            401,
            "Invalid refresh token",
            "INVALID_REFRESH_TOKEN"
        )

    if token_version != user.token_version:
        raise_error(
            401,
            "Refresh token revoked",
            "INVALID_REFRESH_TOKEN"
        )

    stored.revoked = True
    session.add(stored)

    new_refresh = create_refresh_token(
        {"sub": user.username},
        token_version=user.token_version
    )

    expires_at = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )

    new_db = RefreshToken(
        token=new_refresh,
        username=username,
        expires_at=expires_at,
        revoked=False
    )

    session.add(new_db)

    new_access = create_access_token(
        {"sub": username, "token_version": user.token_version}
    )

    session.commit()

    return new_access, new_refresh

def get_current_user(
    token=Depends(oauth2_scheme),
    session: Session = Depends(get_session)
):
    # oauth2_scheme reads the HTTP request, looks at the Authorization header
    # and extracts the Bearer token.
    try:
        payload = jwt.decode(
            token.credentials,
            settings.secret_key,
            algorithms=[ALGORITHM]
        )
    except JWTError:
        raise_error(401, "Invalid token", "INVALID_TOKEN")

    username = payload.get("sub")

    if not username:
        raise_error(401, "Invalid token", "INVALID_TOKEN")

    user = session.exec(
        select(User).where(User.username == username)
    ).first()

    if not user:
        raise_error(401, "Invalid token", "INVALID_TOKEN")

    token_version = payload.get("token_version")

    if token_version is None:
        raise_error(401, "Invalid token", "INVALID_TOKEN")

    if token_version != user.token_version:
        raise_error(401, "Token revoked", "TOKEN_REVOKED")

    return user

def authenticate_user(session: Session, identifier: str, password: str):
    user = session.exec(
        select(User).where(
            or_(
                User.username == identifier,
                User.email == identifier
            )
        )
    ).first()

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    return user

def change_password(
    session: Session,
    user: User,
    current_password: str,
    new_password: str
):
    if not verify_password(current_password, user.password):
        raise ValueError("Incorrect password")

    user.password = hash_password(new_password)
    user.token_version += 1

    session.add(user)
    session.commit()

def change_email(session: Session, user: User, new_email: str):
    existing = session.exec(
        select(User).where(User.email == new_email)
    ).first()

    if existing:
        raise ValueError("Email already in use")

    user.email = new_email
    session.add(user)
    session.commit()