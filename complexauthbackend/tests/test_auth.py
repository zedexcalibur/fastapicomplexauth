import secrets

from sqlmodel import select

from app.models import User, PasswordReset
from datetime import datetime, timedelta, timezone
from jose import jwt

from app.auth.security import SECRET_KEY, ALGORITHM, REFRESH_SECRET_KEY

def test_register_user(client, session):
    response = client.post(
        "/register",
        json={
            "username": "zoe",
            "email": "zoe@example.com",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "User created"
    }

    user = session.exec(
        select(User).where(User.username == "zoe")
    ).first()

    assert user is not None
    assert user.username == "zoe"
    assert user.email == "zoe@example.com"

    # The password must not be stored as plaintext.
    assert user.password != "secretpassword"

def test_register_duplicate_user(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # First registration should succeed.
    response = client.post("/register", json=user_data)

    assert response.status_code == 200

    # Second registration should fail.
    response = client.post("/register", json=user_data)

    assert response.status_code == 400

def test_login_user(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Create the user first.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    data = response.json()

    # Login should return an access token and user information.
    assert "access_token" in data
    assert data["user"]["username"] == "zoe"
    assert data["user"]["email"] == "zoe@example.com"

    # Login should set the refresh-token cookie.
    assert "refresh_token" in response.cookies

    # Login should also set the CSRF cookie.
    assert "csrf_token" in response.cookies

def test_login_wrong_password(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Create the user.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Try to log in with the wrong password.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["message"] == "Invalid credentials"
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"

def test_get_current_user(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    access_token = response.json()["access_token"]

    # Use the access token to access /me.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {access_token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["username"] == "zoe"
    assert data["email"] == "zoe@example.com"

def test_get_current_user_without_token(client):
    response = client.get("/me")

    assert response.status_code == 401

def test_get_current_user_with_invalid_token(client):
    response = client.get(
        "/me",
        headers={
            "Authorization": "Bearer this-is-not-a-real-token"
        },
    )

    assert response.status_code == 401

def test_change_password(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    access_token = response.json()["access_token"]
    csrf_token = response.cookies["csrf_token"]

    # Change the password.
    response = client.post(
        "/change-password",
        json={
            "current_password": "secretpassword",
            "new_password": "newpassword",
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-CSRF-Token": csrf_token,
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Password updated"

def test_change_password_wrong_current_password(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    access_token = response.json()["access_token"]
    csrf_token = response.cookies["csrf_token"]

    # Try to change the password using the wrong current password.
    response = client.post(
        "/change-password",
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword",
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-CSRF-Token": csrf_token,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["message"] == "Incorrect password"
    assert response.json()["detail"]["code"] == "VALUE_ERROR"

def test_logout_invalidates_access_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    access_token = response.json()["access_token"]
    csrf_token = response.cookies["csrf_token"]

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-CSRF-Token": csrf_token,
    }

    # Confirm the token currently works.
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200

    # Log out.
    response = client.post("/logout", headers=headers)

    assert response.status_code == 200
    assert response.json()["message"] == "Logged out"

    # The same access token should now be rejected.
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"]["message"] == "Token revoked"

def test_refresh_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200, response.json()

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    old_refresh_token = response.cookies["refresh_token"]
    csrf_token = response.cookies["csrf_token"]

    # Refresh using the refresh token from login.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": old_refresh_token,
        },
    )

    assert response.status_code == 200
    assert "access_token" in response.json()

    new_refresh_token = response.cookies["refresh_token"]

    assert new_refresh_token != old_refresh_token

def test_register_duplicate_username(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    response = client.post(
        "/register",
        json={
            "username": "zoe",
            "email": "different@example.com",
            "password": "anotherpassword",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "USER_ALREADY_EXISTS"

def test_register_duplicate_email(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    response = client.post(
        "/register",
        json={
            "username": "different",
            "email": "zoe@example.com",
            "password": "anotherpassword",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "USER_ALREADY_EXISTS"

def test_login_with_email(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in using the email instead of the username.
    response = client.post(
        "/login",
        json={
            "username": "zoe@example.com",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.cookies
    assert "csrf_token" in response.cookies

def test_refresh_token_cannot_be_reused(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )

    assert response.status_code == 200

    old_refresh_token = response.cookies["refresh_token"]
    csrf_token = response.cookies["csrf_token"]

    # Use the original refresh token once.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": old_refresh_token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 200

    # Save the newly issued refresh token.
    new_refresh_token = response.cookies["refresh_token"]

    # The new refresh token should be different from the old one.
    assert new_refresh_token != old_refresh_token

    # Try to use the old refresh token again.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": old_refresh_token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_REFRESH_TOKEN"

    # The new refresh token should still work.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": new_refresh_token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 200

def test_logout_invalidates_refresh_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    refresh_token = response.cookies["refresh_token"]
    csrf_token = response.cookies["csrf_token"]
    access_token = response.json()["access_token"]

    # Log out.
    response = client.post(
        "/logout",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-CSRF-Token": csrf_token,
        },
    )
    assert response.status_code == 200

    # Try to use the old refresh token.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["message"] == "Invalid refresh token"

def test_refresh_with_invalid_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in to obtain a valid CSRF token.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    csrf_token = response.cookies["csrf_token"]

    # Try to refresh using an invalid refresh token.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": "this-is-not-a-real-refresh-token",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["message"] == "Invalid refresh token"

def test_refresh_with_invalid_csrf_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    refresh_token = response.cookies["refresh_token"]

    # Use the refresh token but supply the wrong CSRF token.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": "wrong-csrf-token",
        },
        cookies={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 403

def test_refresh_with_missing_csrf_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    refresh_token = response.cookies["refresh_token"]

    # Try to refresh without supplying a CSRF token.
    response = client.post(
        "/refresh",
        cookies={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "CSRF_VALIDATION_FAILED"

def test_change_password_invalidates_access_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    access_token = response.json()["access_token"]
    csrf_token = response.cookies["csrf_token"]

    # Change the password.
    response = client.post(
        "/change-password",
        json={
            "current_password": "secretpassword",
            "new_password": "newpassword",
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-CSRF-Token": csrf_token,
        },
    )

    assert response.status_code == 200

    # The old access token should no longer work.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert response.status_code == 401

def test_change_email_duplicate_email(client):
    # Create the first user.
    response = client.post(
        "/register",
        json={
            "username": "zoe",
            "email": "zoe@example.com",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    # Create the second user.
    response = client.post(
        "/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    # Log in as Zoe.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    access_token = response.json()["access_token"]
    csrf_token = response.cookies["csrf_token"]

    # Try to change Zoe's email to Alice's email.
    response = client.post(
        "/change-email",
        json={
            "new_email": "alice@example.com",
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-CSRF-Token": csrf_token,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["message"] == "Email already in use"

def test_get_current_user_with_expired_access_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Create an already-expired access token.
    expired_token = jwt.encode(
        {
            "sub": "zoe",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            "token_version": 0,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    # Try to access /me with the expired token.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {expired_token}",
        },
    )

    assert response.status_code == 401

def test_get_current_user_with_malformed_access_token(client):
    # This looks vaguely like a JWT but is deliberately malformed.
    malformed_token = "eyJhbGciOiJIUzI1NiJ9.not-a-valid-payload.signature"

    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {malformed_token}",
        },
    )

    assert response.status_code == 401

def test_get_current_user_with_missing_access_token(client):
    response = client.get("/me")

    assert response.status_code == 401

def test_get_current_user_with_missing_token_version(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Create a valid access token without a token_version claim.
    token = jwt.encode(
        {
            "sub": "zoe",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    # Try to access /me with the token.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401

def test_refresh_with_expired_token(client):
    # Create an already-expired refresh token.
    expired_refresh_token = jwt.encode(
        {
            "sub": "zoe",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            "jti": "test-jti",
        },
        REFRESH_SECRET_KEY,
        algorithm=ALGORITHM,
    )

    csrf_token = "test-csrf-token"

    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": expired_refresh_token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401

def test_refresh_with_revoked_token(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "secretpassword",
        },
    )
    assert response.status_code == 200

    refresh_token = response.cookies["refresh_token"]
    csrf_token = response.cookies["csrf_token"]
    access_token = response.json()["access_token"]

    # Log out, which revokes the user's refresh tokens.
    response = client.post(
        "/logout",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-CSRF-Token": csrf_token,
        },
    )
    assert response.status_code == 200

    # Try to use the old refresh token.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": refresh_token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401

def test_refresh_with_missing_refresh_token(client):
    csrf_token = "test-csrf-token"

    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_REFRESH_TOKEN"

def test_get_current_user_with_missing_sub(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Create a valid, signed access token without a sub claim.
    token = jwt.encode(
        {
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
            "token_version": 0,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    # Try to access /me with the token.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"

def test_get_current_user_with_wrong_token_version(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Create an access token with a token version that does not
    # match the user's current token version (0).
    token = jwt.encode(
        {
            "sub": "zoe",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
            "token_version": 999,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    # Try to access /me with the token.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "TOKEN_REVOKED"

def test_refresh_with_missing_sub(client):
    # Create a valid, signed refresh token without a sub claim.
    token = jwt.encode(
        {
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "jti": secrets.token_urlsafe(32),
        },
        REFRESH_SECRET_KEY,
        algorithm=ALGORITHM,
    )

    csrf_token = "test-csrf-token"

    # Try to use the refresh token.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_REFRESH_TOKEN"

def test_refresh_with_wrong_signing_key(client):
    # Create a refresh token with the wrong signing key.
    token = jwt.encode(
        {
            "sub": "zoe",
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "jti": secrets.token_urlsafe(32),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    csrf_token = "test-csrf-token"

    # Try to use the incorrectly signed refresh token.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": token,
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_REFRESH_TOKEN"

def test_get_current_user_with_wrong_signing_key(client):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "secretpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Create an access token using the WRONG signing key.
    token = jwt.encode(
        {
            "sub": "zoe",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
            "token_version": 0,
        },
        REFRESH_SECRET_KEY,
        algorithm=ALGORITHM,
    )

    # Try to access /me with the incorrectly signed token.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"

def test_successful_password_reset(client, session, monkeypatch):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "oldpassword",
    }

    # Prevent the test from attempting to send a real email.
    def fake_send_email(to_email, subject, body):
        pass

    monkeypatch.setattr(
        "app.auth.routes.send_email",
        fake_send_email,
    )

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Request a password reset.
    response = client.post(
        "/forgot-password",
        json={
            "email": "zoe@example.com",
        },
    )

    assert response.status_code == 200

    # Find the user.
    user = session.exec(
        select(User).where(User.username == "zoe")
    ).first()

    assert user is not None

    # Retrieve the reset token from the database.
    reset_entry = session.exec(
        select(PasswordReset).where(
            PasswordReset.user_id == user.id
        )
    ).first()

    assert reset_entry is not None

    # Reset the password.
    response = client.post(
        "/reset-password",
        json={
            "token": reset_entry.token,
            "new_password": "newpassword",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Password has been reset successfully"

    # The old password should no longer work.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "oldpassword",
        },
    )

    assert response.status_code == 401

    # The new password should work.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "newpassword",
        },
    )

    assert response.status_code == 200

def test_password_reset_with_invalid_token(client):
    response = client.post(
        "/reset-password",
        json={
            "token": "this-is-not-a-real-reset-token",
            "new_password": "newpassword",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"

def test_password_reset_token_cannot_be_reused(client, session, monkeypatch):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "oldpassword",
    }

    # Prevent the test from attempting to send a real email.
    def fake_send_email(to_email, subject, body):
        pass

    monkeypatch.setattr(
        "app.auth.routes.send_email",
        fake_send_email,
    )

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Request a password reset.
    response = client.post(
        "/forgot-password",
        json={
            "email": "zoe@example.com",
        },
    )
    assert response.status_code == 200

    # Get the reset token from the database.
    user = session.exec(
        select(User).where(User.username == "zoe")
    ).first()

    reset_entry = session.exec(
        select(PasswordReset).where(
            PasswordReset.user_id == user.id
        )
    ).first()

    assert reset_entry is not None

    token = reset_entry.token

    # Use the token once.
    response = client.post(
        "/reset-password",
        json={
            "token": token,
            "new_password": "newpassword",
        },
    )

    assert response.status_code == 200

    # Try to use the same token again.
    response = client.post(
        "/reset-password",
        json={
            "token": token,
            "new_password": "anotherpassword",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_ALREADY_USED"

def test_password_reset_with_expired_token(client, session):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "oldpassword",
    }

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Find the user.
    user = session.exec(
        select(User).where(User.username == "zoe")
    ).first()

    assert user is not None

    # Create an already-expired reset token.
    reset_entry = PasswordReset(
        user_id=user.id,
        token="expired-reset-token",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        used=False,
    )

    session.add(reset_entry)
    session.commit()

    # Try to reset the password.
    response = client.post(
        "/reset-password",
        json={
            "token": "expired-reset-token",
            "new_password": "newpassword",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_EXPIRED"

def test_forgot_password_with_nonexistent_email(client):
    response = client.post(
        "/forgot-password",
        json={
            "email": "doesnotexist@example.com",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "If the email exists, a reset link has been sent"

def test_password_reset_invalidates_access_token(client, session, monkeypatch):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "oldpassword",
    }

    # Prevent the test from attempting to send a real email.
    def fake_send_email(to_email, subject, body):
        pass

    monkeypatch.setattr(
        "app.auth.routes.send_email",
        fake_send_email,
    )

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in and save the access token.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "oldpassword",
        },
    )

    assert response.status_code == 200

    access_token = response.json()["access_token"]

    # Request a password reset.
    response = client.post(
        "/forgot-password",
        json={
            "email": "zoe@example.com",
        },
    )

    assert response.status_code == 200

    # Find the user.
    user = session.exec(
        select(User).where(User.username == "zoe")
    ).first()

    assert user is not None

    # Retrieve the reset token.
    reset_entry = session.exec(
        select(PasswordReset).where(
            PasswordReset.user_id == user.id
        )
    ).first()

    assert reset_entry is not None

    # Reset the password.
    response = client.post(
        "/reset-password",
        json={
            "token": reset_entry.token,
            "new_password": "newpassword",
        },
    )

    assert response.status_code == 200

    # The old access token should now be rejected.
    response = client.get(
        "/me",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert response.status_code == 401

def test_password_reset_invalidates_refresh_token(client, session, monkeypatch):
    user_data = {
        "username": "zoe",
        "email": "zoe@example.com",
        "password": "oldpassword",
    }

    # Prevent the test from attempting to send a real email.
    def fake_send_email(to_email, subject, body):
        pass

    monkeypatch.setattr(
        "app.auth.routes.send_email",
        fake_send_email,
    )

    # Register.
    response = client.post("/register", json=user_data)
    assert response.status_code == 200

    # Log in and save the refresh token.
    response = client.post(
        "/login",
        json={
            "username": "zoe",
            "password": "oldpassword",
        },
    )

    assert response.status_code == 200

    refresh_token = response.cookies["refresh_token"]
    csrf_token = response.cookies["csrf_token"]

    # Request a password reset.
    response = client.post(
        "/forgot-password",
        json={
            "email": "zoe@example.com",
        },
    )

    assert response.status_code == 200

    # Find the user.
    user = session.exec(
        select(User).where(User.username == "zoe")
    ).first()

    assert user is not None

    # Retrieve the reset token.
    reset_entry = session.exec(
        select(PasswordReset).where(
            PasswordReset.user_id == user.id
        )
    ).first()

    assert reset_entry is not None

    # Reset the password.
    response = client.post(
        "/reset-password",
        json={
            "token": reset_entry.token,
            "new_password": "newpassword",
        },
    )

    assert response.status_code == 200

    # The old refresh token should now be rejected.
    response = client.post(
        "/refresh",
        headers={
            "X-CSRF-Token": csrf_token,
        },
        cookies={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 401