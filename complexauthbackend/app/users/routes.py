from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.service import get_current_user
from app.auth.security import verify_csrf_token
from app.auth.service import change_email, change_password
from app.core.exceptions import raise_error
from app.database import get_session
from app.models import User
from app.schemas import ChangeEmailRequest, ChangePasswordRequest

users_router = APIRouter(tags=["Users"])

@users_router.get("/me")
def me(user: User = Depends(get_current_user)): # dependencies resolved automatically.
    return user

@users_router.post("/change-password", dependencies=[Depends(verify_csrf_token)])
def change_password_route(
    data: ChangePasswordRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    try:
        change_password(session, user, data.current_password, data.new_password)
        return {"message": "Password updated"}
    except ValueError as e:
        raise_error(
            status_code=400,
            message=str(e),
            code="VALUE_ERROR"
        )    
@users_router.post("/change-email", dependencies=[Depends(verify_csrf_token)])
def change_email_route(
    data: ChangeEmailRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    try:
        change_email(session, user, data.new_email)
        return {"message": "Email updated"}
    except ValueError as e:
        raise_error(
            status_code=400,
            message=str(e),
            code="VALUE_ERROR"
        )