from datetime import datetime, timedelta
from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.responses import JSONResponse
from sqlmodel import select, Session
from urllib.parse import quote

from app.core.exceptions import raise_error
from app.database import get_session
from app.models import User, PasswordReset
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.auth.service import (
    authenticate_user,
    get_current_user,
    refresh_user,
    register_user
)
from app.auth.security import (
    generate_reset_token, 
    hash_password, 
    generate_csrf_token,
    verify_csrf_token,
    create_access_token,
    create_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS
)
from app.email import send_email

auth_router = APIRouter(tags=["Auth"])

@auth_router.post("/register")
def register(
    data: RegisterRequest,
    session: Session = Depends(get_session)
):
    register_user(session, data)
    return {"message": "User created"}
# register_user checks if they already exist.

@auth_router.post("/login")
def login(data: LoginRequest, session: Session = Depends(get_session)):
    user = authenticate_user(session, data.username, data.password)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid credentials"}
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            # stands for subject.
            # standard JWT claim. Identifies who the token belongs to.
            "token_version": user.token_version,
            # not standard JWT claim. Soemthing like 3 or 4.
            # Simple way to revoke previously used tokens.
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        # timedelta contains days, weeks etc.
    )

    refresh_token = create_refresh_token(
        data={
            "sub": user.username,
            "token_version": user.token_version,
        }
    )

    csrf_token = generate_csrf_token()

    response = JSONResponse(
        content={
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
        }
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # True in production
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # Must be readable by front end
        secure=False,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )

    return response

@auth_router.post("/refresh", dependencies=[Depends(verify_csrf_token)])
def refresh(
    refresh_token: str = Cookie(None),
    session: Session = Depends(get_session)
):
    if not refresh_token:
        raise_error(401, "Missing Refresh Token", "MISSING_REFRESH_TOKEN")

    access, refresh = refresh_user(session, refresh_token)

    response = JSONResponse(
        content={"access_token": access}
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=False,   # dev only
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )

    return response

@auth_router.post("/logout", dependencies=[Depends(verify_csrf_token)])
def logout(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user.token_version += 1
    session.commit()

    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("refresh_token", path="/")

    return response

@auth_router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    session: Session = Depends(get_session)
):

    user = session.exec(
        select(User).where(User.email == data.email)
    ).first()

    if not user:
        return {"message": "ok"}

    token = generate_reset_token()

    reset_entry = PasswordReset(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        used=False
    )

    session.add(reset_entry)
    session.commit()

    reset_link = f"http://localhost:5173/reset-password?token={quote(token)}"
    
    print("REAL TOKEN:", token, flush=True)
    # prints the real one to the console

    send_email(
        to_email=user.email,
        subject="Password Reset Request",
        body=reset_link
    )

    return {"message": "If the email exists, a reset link has been sent"}

@auth_router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    session: Session = Depends(get_session)
):

    reset_entry = session.exec(
        select(PasswordReset).where(
            PasswordReset.token == data.token
        )
    ).first()

    if not reset_entry: # Token is not in the table.
        raise_error(400, "Invalid token", "INVALID_TOKEN")

    if reset_entry.used:
        raise_error(400, "Token already used", "TOKEN_ALREADY_USED")

    if reset_entry.expires_at < datetime.utcnow():
        raise_error(400, "Token expired", "TOKEN_EXPIRED")

    user = session.get(User, reset_entry.user_id)

    if not user:
        raise_error(400, "User not found", "USED_NOT_FOUND")

    user.password = hash_password(data.new_password)
    reset_entry.used = True

    session.add(user)
    session.add(reset_entry)
    session.commit()

    return {"message": "Password has been reset successfully"}