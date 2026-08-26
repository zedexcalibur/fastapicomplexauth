from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    password: str
    token_version: int = Field(default=0)

class RefreshToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    username: str = Field(index=True)
    expires_at: datetime
    revoked: bool = False

# Password resets are a time-limited, stateful process that needs tracking
# When user clicks on the link, need to see whether token exists, isn't expired and 
# hasn't already been used.
class PasswordReset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    used: bool = Field(default=False)